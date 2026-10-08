## 2026-10-08 - Palette initialized
**Learning:** Initializing palette journal
**Action:** Created .Jules/palette.md

## 2026-10-08 - Adding accessibility to non-semantic tags
**Learning:** The application heavily uses non-semantic `<i>` tags (Material Icons) and `<div>` tags as primary action buttons (like module cards and header actions). Without proper ARIA roles and keyboard event listeners, these are completely inaccessible to screen readers and keyboard navigation.
**Action:** Added `role="button"`, `tabindex="0"`, `aria-label`, and `title` to these elements. Added a global `keydown` listener to trigger `click()` on 'Enter' and 'Space' for elements with `role="button"`, making them fully accessible via keyboard. Also added a `[role="button"]:focus-visible` CSS rule for visual focus indicators.
