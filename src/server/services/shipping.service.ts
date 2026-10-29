import { Branch, DeliveryZone, FulfillmentMethod } from '../../types/index.ts';
import { db } from '../db/store.ts';

export interface ShippingQuote {
  shippingFee: number;
  fulfillmentMethod: FulfillmentMethod;
  zoneNameAr?: string;
  districtNameAr?: string;
  branch?: Branch;
  isAvailable: boolean;
  messageAr?: string;
}

export class ShippingService {
  /**
   * Resolves the authoritative shipping charge
   */
  public static calculateShipping(params: {
    fulfillmentMethod: FulfillmentMethod;
    zoneId?: string;
    subZoneId?: string;
    branchId?: string;
  }): ShippingQuote {
    // 1. Branch Pickup (استلام من الفرع)
    if (params.fulfillmentMethod === 'PICKUP') {
      if (!params.branchId) {
        return {
          shippingFee: 0,
          fulfillmentMethod: 'PICKUP',
          isAvailable: false,
          messageAr: 'يرجى اختيار فرع الاستلام المعتمد لإتمام الطلب.',
        };
      }

      const branch = db.branches.find((b) => b.id === params.branchId && b.isActive);
      if (!branch) {
        return {
          shippingFee: 0,
          fulfillmentMethod: 'PICKUP',
          isAvailable: false,
          messageAr: 'الفرع المحدد غير متاح حالياً لاستلام البضائع.',
        };
      }

      return {
        shippingFee: 0,
        fulfillmentMethod: 'PICKUP',
        branch,
        isAvailable: true,
        messageAr: `الاستلام مجاني من ${branch.nameAr}`,
      };
    }

    // 2. Home Delivery (توصيل للموقع أو الورشة)
    if (!params.zoneId) {
      return {
        shippingFee: 0,
        fulfillmentMethod: 'DELIVERY',
        isAvailable: false,
        messageAr: 'يرجى تحديد المحافظة لحساب تكلفة الشحن.',
      };
    }

    const zone = db.deliveryZones.find((z) => z.id === params.zoneId && z.isActive);
    if (!zone) {
      return {
        shippingFee: 0,
        fulfillmentMethod: 'DELIVERY',
        isAvailable: false,
        messageAr: 'التوصيل غير متاح لهذه المحافظة حالياً.',
      };
    }

    // Flat Rate Mode
    if (zone.mode === 'FLAT') {
      return {
        shippingFee: zone.defaultFee,
        fulfillmentMethod: 'DELIVERY',
        zoneNameAr: zone.nameAr,
        isAvailable: true,
        messageAr: `سعر شحن موحد للمحافظة: ${zone.defaultFee} ج.م`,
      };
    }

    // District Specific Mode
    if (zone.mode === 'DISTRICT') {
      if (!params.subZoneId) {
        return {
          shippingFee: zone.defaultFee,
          fulfillmentMethod: 'DELIVERY',
          zoneNameAr: zone.nameAr,
          isAvailable: false,
          messageAr: 'يرجى اختيار المنطقة / الحي لحساب الشحن الدقيق.',
        };
      }

      const subZone = zone.subZones.find((s) => s.id === params.subZoneId && s.isActive);
      if (subZone) {
        return {
          shippingFee: subZone.shippingFee,
          fulfillmentMethod: 'DELIVERY',
          zoneNameAr: zone.nameAr,
          districtNameAr: subZone.nameAr,
          isAvailable: true,
          messageAr: `تكلفة الشحن إلى ${subZone.nameAr}: ${subZone.shippingFee} ج.م`,
        };
      }

      // Check fallback policy
      if (zone.allowFallbackToDefault) {
        return {
          shippingFee: zone.defaultFee,
          fulfillmentMethod: 'DELIVERY',
          zoneNameAr: zone.nameAr,
          isAvailable: true,
          messageAr: `سعر الشحن الأساسي للمحافظة: ${zone.defaultFee} ج.م`,
        };
      }

      // Strict rejection when district is missing or inactive
      return {
        shippingFee: 0,
        fulfillmentMethod: 'DELIVERY',
        zoneNameAr: zone.nameAr,
        isAvailable: false,
        messageAr: 'التوصيل غير متاح لهذه المنطقة حالياً.',
      };
    }

    return {
      shippingFee: 0,
      fulfillmentMethod: 'DELIVERY',
      isAvailable: false,
      messageAr: 'التوصيل غير متاح لهذه المنطقة حالياً.',
    };
  }

  public static getActiveZones(): DeliveryZone[] {
    return db.deliveryZones.filter((z) => z.isActive);
  }

  public static getActiveBranches(): Branch[] {
    return db.branches.filter((b) => b.isActive);
  }
}
