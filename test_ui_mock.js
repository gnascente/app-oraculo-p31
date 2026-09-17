const { test, expect } = require('@playwright/test');

test('test setup', async ({ page }) => {
  await page.goto('http://localhost:8000');
  const title = await page.title();
  expect(title).toBe('Oráculo P-31');
});
