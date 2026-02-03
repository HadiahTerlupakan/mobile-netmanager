import { FlashListProps } from '@shopify/flash-list';

declare module '@shopify/flash-list' {
  export interface FlashListProps<T> {
    estimatedItemSize?: number;
  }
}
