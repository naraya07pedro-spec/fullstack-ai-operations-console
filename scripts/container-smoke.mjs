import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = 'http://localhost:3000';
const outcomes = [];
function record(name) {
  outcomes.push({ name, status: 'passed' });
  console.log(`PASS ${name}`);
}
async function request(path, { headers = {}, ...options } = {}) {
  return fetch(`${origin}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', origin, ...headers },
    signal: AbortSignal.timeout(5000),
  });
}
async function login(email) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: process.env.DEMO_PASSWORD }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  return { cookie, 'x-csrf-token': data.csrfToken };
}
async function submit(headers, workflowId, key, message) {
  const response = await request(`/api/workflows/${workflowId}/runs`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': key },
    body: JSON.stringify({ message }),
  });
  return { response, data: await response.json() };
}
async function detail(headers, id) {
  const response = await request(`/api/runs/${id}`, { headers });
  assert.equal(response.status, 200);
  return response.json();
}
async function waitFor(headers, id, status) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const run = await detail(headers, id);
    if (run.status === status) return run;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Execution did not reach ${status} within 20 seconds`);
}
async function create(headers, values) {
  const response = await request('/api/workflows', {
    method: 'POST',
    headers,
    body: JSON.stringify(values),
  });
  assert.equal(response.status, 201);
  return response.json();
}

try {
  assert.ok(process.env.DEMO_PASSWORD, 'Set the ephemeral/local demo password');
  const page = await request('/');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<title>Operations Console \| Workflow control<\/title>/);
  const assets = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css)(?:\?[^"\s]*)?)"/g)].map((m) => m[1]),
    ),
  ];
  assert.ok(assets.length > 0);
  for (const asset of assets) assert.equal((await request(asset)).status, 200);
  record('standalone frontend serves HTML and every referenced JS/CSS asset');

  assert.equal((await request('/api/auth/me')).status, 401);
  record('same-origin rewrite reaches API and rejects unauthenticated access');
  const operator = await login('operator@example.test');
  record('compiled API authenticates with a native PostgreSQL persisted session');
  const workflow = await create(operator, {
    name: 'Container approval smoke',
    requiresApproval: true,
  });
  const admitted = await submit(
    operator,
    workflow.id,
    randomUUID(),
    'Urgent billing invoice needs review',
  );
  assert.equal(admitted.response.status, 201);
  const id = admitted.data.run.id;
  assert.equal(admitted.data.run.status, 'WAITING_APPROVAL');
  await new Promise((resolve) => setTimeout(resolve, 700));
  const waiting = await detail(operator, id);
  assert.equal(waiting.attemptCount, 0);
  assert.equal(waiting.output, null);
  record('separate worker leaves an unapproved execution without attempts or output');

  const duplicate = await submit(
    operator,
    workflow.id,
    waiting.idempotencyKey,
    'Urgent billing invoice needs review',
  );
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.data.run.id, id);
  assert.equal(duplicate.data.replayed, true);
  record('duplicate request retains one execution identity across the container API');

  assert.equal(
    (
      await request(`/api/runs/${id}/decision`, {
        method: 'POST',
        headers: operator,
        body: JSON.stringify({ decision: 'approve' }),
      })
    ).status,
    200,
  );
  const succeeded = await waitFor(operator, id, 'SUCCEEDED');
  assert.equal(succeeded.output.provider, 'deterministic-sandbox');
  assert.equal(succeeded.attempts.length, 1);
  assert.equal(
    succeeded.events.some((e) => e.type === 'APPROVED'),
    true,
  );
  record('approval runs real inter-container HTTP and persists ticket, attempt and events');

  const rejected = await submit(
    operator,
    workflow.id,
    randomUUID(),
    'Reject container smoke request',
  );
  const rejectedId = rejected.data.run.id;
  assert.equal(
    (
      await request(`/api/runs/${rejectedId}/decision`, {
        method: 'POST',
        headers: operator,
        body: JSON.stringify({ decision: 'reject' }),
      })
    ).status,
    200,
  );
  await new Promise((resolve) => setTimeout(resolve, 700));
  const rejection = await detail(operator, rejectedId);
  assert.equal(rejection.status, 'REJECTED');
  assert.equal(rejection.attemptCount, 0);
  assert.equal(rejection.output, null);
  assert.equal(
    (await request(`/api/runs/${rejectedId}/retry`, { method: 'POST', headers: operator })).status,
    409,
  );
  record('rejection stays terminal with zero attempts and recovery denied');

  const drill = await create(operator, {
    name: 'Container recovery smoke',
    requiresApproval: false,
    maxAttempts: 2,
    sandboxMode: 'recoverable',
  });
  const failedAdmission = await submit(
    operator,
    drill.id,
    randomUUID(),
    'API error needs recovery',
  );
  const failedId = failedAdmission.data.run.id;
  const failure = await waitFor(operator, failedId, 'FAILED');
  assert.equal(failure.attemptCount, 2);
  assert.equal(failure.errorCode, 'UPSTREAM_UNAVAILABLE');
  record('real HTTP 503 exhausts the configured two attempts');
  assert.equal(
    (await request(`/api/runs/${failedId}/retry`, { method: 'POST', headers: operator })).status,
    200,
  );
  const recovery = await waitFor(operator, failedId, 'SUCCEEDED');
  assert.equal(recovery.id, failedId);
  assert.equal(recovery.recoveryCount, 1);
  assert.equal(recovery.attemptCount, 3);
  record('manual recovery retains the run ID and persists success on total attempt three');

  const viewer = await login('viewer@example.test');
  assert.equal(
    (
      await request('/api/workflows', {
        method: 'POST',
        headers: viewer,
        body: JSON.stringify({ name: 'Forbidden mutation' }),
      })
    ).status,
    403,
  );
  assert.equal((await request(`/api/runs/${id}`, { headers: viewer })).status, 404);
  record('viewer mutation and cross-owner execution access are denied');
} catch (error) {
  outcomes.push({ name: error.message, status: 'failed' });
  process.exitCode = 1;
  console.error(error.message);
} finally {
  mkdirSync('artifacts', { recursive: true });
  writeFileSync(
    'artifacts/container-smoke.json',
    JSON.stringify(
      {
        date: new Date().toISOString(),
        runtime: 'Docker Compose / native PostgreSQL / compiled Node backend / standalone Next.js',
        outcomes,
      },
      null,
      2,
    ) + '\n',
  );
}
