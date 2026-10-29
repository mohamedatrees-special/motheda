import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db/store.ts';
import { AuthService } from './src/server/services/auth.service.ts';
import { InventoryService } from './src/server/services/inventory.service.ts';
import { NotificationService } from './src/server/services/notification.service.ts';
import { OrderService } from './src/server/services/order.service.ts';
import { PaymobService } from './src/server/services/paymob.service.ts';
import { PricingService } from './src/server/services/pricing.service.ts';
import { ShippingService } from './src/server/services/shipping.service.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CSRF Origin Protection Middleware for Cookie-Authenticated Mutating Requests (Phase 2.7)
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.path.startsWith('/api/admin')) {
    const origin = req.headers['origin'] || req.headers['referer'];
    const host = req.headers['host'];
    if (origin && host) {
      try {
        const originUrl = new URL(origin as string);
        if (originUrl.host !== host) {
          return res.status(403).json({ error: 'حماية أمنية CSRF: فشل التحقق من تطابق نطاق الطلب (Origin mismatch).' });
        }
      } catch {
        return res.status(403).json({ error: 'حماية أمنية CSRF: ترويسة Origin غير صالحة.' });
      }
    }
  }
  next();
});

// Admin Authorization Middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.motaheda_admin_session || req.headers['x-admin-session'];
  if (!sessionId) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول إلى لوحة الإدارة.' });
  }

  const session = AuthService.getSession(String(sessionId));
  if (!session) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة. يرجى إعادة تسجيل الدخول.' });
  }

  (req as any).adminSession = session;
  next();
}

// ==========================================
// 1. PUBLIC CATALOG & STOREFRONT ENDPOINTS
// ==========================================

// GET /api/catalog/categories
app.get('/api/catalog/categories', (req, res) => {
  const active = db.categories.filter((c) => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  res.json({ categories: active });
});

// GET /api/catalog/products
app.get('/api/catalog/products', (req, res) => {
  const { category, search, brand, minPrice, maxPrice, voltage, inStockOnly, sort } = req.query;

  let filtered = db.products.filter((p) => p.isActive);

  if (category) {
    filtered = filtered.filter((p) => p.categoryId === category);
  }

  if (brand) {
    filtered = filtered.filter((p) => p.brand.toLowerCase().includes(String(brand).toLowerCase()));
  }

  if (voltage) {
    filtered = filtered.filter((p) => p.voltage && p.voltage.includes(String(voltage)));
  }

  if (inStockOnly === 'true') {
    filtered = filtered.filter((p) => p.stockQuantity > 0);
  }

  if (minPrice) {
    filtered = filtered.filter((p) => p.basePrice >= Number(minPrice));
  }

  if (maxPrice) {
    filtered = filtered.filter((p) => p.basePrice <= Number(maxPrice));
  }

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.titleAr.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.descriptionAr && p.descriptionAr.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (sort === 'price_asc') {
    filtered.sort((a, b) => a.basePrice - b.basePrice);
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => b.basePrice - a.basePrice);
  } else if (sort === 'stock_low') {
    filtered.sort((a, b) => a.stockQuantity - b.stockQuantity);
  }

  // Attach active promotions and low-stock warning indicators
  const productsWithMeta = filtered.map((p) => {
    const promo = PricingService.getActivePromotionForProduct(p);
    const isLowStock = p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0;
    return {
      ...p,
      activePromotion: promo,
      isLowStock,
      lowStockNoticeAr: isLowStock ? `باقي ${p.stockQuantity} قطع فقط في المخزن - اطلب الآن!` : null,
    };
  });

  res.json({ products: productsWithMeta, total: productsWithMeta.length });
});

// GET /api/catalog/products/:idOrSlug
app.get('/api/catalog/products/:idOrSlug', (req, res) => {
  const { idOrSlug } = req.params;
  const product = db.products.find(
    (p) => (p.id === idOrSlug || p.slug === idOrSlug) && p.isActive
  );

  if (!product) {
    return res.status(404).json({ error: 'المنتج المطلوب غير موجود أو غير متاح.' });
  }

  const promo = PricingService.getActivePromotionForProduct(product);
  const isLowStock = product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0;

  res.json({
    product: {
      ...product,
      activePromotion: promo,
      isLowStock,
      lowStockNoticeAr: isLowStock ? `باقي ${product.stockQuantity} قطع فقط في المخزن - اطلب الآن!` : null,
    },
  });
});

// GET /api/catalog/promotions
app.get('/api/catalog/promotions', (req, res) => {
  const now = new Date();
  const activePromos = db.promotions.filter((p) => {
    return p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now;
  });
  res.json({ promotions: activePromos });
});

