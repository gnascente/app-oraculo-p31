## 2026-10-27 - [a11y: Header Icon Accessibility]
**Learning:** Found that the app uses `<i>` tags (Material Icons) as primary action buttons in the header without `role="button"`, `tabindex="0"`, `aria-label`, or keyboard event listeners for Space and Enter. This is a common pattern in the app.
**Action:** When adding accessibility to these custom icons, apply `role="button"`, `tabindex="0"`, and the manual `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); ...}"` handler.
