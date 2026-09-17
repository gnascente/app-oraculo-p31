const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock API for /api/poc-sync?action=wipeAll
  await page.route('**/api/poc-sync?action=wipeAll', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'wiped' })
    });
  });

  // Mock API for /api/poc-sync?action=uploadChunk
  let chunkCount = 0;
  await page.route('**/api/poc-sync?action=uploadChunk', route => {
    const postData = JSON.parse(route.request().postData());
    chunkCount++;
    if (postData.chunkIndex === postData.totalChunks - 1) {
      // Last chunk
      const masterBlock = {
        id: postData.blockId,
        text: 'test block',
        version: 1,
        syncStatus: 'synced'
      };
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'completed', masterBlocks: [masterBlock] })
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'chunk_accepted' })
      });
    }
  });

  await page.goto('http://localhost:8000/poc/index.html');
  await page.waitForTimeout(1000);

  console.log('Adding new block...');
  await page.fill('#newBlockText', 'This is a test log entry');
  await page.click('#btnSaveBlock');

  await page.waitForTimeout(2000);

  console.log('Opening Terminal...');
  await page.click('#btnToggleTerminal');
  await page.waitForTimeout(1000);

  // Take a screenshot of the terminal
  await page.screenshot({ path: '/home/jules/verification/screenshots/terminal_ui.png' });

  // Wipe
  console.log('Wiping all blocks...');
  page.on('dialog', dialog => dialog.accept());
  await page.click('#btnWipeAll');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/home/jules/verification/screenshots/terminal_wiped.png' });

  console.log('Testing done.');
  await browser.close();
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