// ==========================================
// 2. SHIPPING & PICKUP MATRIX ENDPOINTS
// ==========================================

// GET /api/shipping/zones
app.get('/api/shipping/zones', (req, res) => {
  const zones = ShippingService.getActiveZones();
  res.json({ zones });
});

// GET /api/shipping/branches
app.get('/api/shipping/branches', (req, res) => {
  const branches = ShippingService.getActiveBranches();
  res.json({ branches });
});

// POST /api/shipping/quote
app.post('/api/shipping/quote', (req, res) => {
  const { fulfillmentMethod, zoneId, subZoneId, branchId } = req.body;
  const quote = ShippingService.calculateShipping({
    fulfillmentMethod: fulfillmentMethod || 'DELIVERY',
    zoneId,
    subZoneId,
    branchId,
  });
  res.json(quote);
});

// ==========================================
// 3. CHECKOUT & ORDER LIFECYCLE
// ==========================================

// POST /api/checkout/orders
app.post('/api/checkout/orders', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const { order, guestAccessToken } = await OrderService.createOrder({
      ...req.body,
      clientIp,
    });

    // Set secure guest access token in cookie
    res.cookie(`motaheda_guest_${order.id}`, guestAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Generate WhatsApp click-to-chat URL
    const whatsappUrl = NotificationService.generateWhatsAppClickToChatUrl(order);

    res.status(201).json({
      success: true,
      order,
      guestAccessToken,
      whatsappUrl,
      messageAr: 'تم تسجيل طلبك بنجاح في متجر المتحدة للأدوات الكهربائية.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'تعذر إتمام الطلب.' });
  }
});

// GET /api/orders/guest/:orderId
app.get('/api/orders/guest/:orderId', (req, res) => {
  const { orderId } = req.params;
  const token =
    req.cookies?.[`motaheda_guest_${orderId}`] ||
    (req.headers['x-guest-token'] as string) ||
    (req.query.token as string);

  if (!token) {
    return res.status(401).json({
      error: 'تعذر الوصول إلى تفاصيل الطلب. يلزم رمز وصول آمن (رمز التحقق مفقود).',
    });
  }

  const order = OrderService.verifyGuestOrderAccess(orderId, String(token));
  if (!order) {
    return res.status(403).json({
      error: 'رمز الوصول غير صالح أو منتهي الصلاحية لهذا الطلب.',
    });
  }

  const whatsappUrl = NotificationService.generateWhatsAppClickToChatUrl(order);

  res.json({
    order,
    whatsappUrl,
    canCancel: order.orderStatus === 'PENDING' && order.paymentStatus !== 'PAID',
  });
});

// POST /api/orders/guest/:orderId/cancel
app.post('/api/orders/guest/:orderId/cancel', async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const token =
    req.cookies?.[`motaheda_guest_${orderId}`] ||
    (req.headers['x-guest-token'] as string) ||
    (req.query.token as string);

  if (!token) {
    return res.status(401).json({ error: 'غير مصرح بإلغاء هذا الطلب.' });
  }

  const order = OrderService.verifyGuestOrderAccess(orderId, String(token));
  if (!order) {
    return res.status(403).json({ error: 'رمز الوصول غير مطابق لهذا الطلب.' });
  }

  if (order.orderStatus !== 'PENDING') {
    return res.status(400).json({
      error: 'لا يمكن إلغاء الطلب بعد تأكيده أو شحنه من المخزن. يرجى التواصل مع خدمة العملاء.',
    });
  }

  try {
    const updated = await OrderService.transitionOrderStatus(
      orderId,
      'CANCELLED',
      reason || 'إلغاء بناءً على طلب العميل من صفحة التتبع',
      `GUEST_CUSTOMER (${order.customerPhone})`
    );
    res.json({ success: true, order: updated, messageAr: 'تم إلغاء الطلب بنجاح وإعادة البضائع للمخزن.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. PAYMOB PAYMENT INTEGRATION & WEBHOOKS
// ==========================================

// POST /api/checkout/paymob-intent
app.post('/api/checkout/paymob-intent', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'معرف الطلب مطلوب لإنشاء نية الدفع.' });
    }

    const intent = await PaymobService.createPaymentIntent(orderId);
    res.json(intent);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/webhooks/paymob
app.post('/api/webhooks/paymob', async (req, res) => {
  try {
    const receivedHmac = (req.query.hmac as string) || (req.headers['x-paymob-hmac'] as string);
    if (!receivedHmac || typeof receivedHmac !== 'string' || !receivedHmac.trim()) {
      return res.status(400).json({ error: 'توقيع إشعار بايموب مفقود (Missing HMAC Signature). تم رفض الطلب لحماية المدفوعات.' });
    }
    const result = await PaymobService.processWebhook(req.body, receivedHmac.trim());
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/checkout/paymob-sandbox/simulate
// Simulates sandbox payment result for live preview (Phase 1.7: STRICTLY DISABLED IN PRODUCTION)
app.post('/api/checkout/paymob-sandbox/simulate', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'SECURITY REJECTION: مسار محاكاة الدفع معطل تماماً في بيئة الإنتاج الحية.',
    });
  }

  try {
    const { orderId, success, paymentMethod } = req.body;
    const order = db.orders.get(orderId);
    if (!order) {
      return res.status(404).json({ error: 'الطلب غير موجود.' });
    }

    const mockTxId = `TX-${Date.now()}`;
    const payload = {
      id: mockTxId,
      order: { id: `pm-${order.id}`, merchant_order_id: order.id },
      amount_cents: Math.round(order.finalTotal * 100),
      currency: 'EGP',
      success: success === true,
      source_data: {
        pan: '**** **** **** 2346',
        sub_type: paymentMethod || 'Card',
        type: 'Online',
      },
      orderId: order.id,
    };

    // Calculate genuine HMAC in dev for simulation
    const secret = process.env.PAYMOB_HMAC_SECRET || 'test_hmac_secret_motaheda_2026';
    const computedHmac = PaymobService.calculatePaymobHmac(payload, secret);

    const result = await PaymobService.processWebhook(payload, computedHmac);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. ADMIN AUTHENTICATION & MULTI-FACTOR (OTP)
// ==========================================

// POST /api/admin/auth/login
app.post('/api/admin/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان.' });
  }

  const result = AuthService.initiateAdminLogin(username, password);
  if (!result.success) {
    return res.status(401).json({ error: result.messageAr });
  }

  res.json(result);
});

// POST /api/admin/auth/verify-otp
app.post('/api/admin/auth/verify-otp', (req, res) => {
  const { challengeId, otp } = req.body;
  if (!challengeId || !otp) {
    return res.status(400).json({ error: 'معرف التحدي ورمز التحقق مطلوبان.' });
  }

  const result = AuthService.verifyAdminOtp(challengeId, otp);
  if (!result.success || !result.session) {
    return res.status(401).json({ error: result.messageAr });
  }

  // Issue session cookie
  res.cookie('motaheda_admin_session', result.session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    session: result.session,
    messageAr: result.messageAr,
  });
});

