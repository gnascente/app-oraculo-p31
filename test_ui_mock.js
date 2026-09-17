const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({
    recordVideo: { dir: '/home/jules/verification/videos/' }
  });
  const page = await context.newPage();

  // Route network requests to print to console
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:8000/poc/index.html');
  await page.waitForTimeout(1000); // Wait for load

  // Mock fetch to simulate firewall HTML intercept
  await page.evaluate(() => {
    window.fetch = async (url, options) => {
      if (url.includes('/api/poc-sync?action=uploadChunk')) {
        return {
          ok: false,
          status: 403,
          text: async () => '<html><body><h1>403 Firewall Blocked</h1></body></html>'
        };
      }
      return fetch(url, options); // Call original for others (if any)
    };
  });

  // Click text input
  await page.fill('textarea[id="newBlockText"]', 'Testing debug log payload');

  // Save block to trigger sync
  await page.click('button[id="btnSaveBlock"]');

  // Wait a few seconds for polling sync to trigger
  await page.waitForTimeout(6000);

  await page.screenshot({ path: '/home/jules/verification/screenshots/sync_debug2.png' });

  await context.close();
  await browser.close();
})();
