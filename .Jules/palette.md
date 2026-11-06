## 2024-11-06 - Accessible Icon Buttons
**Learning:** This application heavily relies on non-semantic `<i class="material-icons">` and `<div>` tags acting as buttons, which are inaccessible to keyboard users and screen readers by default.
**Action:** Always manually add `role="button"`, `tabindex="0"`, `aria-label` or `title`, and custom `onkeydown` handlers (checking for Enter and Space) to these non-semantic actionable elements when modifying them.