// POST /api/admin/auth/emergency-login
app.post('/api/admin/auth/emergency-login', (req, res) => {
  const { username, recoveryCode } = req.body;
  if (!username || !recoveryCode) {
    return res.status(400).json({ error: 'اسم المستخدم ورمز الاسترداد مطلوبان.' });
  }

  const result = AuthService.verifyEmergencyRecoveryCode(username, recoveryCode);
  if (!result.success || !result.session) {
    return res.status(401).json({ error: result.messageAr });
  }

  res.cookie('motaheda_admin_session', result.session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    session: result.session,
    messageAr: result.messageAr,
  });
});

// POST /api/admin/auth/logout
app.post('/api/admin/auth/logout', (req, res) => {
  const sessionId = req.cookies?.motaheda_admin_session;
  if (sessionId) {
    AuthService.invalidateSession(String(sessionId));
  }
  res.clearCookie('motaheda_admin_session');
  res.json({ success: true, messageAr: 'تم تسجيل الخروج بنجاح.' });
});

// GET /api/admin/auth/me
app.get('/api/admin/auth/me', requireAdminAuth, (req, res) => {
  res.json({ user: (req as any).adminSession });
});

// ==========================================
// 6. ADMIN DASHBOARD & MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/admin/dashboard
app.get('/api/admin/dashboard', requireAdminAuth, (req, res) => {
  const allOrders = Array.from(db.orders.values());
  const lowStock = InventoryService.getLowStockProducts();
  const activePromos = db.promotions.filter((p) => p.isActive);

  // Financial calculations
  let verifiedCollectedRevenue = 0;
  let grossOrderValue = 0;
  const ordersByStatus: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };

  for (const ord of allOrders) {
    grossOrderValue += ord.finalTotal;
    if (ord.paymentStatus === 'PAID') {
      verifiedCollectedRevenue += ord.finalTotal;
    }
    ordersByStatus[ord.orderStatus] = (ordersByStatus[ord.orderStatus] || 0) + 1;
  }

  const recentOrders = [...allOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const recentAudits = [...db.auditLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  res.json({
    kpis: {
      verifiedCollectedRevenue,
      grossOrderValue,
      totalOrdersCount: allOrders.length,
      ordersByStatus,
      lowStockCount: lowStock.length,
      activePromotionsCount: activePromos.length,
    },
    lowStockProducts: lowStock,
    recentOrders,
    recentAudits,
  });
});

// GET /api/admin/orders
app.get('/api/admin/orders', requireAdminAuth, (req, res) => {
  const { status, paymentStatus, search } = req.query;
  let orders = Array.from(db.orders.values());

  if (status) {
    orders = orders.filter((o) => o.orderStatus === status);
  }

  if (paymentStatus) {
    orders = orders.filter((o) => o.paymentStatus === paymentStatus);
  }

  if (search) {
    const q = String(search).toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
    );
  }

  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ orders });
});

