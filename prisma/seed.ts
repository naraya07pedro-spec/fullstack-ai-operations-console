import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../apps/api/src/auth.js';
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12 || password === 'CHANGE_ME')
  throw new Error('Set a unique DEMO_PASSWORD of at least 12 characters');
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo seeding is disabled in production');
const db = new PrismaClient();
try {
  const passwordHash = await hashPassword(password);
  for (const [email, role] of [
    ['operator@example.test', 'OPERATOR'],
    ['viewer@example.test', 'VIEWER'],
  ] as const)
    await db.user.upsert({
      where: { email },
      create: { email, role, passwordHash },
      update: { passwordHash },
    });
  console.log(
    'Created local operator@example.test and viewer@example.test accounts. No password logged.',
  );
} finally {
  await db.$disconnect();
}
