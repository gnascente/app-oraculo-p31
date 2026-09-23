const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const screenshotDir = path.join(process.env.HOME, 'verification/screenshots');
    const videoDir = path.join(process.env.HOME, 'verification/videos');

    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    const browser = await chromium.launch();
    const context = await browser.newContext({
        recordVideo: {
            dir: videoDir,
            size: { width: 800, height: 600 }
        }
    });

    const page = await context.newPage();

    // Mock prompt and localStorage as indicated by memory
    await page.addInitScript(() => {
        window.prompt = () => "Playwright Test";
        localStorage.setItem('oraculo_device_mac', 'test_mac_123');
    });

    await page.goto('http://localhost:8000');

    // Wait for the home grid to be visible
    await page.waitForSelector('#homeGrid');

    // Test tab navigation
    await page.keyboard.press('Tab'); // Sync button
    await page.keyboard.press('Tab'); // Print button
    await page.keyboard.press('Tab'); // Menu button
    await page.keyboard.press('Tab'); // Search input

    // Tab into the grid
    await page.keyboard.press('Tab'); // First module card
    await page.waitForTimeout(500); // Give time for focus to render

    // Take screenshot showing the focus state
    const screenshotPath = path.join(screenshotDir, 'focus_state.png');
    await page.screenshot({ path: screenshotPath });

    // Press Enter to open the module
    await page.keyboard.press('Enter');

    // Wait for the view list to become active
    await page.waitForSelector('#viewList.active');
    await page.waitForTimeout(1000); // Wait for transition

    await context.close();
    await browser.close();

    console.log(screenshotPath);
})();