// POST /api/admin/orders/:id/status
app.post('/api/admin/orders/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const admin = (req as any).adminSession;

    const updated = await OrderService.transitionOrderStatus(
      id,
      status,
      reason || 'تحديث من لوحة تحكم الإدارة',
      `ADMIN: ${admin.fullName} (${admin.username})`
    );

    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/products
app.get('/api/admin/products', requireAdminAuth, (req, res) => {
  res.json({ products: db.products });
});

// POST /api/admin/products
app.post('/api/admin/products', requireAdminAuth, (req, res) => {
  const admin = (req as any).adminSession;
  const newProduct = {
    ...req.body,
    id: `prod-${Date.now()}`,
    slug: req.body.slug || `prod-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveProduct(newProduct);

  db.addAuditLog({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: admin.username,
    role: admin.role,
    action: 'CREATE_PRODUCT',
    entity: 'PRODUCT',
    entityId: newProduct.id,
    details: `إضافة منتج جديد: "${newProduct.titleAr}" بسعر ${newProduct.basePrice} ج.م ورصيد ${newProduct.stockQuantity}`,
  });

  res.status(201).json({ success: true, product: newProduct });
});

// PUT /api/admin/products/:id
app.put('/api/admin/products/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const admin = (req as any).adminSession;
  const oldProduct = db.getProductById(id);

  if (!oldProduct) {
    return res.status(404).json({ error: 'المنتج غير موجود.' });
  }

  const updatedProduct = {
    ...oldProduct,
    ...req.body,
    id,
    updatedAt: new Date().toISOString(),
  };

  db.saveProduct(updatedProduct);

  db.addAuditLog({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: admin.username,
    role: admin.role,
    action: 'UPDATE_PRODUCT',
    entity: 'PRODUCT',
    entityId: id,
    details: `تعديل بيانات المنتج "${updatedProduct.titleAr}". السعر الجديد: ${updatedProduct.basePrice} ج.م. المخزون: ${updatedProduct.stockQuantity}`,
  });

  res.json({ success: true, product: updatedProduct });
});

// GET /api/admin/shipping/zones
app.get('/api/admin/shipping/zones', requireAdminAuth, (req, res) => {
  res.json({ zones: db.deliveryZones, branches: db.branches });
});

// PUT /api/admin/shipping/zones/:id
app.put('/api/admin/shipping/zones/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const admin = (req as any).adminSession;
  const zones = db.deliveryZones;
  const targetZone = zones.find((z) => z.id === id);

  if (!targetZone) {
    return res.status(404).json({ error: 'منطقة الشحن غير موجودة.' });
  }

  const defaultFee = req.body.defaultFee !== undefined ? req.body.defaultFee : targetZone.defaultFee;
  const mode = req.body.mode || targetZone.mode;

  db.updateDeliveryZone(id, defaultFee, mode);

  db.addAuditLog({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: admin.username,
    role: admin.role,
    action: 'UPDATE_SHIPPING_ZONE',
    entity: 'SHIPPING_ZONE',
    entityId: id,
    details: `تحديث أسعار أو وضع شحن المحافظة: "${targetZone.nameAr}".`,
  });

  res.json({ success: true, zone: { ...targetZone, defaultFee, mode } });
});

// GET /api/admin/audit-logs
app.get('/api/admin/audit-logs', requireAdminAuth, (req, res) => {
  const logs = [...db.auditLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  res.json({ auditLogs: logs });
});

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'Al-Motaheda Electrical Supplies Engine',
    timestamp: new Date().toISOString(),
    productsCount: db.products.length,
    ordersCount: db.orders.size,
    branchesCount: db.branches.length,
    zonesCount: db.deliveryZones.length,
  });
});

// ==========================================
// 7. VITE DEV MIDDLEWARE / STATIC ASSETS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ [Al-Motaheda Engine] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
