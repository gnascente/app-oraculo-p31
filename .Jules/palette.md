## 2026-10-22 - Accessibility of non-semantic icon buttons
**Learning:** This app heavily relies on `<i>` tags (Material Icons) as primary action buttons in headers and UI. These are not natively keyboard accessible or read by screen readers.
**Action:** Always add `role="button"`, `tabindex="0"`, `aria-label`, `title`, and a keyboard event listener (e.g. `onkeydown="if(event.key==='Enter'||event.key===' ')this.click()"`) when using `<i>` tags as actionable buttons.
