const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Intercept api calls
    await page.route('**/api/backup*', route => {
        if (route.request().method() === 'POST') {
             route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        } else {
             route.fulfill({ status: 200, body: JSON.stringify({}) });
        }
    });

    // Mock local storage to avoid prompt
    await page.addInitScript(() => {
        localStorage.setItem('oraculo_device_mac', 'mac_123');
    });

    await page.goto('http://localhost:8000');

    // Mock the db entry to avoid prompt
    await page.evaluate(async () => {
         const AppDB = new Dexie('OraculoP31');
         AppDB.version(1).stores({ entities: 'id, type, name, parentId, createdAt', logs: 'id, originEntityId' });
         await AppDB.entities.put({ id: 'mac_123', type: 'device', name: 'Test User', createdAt: Date.now(), updatedAt: Date.now(), parentId: null });
         App.init(); // re-init to use it
    });

    await page.waitForTimeout(1000);

    // Focus the element by clicking it first, then shift-tabbing to ensure it's in the document flow, or we can just focus it directly to test the key handler.
    await page.evaluate(() => {
        document.getElementById('syncIconBtn').focus();
    });

    let activeEl = await page.evaluate(() => {
        return document.activeElement ? document.activeElement.id : null;
    });
    console.log('Focused element id:', activeEl);

    // Take screenshot after focus to show focus ring
    await page.screenshot({ path: '/home/jules/verification/screenshots/focus-ring.png' });

    // Test that enter triggers the button
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const isCustomDialogVisible = await page.evaluate(() => {
        return document.getElementById('customDialogModal').classList.contains('active');
    });

    console.log('Custom dialog visible after Enter on sync button:', isCustomDialogVisible);

    await browser.close();
})();
