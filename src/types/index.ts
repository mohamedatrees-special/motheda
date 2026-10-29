export type Currency = 'EGP';

export type FulfillmentMethod = 'DELIVERY' | 'PICKUP';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CASH_ON_DELIVERY'
  | 'PAYMOB_CARD'
  | 'PAYMOB_WALLET'
  | 'PAYMOB_VALU';

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'ORDER_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'CATALOG_MANAGER'
  | 'FINANCE_MANAGER';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export type ShippingMode = 'FLAT' | 'DISTRICT';

export interface Category {
  id: string;
  slug: string;
  nameAr: string;
  nameEn?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  nameAr: string;
  nameEn?: string;
  priceDelta: number; // in EGP
  stockQuantity: number;
}

export interface Product {
  id: string;
  slug: string;
  titleAr: string;
  titleEn?: string;
  descriptionAr: string;
  descriptionEn?: string;
  sku: string;
  categoryId: string;
  brand: string;
  basePrice: number; // in EGP
  costPrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  voltage?: string; // e.g. "220V", "380V"
  wattage?: string; // e.g. "18W", "50W"
  amperage?: string; // e.g. "16A", "32A", "63A"
  warranty?: string; // e.g. "ضمان سنتين معتمد"
  cableSpecs?: string; // e.g. "3x2.5 مم² نحاس معزول"
  isActive: boolean;
  images: string[];
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  titleAr: string;
  discountType: DiscountType;
  discountValue: number; // percentage (e.g. 15 for 15%) or fixed EGP amount
  startDate: string; // ISO string
  endDate: string; // ISO string
  isActive: boolean;
  priority: number;
  eligibleProductIds?: string[];
  allocatedStock?: number;
  usedStock?: number;
}

export interface DeliverySubZone {
  id: string;
  nameAr: string;
  nameEn?: string;
  shippingFee: number; // in EGP
  isActive: boolean;
}

export interface DeliveryZone {
  id: string;
  nameAr: string;
  nameEn?: string;
  defaultFee: number; // in EGP
  mode: ShippingMode; // FLAT uses defaultFee for all subzones, DISTRICT uses subzone fees
  isActive: boolean;
  subZones: DeliverySubZone[];
  allowFallbackToDefault?: boolean; // if district not listed, fallback to default fee?
}

export interface Branch {
  id: string;
  nameAr: string;
  addressAr: string;
  phone: string;
  workingHoursAr: string;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  titleAr: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string; // Public reference e.g. MOT-2026-0042
  customerName: string;
  customerPhone: string;
  email?: string;
  fulfillmentMethod: FulfillmentMethod;
  governorate?: string;
  district?: string;
  addressDetails?: string;
  deliveryInstructions?: string;
  branchId?: string;
  branchName?: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  finalTotal: number;
  currency: Currency;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  guestAccessTokenHash: string; // SHA-256 hash of random access token
  createdAt: string;
  updatedAt: string;
  notes?: string[];
  cancellationReason?: string;
}

export interface InventoryReservation {
  id: string;
  productId: string;
  variantId?: string;
  orderId: string;
  quantity: number;
  expiresAt: string;
  status: 'ACTIVE' | 'RELEASED' | 'COMMITTED';
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: 'PURCHASE' | 'RESERVATION' | 'RELEASE' | 'ADMIN_ADJUSTMENT' | 'RETURN';
  quantity: number;
  orderId?: string;
  reason: string;
  actor: string;
  timestamp: string;
}

export interface PaymentAttempt {
  id: string;
  orderId: string;
  provider: 'PAYMOB';
  providerTransactionId?: string;
  providerOrderId?: string;
  amount: number;
  currency: Currency;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  role: AdminRole;
  phone: string;
  isActive: boolean;
  recoveryCodeHash: string;
}

export interface OTPChallenge {
  challengeId: string;
  username: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  channel: 'WHATSAPP' | 'SMS' | 'CONSOLE';
}
