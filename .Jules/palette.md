## 2024-11-20 - Adding Accessibility to Non-Semantic Tags
**Learning:** This app heavily uses `<i>` tags (Material Icons) and `<div>` tags as primary action buttons in the header instead of semantic `<button>` elements. Without ARIA roles and labels, these are completely invisible to screen readers and cannot be focused via keyboard.
**Action:** Always verify if non-semantic elements used as buttons have `role="button"`, `tabindex="0"`, and an appropriate `aria-label` or `title` to ensure they are accessible.
