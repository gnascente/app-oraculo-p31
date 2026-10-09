## 2024-03-24 - Accessibility: ARIA Labels for Icon Buttons
**Learning:** Icon-only buttons (like Floating Action Buttons) in this application lack `aria-label` attributes and tooltip `title`s, which causes screen readers to read the icon name ("add") instead of the action, reducing accessibility.
**Action:** Add `aria-label` and `title` to icon-only buttons (especially `<button>` tags without inner text) to provide proper context.
