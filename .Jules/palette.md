## 2024-11-06 - Improve accessibility on non-semantic action elements
**Learning:** The application extensively uses non-semantic `<i>` tags (Material Icons) and `<div>` tags as primary action buttons without proper ARIA attributes, making them inaccessible to screen readers and keyboard users.
**Action:** Always add `role="button"`, `tabindex="0"`, `title`, and `aria-label` attributes to these elements, along with visual focus indicators (`:focus-visible`) and a global `keydown` event listener to handle 'Enter' and 'Space' activations.
