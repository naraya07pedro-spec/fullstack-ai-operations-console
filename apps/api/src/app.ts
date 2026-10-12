import Fastify, { FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient, User } from '@prisma/client';
import { z, ZodError } from 'zod';
import {
  workflowSchema,
  loginSchema,
  decisionSchema,
  idSchema,
  idempotencySchema,
  runStatuses,
} from '../../../packages/contracts/src/index.js';
import { getConfig } from './config.js';
import { digest, hashPassword, safeEqual, token, verifyPassword } from './auth.js';
import { AppError, notFound } from './errors.js';
import { admitRun, decideRun, recoverRun } from './engine.js';

declare module 'fastify' {
  interface FastifyRequest {
    principal?: User;
    csrfToken?: string;
    sessionId?: string;
  }
}
export async function buildApp(
  db: PrismaClient,
  options: { logging?: boolean; rateLimit?: boolean } = {},
) {
  const config = getConfig();
  const app = Fastify({
    bodyLimit: 16384,
    requestTimeout: 15000,
    logger: options.logging
      ? {
          redact: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.body',
            'res.headers.set-cookie',
          ],
          level: 'info',
        }
      : false,
  });
  await app.register(cookie);
  await app.register(helmet);
  if (options.rateLimit !== false)
    await app.register(rateLimit, { max: 600, timeWindow: '1 minute' });
  const dummyHash = await hashPassword(token());
  const user = (r: FastifyRequest) => {
    if (!r.principal) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in required');
    return r.principal;
  };
  const operator = (r: FastifyRequest) => {
    const u = user(r);
    if (u.role !== 'OPERATOR') throw new AppError(403, 'FORBIDDEN', 'Operator permission required');
    return u;
  };
  app.addHook('onRequest', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const path = req.url.split('?')[0];
    if (path === '/health' || path === '/v1/auth/login') return;
    const raw = req.cookies.ops_session;
    if (!raw || raw.length !== 64) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in required');
    const session = await db.session.findUnique({
      where: { id: digest(raw) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date())
      throw new AppError(401, 'UNAUTHENTICATED', 'Session expired or invalid');
    req.principal = session.user;
    req.csrfToken = session.csrfToken;
    req.sessionId = session.id;
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      if (req.headers.origin !== config.APP_ORIGIN)
        throw new AppError(403, 'INVALID_ORIGIN', 'Request origin is not allowed');
      const csrf = req.headers['x-csrf-token'];
      if (typeof csrf !== 'string' || !safeEqual(csrf, session.csrfToken))
        throw new AppError(403, 'INVALID_CSRF', 'CSRF token is missing or invalid');
    }
  });
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError)
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        fields: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        requestId: req.id,
      });
    if (error instanceof AppError)
      return reply
        .code(error.statusCode)
        .send({ code: error.code, message: error.message, requestId: req.id });
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status < 500)
      return reply.code(status).send({
        code: status === 429 ? 'RATE_LIMITED' : 'BAD_REQUEST',
        message: status === 429 ? 'Too many requests' : 'Request could not be processed',
        requestId: req.id,
      });
    req.log.error({ err: error, requestId: req.id }, 'request_failed');
    return reply
      .code(500)
      .send({ code: 'INTERNAL_ERROR', message: 'Request failed', requestId: req.id });
  });
  app.get('/health', async () => {
    await db.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  });
  app.post(
    '/v1/auth/login',
    { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } },
    async (req, reply) => {
      if (req.headers.origin !== config.APP_ORIGIN)
        throw new AppError(403, 'INVALID_ORIGIN', 'Request origin is not allowed');
      const data = loginSchema.parse(req.body);
      const found = await db.user.findUnique({ where: { email: data.email } });
      const valid = await verifyPassword(data.password, found?.passwordHash ?? dummyHash);
      if (!found || !valid)
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
      const raw = token(),
        csrfToken = token(),
        expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
      await db.session.create({
        data: { id: digest(raw), userId: found.id, csrfToken, expiresAt },
      });
      reply.setCookie('ops_session', raw, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60,
      });
      return { user: { id: found.id, email: found.email, role: found.role }, csrfToken };
    },
  );
  app.get('/v1/auth/me', async (req) => {
    const u = user(req);
    return { user: { id: u.id, email: u.email, role: u.role }, csrfToken: req.csrfToken };
  });
  app.post('/v1/auth/logout', async (req, reply) => {
    await db.session.deleteMany({ where: { id: req.sessionId } });
    reply.clearCookie('ops_session', { path: '/' });
    return { ok: true };
  });
  app.get('/v1/workflows', async (req) => ({
    items: await db.workflow.findMany({
      where: { ownerId: user(req).id, archived: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  }));
  app.post('/v1/workflows', async (req, reply) => {
    const data = workflowSchema.parse(req.body);
    reply.code(201);
    return db.workflow.create({ data: { ...data, ownerId: operator(req).id } });
  });
  app.patch('/v1/workflows/:id', async (req) => {
    const id = idSchema.parse((req.params as { id: string }).id),
      ownerId = operator(req).id;
    const { version, ...data } = workflowSchema
      .extend({ version: z.number().int().positive() })
      .parse(req.body);
    const result = await db.workflow.updateMany({
      where: { id, ownerId, version, archived: false },
      data: { ...data, version: { increment: 1 } },
    });
    if (!result.count) {
      const found = await db.workflow.findFirst({ where: { id, ownerId, archived: false } });
      if (!found) throw notFound();
      throw new AppError(409, 'VERSION_CONFLICT', 'Workflow changed; reload before saving');
    }
    return db.workflow.findUniqueOrThrow({ where: { id } });
  });
  app.delete('/v1/workflows/:id', async (req) => {
    const id = idSchema.parse((req.params as { id: string }).id),
      ownerId = operator(req).id;
    const result = await db.workflow.updateMany({
      where: { id, ownerId, archived: false },
      data: { archived: true },
    });
    if (!result.count) throw notFound();
    return { ok: true };
  });
  app.post('/v1/workflows/:id/runs', async (req, reply) => {
    const ownerId = operator(req).id,
      id = idSchema.parse((req.params as { id: string }).id),
      key = idempotencySchema.parse(req.headers['idempotency-key']);
    const result = await admitRun(db, ownerId, id, key, req.body);
    reply.code(result.replayed ? 200 : 201);
    return result;
  });
  app.get('/v1/runs', async (req) => {
    const query = z
      .object({
        status: z.enum(runStatuses).optional(),
        cursor: z.uuid().optional(),
        limit: z.coerce.number().int().min(1).max(50).default(30),
      })
      .strict()
      .parse(req.query);
    const items = await db.run.findMany({
      where: { ownerId: user(req).id, ...(query.status ? { status: query.status } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const more = items.length > query.limit;
    if (more) items.pop();
    return { items, nextCursor: more ? items.at(-1)?.id : null };
  });
  app.get('/v1/runs/:id', async (req) => {
    const run = await db.run.findFirst({
      where: { id: idSchema.parse((req.params as { id: string }).id), ownerId: user(req).id },
      include: {
        attempts: { orderBy: { number: 'asc' } },
        events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!run) throw notFound();
    return run;
  });
  app.post('/v1/runs/:id/decision', async (req) => {
    const ownerId = operator(req).id;
    const { decision } = decisionSchema.parse(req.body);
    return decideRun(db, ownerId, idSchema.parse((req.params as { id: string }).id), decision);
  });
  app.post('/v1/runs/:id/retry', async (req) =>
    recoverRun(db, operator(req).id, idSchema.parse((req.params as { id: string }).id)),
  );
  app.get('/v1/dashboard', async (req) => {
    const ownerId = user(req).id;
    const [grouped, workflowCount, recent] = await Promise.all([
      db.run.groupBy({ by: ['status'], where: { ownerId }, _count: { _all: true } }),
      db.workflow.count({ where: { ownerId, archived: false } }),
      db.run.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, take: 6 }),
    ]);
    const counts = Object.fromEntries(
      runStatuses.map((s) => [s, grouped.find((g) => g.status === s)?._count._all ?? 0]),
    );
    return { workflowCount, counts, recent };
  });
  return app;
}
