// ============================================================================
// WhatsApp template parameter formatting helpers
// ============================================================================

interface OrderItem {
  quantity: number;
  name: string;
}

/**
 * Format order items for a template parameter.
 * Truncates at maxLength to stay within Meta's 1024 char limit per param.
 */
export function formatOrderItems(
  items: OrderItem[],
  maxLength = 900,
): string {
  let result = '';
  let count = 0;

  for (const item of items) {
    const line = `${item.quantity}x ${item.name}`;
    if ((result + (count > 0 ? ', ' : '') + line).length > maxLength) {
      result += `, +${items.length - count} more items`;
      break;
    }
    result += (count > 0 ? ', ' : '') + line;
    count++;
  }

  return result || 'No items';
}

/**
 * Truncate a string to fit within a template parameter limit.
 */
export function truncateParam(value: string, maxLength = 1000): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 3) + '...';
}
