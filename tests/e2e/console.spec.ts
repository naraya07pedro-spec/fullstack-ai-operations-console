import { test, expect, Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
async function signIn(page: Page, email = 'operator@example.test') {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  const submit = async () => {
    const response = page.waitForResponse(
      (r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    return response;
  };
  let response = await submit();
  if (response.status() === 429) {
    await expect(page.getByRole('alert').filter({ hasText: 'Too many requests' })).toBeVisible();
    // Respect the actual server cooldown; do not disable authentication throttling for E2E.
    const cooldown = Number(response.headers()['retry-after'] ?? 60);
    await page.waitForTimeout((Math.min(60, Math.max(1, cooldown)) + 1) * 1000);
    response = await submit();
  }
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
async function screenshot(page: Page, name: string, mobile: boolean) {
  const dir = resolve(process.env.EVIDENCE_DIR ?? 'artifacts/screenshots');
  await mkdir(dir, { recursive: true });
  await page.screenshot({
    path: resolve(dir, `${mobile ? 'mobile-' : ''}${name}.png`),
    fullPage: true,
    scale: 'css',
  });
  await page.waitForTimeout(700); /* Pacing makes the authentic recording readable. */
}
async function createWorkflow(page: Page, name: string, mode = 'success', approval = true) {
  await page.getByRole('button', { name: '+ New workflow', exact: true }).click();
  await page.getByLabel('Workflow name', { exact: true }).fill(name);
  await page
    .getByLabel('Description', { exact: true })
    .fill('Classify support requests and create an inspectable sandbox ticket.');
  await page.getByLabel('Sandbox behavior', { exact: true }).selectOption(mode);
  await page.getByLabel('Maximum attempts', { exact: true }).fill('2');
  if (!approval) await page.getByLabel('Require human approval').uncheck();
  await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
}
async function runWorkflow(page: Page, name: string, message: string) {
  await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  const card = page
    .locator('article.workflow-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await card.getByRole('button', { name: 'Run workflow ↗', exact: true }).click();
  await page.getByLabel('Request message', { exact: true }).fill(message);
  await page.getByRole('button', { name: 'Submit execution', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Execution detail', exact: true })).toBeVisible();
}
const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
test('complete workflow walkthrough with authentic states and recovery', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.startsWith('mobile'),
    suffix = mobile ? 'mobile' : 'desktop';
  const runtimeErrors: string[] = [];
  page.on('pageerror', (e) => runtimeErrors.push(e.message));
  await signIn(page);
  await screenshot(page, 'dashboard', mobile);
  await noOverflow(page);
  if (mobile) {
    const copy = await page.locator('.control-banner > div').nth(1).boundingBox();
    expect(copy?.width).toBeGreaterThan(200);
  }
  await page.getByRole('button', { name: '+ New workflow', exact: true }).click();
  await page.getByLabel('Workflow name', { exact: true }).fill(`Support triage · ${suffix}`);
  await page
    .getByLabel('Description', { exact: true })
    .fill('Review incoming support requests before creating a sandbox ticket.');
  await screenshot(page, 'workflow-creation', mobile);
  await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
  await runWorkflow(
    page,
    `Support triage · ${suffix}`,
    'Urgent invoice payment issue needs review',
  );
  await expect(page.locator('.run-overview .status')).toHaveText('Awaiting approval');
  await screenshot(page, 'approval', mobile);
  await expect(page.getByTestId('run-output')).toHaveCount(0);
  await page.getByRole('button', { name: 'Approve execution', exact: true }).click();
  await expect(page.locator('.run-overview .status')).toHaveText('Succeeded');
  await expect(page.getByTestId('run-output')).toContainText('deterministic-sandbox');
  await screenshot(page, 'success', mobile);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Executions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Execution history', exact: true })).toBeVisible();
  await screenshot(page, 'execution-history', mobile);
  await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  await createWorkflow(page, `Recovery drill · ${suffix}`, 'recoverable', false);
  await runWorkflow(
    page,
    `Recovery drill · ${suffix}`,
    'API integration is broken and needs review',
  );
  await expect(page.locator('.run-overview .status')).toHaveText('Failed');
  await expect(page.locator('.failure-action')).toContainText('UPSTREAM_UNAVAILABLE');
  await screenshot(page, 'failure', mobile);
  await page.getByRole('button', { name: 'Retry execution', exact: true }).click();
  await expect(page.locator('.run-overview .status')).toHaveText('Succeeded');
  await expect(page.locator('.run-meta')).toContainText('Recoveries1');
  await screenshot(page, 'recovery', mobile);
  await runWorkflow(page, `Support triage · ${suffix}`, 'Reject this unapproved request');
  await page.getByRole('button', { name: 'Reject execution', exact: true }).click();
  await expect(page.locator('.run-overview .status')).toHaveText('Rejected');
  await expect(page.getByTestId('run-output')).toHaveCount(0);
  await screenshot(page, 'approval-rejection', mobile);
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await screenshot(page, 'dashboard', mobile);
  await noOverflow(page);
  expect(runtimeErrors).toEqual([]);
});
test('validates forms, restores sessions, edits and archives workflows', async ({
  page,
}, testInfo) => {
  await signIn(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const name = `CRUD check ${testInfo.project.name}`;
  await createWorkflow(page, name);
  let card = page
    .locator('article.workflow-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Workflow name', { exact: true }).fill(name + ' updated');
  await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
  card = page
    .locator('article.workflow-card')
    .filter({ has: page.getByRole('heading', { name: name + ' updated', exact: true }) });
  await expect(card).toContainText('v2');
  await card.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(card).toHaveCount(0);
});
test('viewer controls remain read only', async ({ page }) => {
  await signIn(page, 'viewer@example.test');
  await expect(page.getByRole('button', { name: '+ New workflow', exact: true })).toBeDisabled();
  await expect(page.getByText('Viewer access ·', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Approvals', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pending decisions', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to your console' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to your console' })).toBeVisible();
});
test('pagination survives polling and hostile input stays escaped', async ({ page }, testInfo) => {
  await signIn(page);
  const csrf = (await (await page.request.get('/api/auth/me')).json()).csrfToken;
  const headers = { origin: 'http://localhost:3000', 'x-csrf-token': csrf };
  const w = await page.request.post('/api/workflows', {
    headers,
    data: { name: `Pagination ${testInfo.project.name}`, requiresApproval: true },
  });
  expect(w.status()).toBe(201);
  const workflow = await w.json();
  let oldest = '';
  let newest = '';
  const hostile = '<script>window.__consoleInjected = true</script>';
  for (let i = 0; i < 31; i++) {
    const response = await page.request.post(`/api/workflows/${workflow.id}/runs`, {
      headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
      data: { message: i === 0 ? hostile : `Pagination request ${i}` },
    });
    expect(response.status()).toBe(201);
    newest = (await response.json()).run.id.slice(0, 8);
    if (!i) oldest = newest;
  }
  await page.getByRole('button', { name: 'Executions', exact: true }).click();
  await expect(page.locator('.run-list').getByText(newest, { exact: false })).toBeVisible();
  await expect(page.locator('.run-list').getByText(oldest, { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Older executions', exact: true }).click();
  await expect(page.locator('.run-list').getByText(oldest, { exact: false })).toBeVisible();
  await page.waitForResponse(
    (r) => r.url().includes('/api/runs?limit=30&cursor=') && r.status() === 200,
  );
  await expect(page.locator('.run-list').getByText(oldest, { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Approvals', exact: true }).click();
  await expect(page.getByText(hostile, { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Boolean((window as Window & { __consoleInjected?: boolean }).__consoleInjected),
    ),
  ).toBe(false);
  await noOverflow(page);
});
test('keyboard dialog navigation, Escape, and reduced motion work', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);
  await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  const name = `Keyboard check ${testInfo.project.name}`;
  await createWorkflow(page, name);
  const card = page
    .locator('article.workflow-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await card.getByRole('button', { name: 'Run workflow ↗', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(page.getByLabel('Request message', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Run workflow ↗', exact: true })).toBeFocused();
  await noOverflow(page);
});
