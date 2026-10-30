## 2026-10-30 - Added accessibility tags to header icons
**Learning:** Adding role="button" and tabindex="0" enables keyboard navigation. Using onkeydown with event.preventDefault() for 'Enter' and Space ensures the icons behave as properly accessible buttons, without jumping down the page on space bar press.
**Action:** When creating new components relying on <i> elements for icons, always include these attributes if they act as an action button to remain compliant.
