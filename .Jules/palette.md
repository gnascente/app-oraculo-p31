## 2026-11-07 - Accessibility of icon-only action buttons
**Learning:** Material Design icon (`<i>`) buttons used extensively in the app were inaccessible to screen readers and keyboard navigation.
**Action:** Always add `role="button"`, `tabindex="0"`, `aria-label`, `title`, and `onkeydown` handlers to listen for `Enter` and `Space` to these non-semantic action elements when building micro-interactions. Remember to use `event.preventDefault()` in the keydown handler to prevent unwanted page scrolling when pressing Space.
