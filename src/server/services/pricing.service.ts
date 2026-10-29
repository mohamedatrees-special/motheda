import { OrderItem, Product, Promotion } from '../../types/index.ts';
import { db } from '../db/store.ts';

export interface CalculatedPricing {
  subtotal: number;
  discountTotal: number;
  finalItems: OrderItem[];
  appliedPromotions: { promoId: string; titleAr: string; savedAmount: number }[];
}

export class PricingService {
  /**
   * Find highest-priority active promotion for a product at the current timestamp
   */
  public static getActivePromotionForProduct(product: Product): Promotion | null {
    const now = new Date();

    const eligiblePromos = db.promotions.filter((p) => {
      if (!p.isActive) return false;
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      if (now < start || now > end) return false;

      // Check product eligibility
      if (p.eligibleProductIds && p.eligibleProductIds.length > 0) {
        if (!p.eligibleProductIds.includes(product.id)) return false;
      }

      // Check allocated promotion stock if specified
      if (p.allocatedStock !== undefined && p.usedStock !== undefined) {
        if (p.usedStock >= p.allocatedStock) return false;
      }

      return true;
    });

    if (eligiblePromos.length === 0) return null;

    // Sort by priority descending
    eligiblePromos.sort((a, b) => b.priority - a.priority);
    return eligiblePromos[0];
  }

  /**
   * Authoritative calculation for cart items
   * Never trusts client-submitted prices or discounts
   */
  public static calculateOrderItems(
    requestedItems: { productId: string; variantId?: string; quantity: number }[]
  ): CalculatedPricing {
    let subtotal = 0;
    let discountTotal = 0;
    const finalItems: OrderItem[] = [];
    const appliedPromosMap = new Map<string, { promoId: string; titleAr: string; savedAmount: number }>();

    for (const req of requestedItems) {
      if (!req.quantity || req.quantity <= 0) {
        throw new Error('الكمية المطلوبة يجب أن تكون أكبر من الصفر.');
      }

      const product = db.products.find((p) => p.id === req.productId && p.isActive);
      if (!product) {
        throw new Error(`المنتج المطلوب (${req.productId}) غير متوفر أو تم إيقافه.`);
      }

      let unitPrice = product.basePrice;
      let titleAr = product.titleAr;
      let sku = product.sku;

      // Handle variant adjustments
      if (req.variantId && product.variants) {
        const variant = product.variants.find((v) => v.id === req.variantId);
        if (!variant) {
          throw new Error(`المواصفة المطلوبة غير صالحة للمنتج: ${product.titleAr}`);
        }
        unitPrice += variant.priceDelta;
        titleAr = `${product.titleAr} (${variant.nameAr})`;
        sku = variant.sku;
      }

      if (unitPrice < 0) {
        unitPrice = 0;
      }

      // Calculate eligible promotion discount
      const activePromo = this.getActivePromotionForProduct(product);
      let unitDiscount = 0;

      if (activePromo) {
        if (activePromo.discountType === 'PERCENTAGE') {
          unitDiscount = Math.round((unitPrice * activePromo.discountValue) / 100);
        } else if (activePromo.discountType === 'FIXED') {
          unitDiscount = Math.min(unitPrice, activePromo.discountValue);
        }

        const totalSaved = unitDiscount * req.quantity;
        const existing = appliedPromosMap.get(activePromo.id);
        if (existing) {
          existing.savedAmount += totalSaved;
        } else {
          appliedPromosMap.set(activePromo.id, {
            promoId: activePromo.id,
            titleAr: activePromo.titleAr,
            savedAmount: totalSaved,
          });
        }
      }

      const itemTotal = (unitPrice - unitDiscount) * req.quantity;
      subtotal += unitPrice * req.quantity;
      discountTotal += unitDiscount * req.quantity;

      finalItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        variantId: req.variantId,
        titleAr,
        sku,
        quantity: req.quantity,
        unitPrice,
        discount: unitDiscount,
        lineTotal: itemTotal,
      });
    }

    return {
      subtotal,
      discountTotal,
      finalItems,
      appliedPromotions: Array.from(appliedPromosMap.values()),
    };
  }
}
