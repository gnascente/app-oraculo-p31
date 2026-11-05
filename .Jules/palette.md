## 2024-11-05 - Accessibility for Material Icons Used as Buttons
**Learning:** This application relies heavily on non-semantic `<i>` tags (Material Icons) for primary actions without proper keyboard navigation or screen reader support. This is a recurring pattern across the app.
**Action:** Added `role="button"`, `tabindex="0"`, `aria-label`, and `onkeydown` handlers (checking for 'Enter' and 'Space' with `event.preventDefault()`) to the main header action icons to make them fully accessible and interactive via keyboard.
