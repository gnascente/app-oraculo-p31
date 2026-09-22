## 2026-09-22 - Keyboard Navigation with role="button"
**Learning:** Implementing a global `keydown` listener for `Enter` and `Space` that targets `[role="button"]`, along with focus-visible CSS styling, is a highly effective pattern for restoring accessibility to interactive non-semantic elements (like `<i>` tags) across the app without polluting every element with inline handlers.
**Action:** Apply `role="button"`, `tabindex="0"`, `title`, and `aria-label` attributes to all custom interactive icons/elements.
