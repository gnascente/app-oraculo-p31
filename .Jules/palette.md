
## 2026-11-02 - Accessibility of Non-Semantic Buttons
**Learning:** The application frequently uses non-semantic `<i>` (Material Icons) and `<div>` tags as primary action buttons (e.g., in the image carousel and editor toolbars). This is a prevalent pattern that severely impacts keyboard accessibility and screen reader support.
**Action:** When adding or modifying interactive elements that use non-semantic tags in this codebase, manually append `role="button"`, `tabindex="0"`, `aria-label`, `title`, and an `onkeydown` handler that checks for 'Enter' and 'Space' (calling `event.preventDefault()` to stop page scrolling) to ensure full accessibility.
