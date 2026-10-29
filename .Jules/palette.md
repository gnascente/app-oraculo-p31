## 2024-10-29 - Accessibility fixes
**Learning:** We need to manually add `role="button"`, `tabindex="0"`, `title`, `aria-label`, and `onkeydown` to non-semantic action elements like `<i>` or `<div>` acting as buttons, preventing default on 'Enter' and 'Space' events.
**Action:** Identify critical icon-only buttons or FABs, and add these accessibility attributes to make them usable by screen readers and keyboard users.
