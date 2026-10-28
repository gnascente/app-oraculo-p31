## 2026-10-28 - Accessibility upgrade for non-semantic interactive icons
**Learning:** Found multiple instances where non-semantic `<i>` tags and `<div>` tags were used as primary interactive buttons, completely lacking ARIA roles, labels, and keyboard navigation.
**Action:** Applied a reusable pattern of `role="button"`, `tabindex="0"`, `aria-label`, and an inline `onkeydown` handler to intercept 'Enter' and 'Space' for screen readers. Ensure `event.preventDefault()` is always used in the keydown handler to prevent unexpected page scrolling when pressing 'Space'.
