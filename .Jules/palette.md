## 2024-10-27 - [Non-semantic action buttons]
**Learning:** The application relies heavily on non-semantic `<i>` tags as primary action buttons (e.g. material icons), which are not keyboard or screen reader accessible by default.
**Action:** Establish a global pattern by adding `role="button"`, `tabindex="0"`, `aria-label`, and a global keydown event listener to handle 'Enter' and 'Space' activations for these elements. Apply `[role="button"]:focus-visible` styling to provide clear visual focus indicators.
