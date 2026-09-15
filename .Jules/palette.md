## 2026-09-15 - [Accessibility] Handling Non-Semantic Action Icons
**Learning:** The application heavily uses non-semantic `<i>` tags (Material Icons) as primary action buttons instead of native `<button>` elements.
**Action:** To make these accessible without changing the design, they must be augmented with `role="button"`, `tabindex="0"`, `aria-label` (or `title`), and `onkeydown` handlers for Enter/Space.
