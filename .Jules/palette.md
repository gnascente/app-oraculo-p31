
## 2024-05-24 - Interactive Divs Used as Cards/Buttons (Home Grid)
**Learning:** Found a pattern where interactive grid cards (`.module-card`) were built using non-semantic `<div>` elements with `onclick` handlers, completely ignoring screen readers (no roles/labels) and keyboard users (no tabindex, no Enter/Space interaction).
**Action:** Always add `role="button"`, `tabindex="0"`, `title`, and `aria-label` to interactive non-semantic elements. Crucially, rely on the global `keydown` event listener pattern to handle 'Enter' and 'Space' activations for any element with `role="button"`, and ensure `[role="button"]:focus-visible` exists for visual focus outlines.
