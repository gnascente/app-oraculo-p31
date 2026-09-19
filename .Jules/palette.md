## 2024-05-18 - Global Keydown for Button Role
**Learning:** The application heavily uses `<i>` tags as action buttons. Instead of adding `onkeydown` to every icon individually, a global `keydown` event listener in `index.html` mapping Enter and Space to `role="button"` elements elegantly solves keyboard navigation across the entire app.
**Action:** For future icon-buttons, simply add `role="button"`, `tabindex="0"`, `title`, and `aria-label`. No inline event handlers are needed.
