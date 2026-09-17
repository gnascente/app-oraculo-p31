const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to the POC page
    await page.goto('http://localhost:8000/poc/index.html');

    // Check if the page loaded
    const title = await page.title();
    console.log("Page title:", title);

    // Mock the backend call to avoid KV issues and simulate successful sync
    await page.route('**/api/poc-sync?action=uploadChunk', async route => {
        const req = route.request();
        const postData = JSON.parse(req.postData());
        console.log("Intercepted uploadChunk:", postData.chunkIndex + 1, "/", postData.totalChunks);
        if (postData.chunkIndex === postData.totalChunks - 1) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'completed',
                    masterBlocks: [
                        {
                            id: postData.blockId,
                            text: "Test block",
                            media: [
                                { fileType: "application/pdf", url: "https://example.com/test.pdf" },
                                { fileType: "video/mp4", url: "https://example.com/test.mp4" }
                            ],
                            version: 1,
                            syncStatus: "synced",
                            updatedAt: Date.now()
                        }
                    ]
                })
            });
        } else {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'chunk_accepted' })
            });
        }
    });

    // Create a new block with a multi-byte character to verify payload string length calculation
    await page.fill('#newBlockText', 'Test block with Portuguese char: çãá');

    // Trigger file upload with dummy PDF to see UI behavior initially
    // Playwright file upload
    await page.setInputFiles('#newBlockMedia', {
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF')
    });

    await page.waitForTimeout(1000); // Wait for media to process

    // Click save
    await page.click('#btnSaveBlock');

    // Wait for the sync polling loop
    console.log("Waiting for sync cycle to trigger...");
    await page.waitForTimeout(6000);

    // Take a screenshot
    await page.screenshot({ path: '/home/jules/verification/screenshots/poc_sync.png' });
    console.log("Screenshot saved.");

    await browser.close();
})();
