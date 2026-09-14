## 2024-05-24 - Accessibility on Icon-only Buttons
**Learning:** The application heavily utilizes `<i>` tags (Material Icons) as primary action buttons across headers, modals, and list items. Since these are not semantic `<button>` elements, they inherently lack keyboard focusability (`tabindex`) and screen reader announcements (`aria-label`, `role="button"`).
**Action:** When adding or reviewing interactive icons in this application, always ensure `role="button"`, `tabindex="0"`, `title`, and `aria-label` are explicitly defined.
