## 2026-09-18 - Global Keydown Handler for Semantic Actions
**Learning:** Using a global `keydown` event listener in `index.html` to trigger `click()` on elements with `role="button"` when `Enter` or `Space` are pressed drastically reduces code duplication for non-semantic action elements (like Material Icons `<i>` tags) across the app.
**Action:** Always add `role="button"`, `tabindex="0"`, `title`, and `aria-label` to any future UI modifications of icon-only interactive elements without needing to append inline `onkeydown` handlers.
