from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:8000")
    page.wait_for_timeout(1000)

    # Bypass local storage as requested in memory
    page.evaluate("localStorage.setItem('oraculo_device_mac', 'test_mac')")
    page.reload()
    page.wait_for_timeout(1000)

    # Focus sync button
    page.locator("#syncIconBtn").focus()
    page.wait_for_timeout(1000)
    page.screenshot(path="/home/jules/verification/screenshots/focus-sync.png")

    # Focus print button and press enter
    page.locator('i[title="Imprimir Relatório"]').focus()
    page.wait_for_timeout(1000)
    page.keyboard.press("Enter")
    page.wait_for_timeout(1500)
    page.screenshot(path="/home/jules/verification/screenshots/print-modal-open.png")

    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()

        # Intercept and mock API calls
        page.route("**/api/backup*", lambda route: route.fulfill(status=200, content_type="application/json", body="{}"))

        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
