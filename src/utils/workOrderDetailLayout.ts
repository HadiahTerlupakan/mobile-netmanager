const ACTION_BAR_BASE_PADDING = 16;
const SCROLL_BOTTOM_SPACING = 120;

export function getWorkOrderDetailActionBarPaddingBottom(bottomInset: number) {
  return Math.max(bottomInset, ACTION_BAR_BASE_PADDING);
}

export function getWorkOrderDetailScrollPaddingBottom(bottomInset: number) {
  return SCROLL_BOTTOM_SPACING + bottomInset;
}
