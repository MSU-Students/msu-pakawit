import type { PricingBreakdown } from './types';

/**
 * Calculates zero-inventory pricing breakdown given base vendor price,
 * store markup percentage, and runner convenience fee.
 */
export function calculateItemPrice(basePrice: number, markupPercentage: number): number {
  if (basePrice < 0 || markupPercentage < 0) {
    throw new Error('Base price and markup percentage must be non-negative');
  }
  const markup = (basePrice * markupPercentage) / 100;
  return Math.round((basePrice + markup) * 100) / 100;
}

/**
 * Calculates complete order pricing including convenience/delivery fees.
 */
export function calculateOrderPricing(
  items: Array<{ basePrice: number; quantity: number }>,
  markupPercentage: number,
  convenienceFee: number
): PricingBreakdown {
  if (convenienceFee < 0) {
    throw new Error('Convenience fee must be non-negative');
  }

  const rawBaseTotal = items.reduce((acc, item) => acc + item.basePrice * item.quantity, 0);
  const markupAmount = Math.round(((rawBaseTotal * markupPercentage) / 100) * 100) / 100;
  const subtotal = Math.round((rawBaseTotal + markupAmount) * 100) / 100;
  const grandTotal = Math.round((subtotal + convenienceFee) * 100) / 100;

  return {
    basePrice: rawBaseTotal,
    markupPercentage,
    markupAmount,
    subtotal,
    convenienceFee,
    grandTotal,
  };
}
