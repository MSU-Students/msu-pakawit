import { calculateItemPrice, calculateOrderPricing } from '../modules/storefront/pricingCalculator';

describe('Pricing Calculator (Zero-Capital Cataloging)', () => {
  it('correctly calculates marked up item price based on percentage', () => {
    // basePrice 50 PHP with 10% markup => 55 PHP
    expect(calculateItemPrice(50, 10)).toBe(55);
    // basePrice 100 PHP with 15% markup => 115 PHP
    expect(calculateItemPrice(100, 15)).toBe(115);
  });

  it('throws error when negative values are provided', () => {
    expect(() => calculateItemPrice(-10, 5)).toThrow();
    expect(() => calculateItemPrice(50, -5)).toThrow();
  });

  it('calculates full order pricing breakdown with convenience fees', () => {
    const items = [
      { basePrice: 45, quantity: 2 }, // 90
      { basePrice: 65, quantity: 1 }, // 65
    ]; // total base = 155
    const markupPct = 10; // 15.5
    const convenienceFee = 35; // 35

    const breakdown = calculateOrderPricing(items, markupPct, convenienceFee);

    expect(breakdown.basePrice).toBe(155);
    expect(breakdown.markupAmount).toBe(15.5);
    expect(breakdown.subtotal).toBe(170.5);
    expect(breakdown.convenienceFee).toBe(35);
    expect(breakdown.grandTotal).toBe(205.5);
  });
});
