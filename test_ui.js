const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        recordVideo: {
            dir: 'videos/'
        }
    });
    const page = await context.newPage();

    // Inject local storage item to bypass initial setup prompt
    await page.addInitScript(() => {
        window.localStorage.setItem('oraculo_device_mac', 'test_mac_123');
    });

    // Mock network request to bypass background sync error log spam
    await page.route('**/api/backup*', (route) => {
        route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    await page.goto('http://localhost:8000');

    // Wait for the app to initialize
    await page.waitForTimeout(1000);

    // Evaluate custom script to ensure UI is ready and we can focus manually
    await page.evaluate(() => {
        document.getElementById('syncIconBtn').focus();
    });

    await page.waitForTimeout(500);

    // Take a screenshot of the focused sync button
    await page.screenshot({ path: 'screenshots/sync-focus.png' });

    // Press enter on the sync button
    await page.keyboard.press('Enter');

    // Wait for dialog
    await page.waitForTimeout(1000);

    // Screenshot dialog
    await page.screenshot({ path: 'screenshots/sync-dialog.png' });

    // Click Cancel, making sure to bypass intercepting pointer events using force
    await page.click('#customDialogCancel', { force: true });

    // Wait for dialog to disappear
    await page.waitForTimeout(500);

    // Focus the first module card
    await page.evaluate(() => {
        document.querySelector('.module-card').focus();
    });

    await page.waitForTimeout(500);

    // Screenshot focused module card
    await page.screenshot({ path: 'screenshots/module-focus.png' });

    // Press Enter to activate the module card
    await page.keyboard.press('Enter');

    // Wait for view to switch
    await page.waitForTimeout(1000);

    // Screenshot the new view
    await page.screenshot({ path: 'screenshots/module-view.png' });

    await context.close();
    await browser.close();
    console.log("Verification complete.");
})();
