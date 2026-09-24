## 2026-09-24 - Added Accessibility Attributes to Header and FAB Actions
**Learning:** The application heavily relies on `<i>` tags as buttons. It is critical to add semantic attributes like `role="button"`, `tabindex="0"`, `title` and `aria-label` to these icon-only buttons for proper keyboard tab order and screen reader descriptions. I was able to accomplish this without needing to change visual appearance or styles.
**Action:** Always ensure interactive, non-text elements (like icons acting as buttons) have these attributes added.
