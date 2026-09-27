## 2026-09-27 - Accessibility for Non-Semantic Action Icons
**Learning:** Using non-semantic `<i>` tags (like Material Icons) as primary action buttons prevents screen readers from understanding their purpose and blocks keyboard navigation.
**Action:** Always add `role="button"`, `tabindex="0"`, and descriptive `aria-label` attributes to icon-only interactive elements. Furthermore, ensure they have a `:focus-visible` style for visual feedback and a global `keydown` listener to handle 'Enter' and 'Space' activations.
