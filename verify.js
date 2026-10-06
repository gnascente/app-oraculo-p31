const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Create directories if they don't exist
  const screenshotsDir = '/home/jules/verification/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Intercept and mock API calls as requested in memory for local verification
  await page.route('**/api/backup*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  // Set local storage to bypass prompts
  await page.addInitScript(() => {
    localStorage.setItem('oraculo_device_mac', 'test_mac');
  });

  await page.goto('http://localhost:8000');

  // Wait for the app to load
  await page.waitForTimeout(1000);

  // Test tab focus on sync icon
  const syncBtn = page.locator('#syncIconBtn');
  await syncBtn.focus();

  // Take screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'focus-sync.png') });

  // Hit enter on print icon
  const printBtn = page.locator('i[title="Imprimir Relatório"]');
  await printBtn.focus();
  await page.keyboard.press('Enter');

  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(screenshotsDir, 'focus-print-enter.png') });

  await browser.close();
  console.log('Playwright script completed successfully.');
})();
