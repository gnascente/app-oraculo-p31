const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8000/index.html');
  await page.waitForTimeout(1000); // Wait for load

  // Test space key on the print button
  await page.focus('i[title="Imprimir Relatório"]');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);

  const printModalVisible = await page.evaluate(() => {
    const dialog = document.getElementById('printReportModal');
    return dialog && dialog.classList.contains('active');
  });
  console.log('Print modal visible after Space:', printModalVisible);

  await browser.close();
})();
