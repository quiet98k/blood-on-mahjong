import { test, expect } from '@playwright/test';

test('GET /api/ping returns ok and mongo ping', async ({ request, baseURL }) => {
  const url = `${baseURL}/api/ping`;
  const res = await request.get(url);

  expect(res.status()).toBe(200);
  const body = await res.json();
  // Expect exact shape
  expect(body).toEqual({ ok: 1, mongo: { ok: 1 } });
});
