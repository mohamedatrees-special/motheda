import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'almotaheda.db');
export const sqlite = new Database(dbPath);

// Configure WAL mode for concurrency and foreign keys for relational integrity
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');

// Initialize Relational Schema
export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      icon TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title_ar TEXT NOT NULL,
      title_en TEXT,
      description_ar TEXT NOT NULL,
      description_en TEXT,
      sku TEXT UNIQUE NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      brand TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      cost_price INTEGER,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      voltage TEXT,
      wattage TEXT,
      amperage TEXT,
      warranty TEXT,
      cable_specs TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      images_json TEXT NOT NULL DEFAULT '[]',
      variants_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      title_ar TEXT NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 0,
      eligible_product_ids_json TEXT DEFAULT '[]',
      allocated_stock INTEGER,
      used_stock INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS delivery_zones (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      default_fee INTEGER NOT NULL,
      mode TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      allow_fallback INTEGER NOT NULL DEFAULT 0,
      sub_zones_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      address_ar TEXT NOT NULL,
      phone TEXT NOT NULL,
      working_hours_ar TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      email TEXT,
      fulfillment_method TEXT NOT NULL,
      governorate TEXT,
      district TEXT,
      address_details TEXT,
      delivery_instructions TEXT,
      branch_id TEXT,
      branch_name TEXT,
      subtotal INTEGER NOT NULL,
      discount_total INTEGER NOT NULL DEFAULT 0,
      shipping_fee INTEGER NOT NULL DEFAULT 0,
      final_total INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EGP',
      order_status TEXT NOT NULL DEFAULT 'PENDING',
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      payment_method TEXT NOT NULL,
      guest_access_token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      notes_json TEXT NOT NULL DEFAULT '[]',
      cancellation_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT,
      title_ar TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      line_total INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_reservations (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      variant_id TEXT,
      order_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      order_id TEXT,
      reason TEXT NOT NULL,
      actor TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS paymob_transactions (
      transaction_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      success INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      raw_payload_redacted TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      session_id TEXT PRIMARY KEY,
      username TEXT NOT NULL REFERENCES admin_users(username),
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otp_challenges (
      challenge_id TEXT PRIMARY KEY,
      username TEXT NOT NULL REFERENCES admin_users(username),
      otp_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      is_used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recovery_codes (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL REFERENCES admin_users(username),
      code_hash TEXT UNIQUE NOT NULL,
      is_used INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS guest_rate_limits (
      identifier TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      first_attempt_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON inventory_reservations(status, expires_at);
  `);

  seedDefaultData();
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function seedDefaultData() {
  const categoryCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number };
  if (categoryCount.cnt > 0) {
    return; // Already seeded, preserve existing persistent records!
  }

  const insertCategory = sqlite.prepare(`
    INSERT INTO categories (id, slug, name_ar, name_en, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const initialCategories = [
    ['cat-cables', 'cables-wires', 'كابلات وأسلاك نحاسية', 'Cables & Copper Wires', 1, 1],
    ['cat-breakers', 'breakers-panels', 'قواطع ولوحات توزيع', 'Circuit Breakers & Distribution Boards', 2, 1],
    ['cat-lighting', 'led-lighting', 'إضاءة وليد وكشافات', 'LED Lighting & Fixtures', 3, 1],
    ['cat-switches', 'switches-sockets', 'مفاتيح وأفياش ومقابس', 'Switches & Sockets', 4, 1],
    ['cat-conduits', 'conduits-fittings', 'مواسير ولوازم تأسيس', 'Conduits & Installation Supplies', 5, 1],
    ['cat-tools', 'tools-testers', 'أدوات وأجهزة قياس كهربائية', 'Electrical Tools & Testers', 6, 1],
  ];

  for (const cat of initialCategories) {
    insertCategory.run(...cat);
  }

  const insertProduct = sqlite.prepare(`
    INSERT INTO products (
      id, slug, title_ar, title_en, description_ar, sku, category_id, brand,
      base_price, cost_price, stock_quantity, low_stock_threshold, voltage,
      wattage, amperage, warranty, cable_specs, is_active, images_json, variants_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  insertProduct.run(
    'prod-elsewedy-single-wire-2-5',
    'elsewedy-copper-wire-2-5mm',
    'لفة سلك معزول السويدي أصلي 2.5 مم² - 100 متر',
    'Elsewedy Single Core Copper Wire 2.5mm² - 100m',
    'سلك كهرباء نحاس معزول بي في سي أصلي 100% من السويدي للكابلات، معتمد للمنشآت السكنية والتجارية، جودة وتحمل فائق للحرارة وعوامل التشغيل.',
    'ESW-CU-25-100',
    'cat-cables',
    'السويدي للكابلات',
    1850,
    1600,
    45,
    5,
    '450/750V',
    null,
    null,
    'ضمان المصنع المعتمد السويدي',
    '1x2.5 مم² نحاس إلكتروليتي نقي',
    1,
    JSON.stringify(['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80']),
    JSON.stringify([
      { id: 'v-100m', sku: 'ESW-CU-25-100', nameAr: 'لفة كاملة 100 متر', priceDelta: 0, stockQuantity: 30 },
      { id: 'v-50m', sku: 'ESW-CU-25-50', nameAr: 'نصف لفة 50 متر', priceDelta: -900, stockQuantity: 15 },
    ]),
    now,
    now
  );

  insertProduct.run(
    'prod-elsewedy-single-wire-4',
    'elsewedy-copper-wire-4mm',
    'لفة سلك السويدي أصلي 4 مم² - 100 متر (للتكييفات والسخانات)',
    'Elsewedy Single Core Copper Wire 4mm² - 100m',
    'سلك نحاس السويدي معتمد عالي الجودة للدوائر الثقيلة مثل التكييفات 2.25 حصان وسخانات المياه الفورية والمطابخ.',
    'ESW-CU-04-100',
    'cat-cables',
    'السويدي للكابلات',
    2850,
    2500,
    28,
    6,
    '450/750V',
    null,
    null,
    'ضمان السويدي للكابلات',
    '1x4 مم² نحاس أحمر معزول PVC',
    1,
    JSON.stringify(['https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80']),
    '[]',
    now,
    now
  );

  insertProduct.run(
    'prod-schneider-breaker-32a',
    'schneider-actit9-breaker-32a',
    'قاطع أوتوماتيك شنايدر إلكتريك أحادي 32 أمبير كيرف C',
    'Schneider Electric 1P 32A Miniature Circuit Breaker (MCB)',
    'قاطع تيار مصغر من سلسلة Acti9 الأصلية من شنايدر إلكتريك. حماية فائقة ضد التحميل الزائد وقصر الدائرة (Short Circuit) بقدرة فصل 6kA.',
    'SCH-MCB-1P-32A',
    'cat-breakers',
    'شنايدر إلكتريك (Schneider Electric)',
    260,
    210,
    80,
    10,
    '230V AC',
    null,
    '32A (Curve C)',
    'ضمان 3 سنوات من شنايدر',
    null,
    1,
    JSON.stringify(['https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=800&auto=format&fit=crop&q=80']),
    '[]',
    now,
    now
  );

  insertProduct.run(
    'prod-abb-breaker-double-63a',
    'abb-double-pole-breaker-63a',
    'قاطع عمومي ABB ثنائي القطب 63 أمبير 10kA أصلي',
    'ABB 2-Pole 63A 10kA Main Circuit Breaker',
    'قاطع رئيسي ثنائي معتمد من شركة ABB العالمية سعة 63 أمبير، يوفر أعلى معايير الأمان للوحات التوزيع المنزلية والمكتبية.',
    'ABB-MCB-2P-63A',
    'cat-breakers',
    'ABB',
    780,
    650,
    4,
    5,
    '400V AC',
    null,
    '63A (Double Pole)',
    'ضمان 5 سنوات',
    null,
    1,
    JSON.stringify(['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80']),
    '[]',
    now,
    now
  );

  insertProduct.run(
    'prod-venus-led-panel-18w',
    'venus-led-panel-light-18w',
    'بانل ليد فينوس غاطس 18 وات إضاءة وورم/أبيض نقي',
    'Venus LED Panel Light 18W Recessed',
    'كشاف بانل سقف ديكوري دائري موفر للطاقة 18 وات من فينوس، عمر افتراضي يصل إلى 30,000 ساعة تشغيل، توزيع ضوئي متجانس ومريح للعين.',
    'VNS-LED-18W-RC',
    'cat-lighting',
    'فينوس (Venus)',
    195,
    145,
    120,
    15,
    '220-240V',
    '18W',
    null,
    'ضمان سنتين استبدال فوري',
    null,
    1,
    JSON.stringify(['https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=800&auto=format&fit=crop&q=80']),
    JSON.stringify([
      { id: 'v-white', sku: 'VNS-LED-18W-WH', nameAr: 'إضاءة بيضاء (ضوء النهار 6500K)', priceDelta: 0, stockQuantity: 70 },
      { id: 'v-warm', sku: 'VNS-LED-18W-WM', nameAr: 'إضاءة دافئة (وورم لايت 3000K)', priceDelta: 0, stockQuantity: 50 },
    ]),
    now,
    now
  );

  insertProduct.run(
    'prod-legrand-socket-matrix',
    'legrand-belanko-double-socket',
    'بريزة كهرباء مزدوجة مع تأريض لوجراند بيلانكو أصلي',
    'Legrand Belanko Plus 16A Double Socket with Ground',
    'لقمة ومفتاح بريزة كهربائية مزدوجة أصلية من شركة لوجراند العالمية طراز بيلانكو، مصنعة من مواد مقاومة للاشتعال مع حماية للأطفال.',
    'LEG-BEL-DS-16A',
    'cat-switches',
    'لوجراند (Legrand)',
    145,
    110,
    95,
    12,
    '250V',
    null,
    '16A',
    'ضمان 10 سنوات',
    null,
    1,
    JSON.stringify(['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80']),
    '[]',
    now,
    now
  );

  insertProduct.run(
    'prod-digital-multimeter-uni-t',
    'uni-t-digital-multimeter-ut33d',
    'أفوميتر رقمي دقيق UNI-T UT33D+ لقياس الجهد والتيار والمقاومة',
    'UNI-T Palm Size Digital Multimeter UT33D+',
    'جهاز قياس كهربائي محترف ومدمج مع شاشة إضاءة خلفية، حماية ضد السقوط ومسبار اختبار متين لفنيي ومقاولي الكهرباء.',
    'UNI-UT33D-PLUS',
    'cat-tools',
    'UNI-T',
    580,
    460,
    3,
    5,
    'حتى 600V AC/DC',
    null,
    null,
    'ضمان سنة صيانة واستبدال',
    null,
    1,
    JSON.stringify(['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80']),
    '[]',
    now,
    now
  );

  // Seed Promotions
  const insertPromo = sqlite.prepare(`
    INSERT INTO promotions (
      id, title_ar, discount_type, discount_value, start_date, end_date,
      is_active, priority, eligible_product_ids_json, allocated_stock, used_stock
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const flashEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  insertPromo.run(
    'promo-flash-sale-2026',
    'عرض التأسيس الكهربائي السريع - خصم 15% على كابلات السويدي الأصلية',
    'PERCENTAGE',
    15,
    new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    flashEnd,
    1,
    10,
    JSON.stringify(['prod-elsewedy-single-wire-2-5', 'prod-elsewedy-single-wire-4']),
    25,
    4
  );

  insertPromo.run(
    'promo-lighting-deal',
    'خصم فوري 25 ج.م على بانل ليد فينوس 18 وات',
    'FIXED',
    25,
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    1,
    5,
    JSON.stringify(['prod-venus-led-panel-18w']),
    50,
    12
  );

  // Seed Delivery Zones
  const insertZone = sqlite.prepare(`
    INSERT INTO delivery_zones (id, name_ar, name_en, default_fee, mode, is_active, allow_fallback, sub_zones_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertZone.run(
    'zone-cairo',
    'محافظة القاهرة',
    'Cairo Governorate',
    50,
    'DISTRICT',
    1,
    0,
    JSON.stringify([
      { id: 'sub-nasr-city', nameAr: 'مدينة نصر', nameEn: 'Nasr City', shippingFee: 40, isActive: true },
      { id: 'sub-new-cairo', nameAr: 'القاهرة الجديدة والتجمع', nameEn: 'New Cairo & Tagamoa', shippingFee: 50, isActive: true },
      { id: 'sub-maadi', nameAr: 'المعادي وطرة', nameEn: 'Maadi & Tora', shippingFee: 45, isActive: true },
      { id: 'sub-heliopolis', nameAr: 'مصر الجديدة والنزهة', nameEn: 'Heliopolis & Nozha', shippingFee: 40, isActive: true },
      { id: 'sub-downtown', nameAr: 'وسط البلد والسبتية وعابدين', nameEn: 'Downtown & Sabtiya', shippingFee: 35, isActive: true },
      { id: 'sub-shubra', nameAr: 'شبرا وروض الفرج', nameEn: 'Shubra & Rod El-Farag', shippingFee: 35, isActive: true },
      { id: 'sub-shorouk', nameAr: 'مدينة الشروق وبدر', nameEn: 'El Shorouk & Badr', shippingFee: 65, isActive: true },
    ])
  );

  insertZone.run(
    'zone-giza',
    'محافظة الجيزة',
    'Giza Governorate',
    55,
    'DISTRICT',
    1,
    1,
    JSON.stringify([
      { id: 'sub-dokki', nameAr: 'الدقي والمهندسين والعجوزة', nameEn: 'Dokki & Mohandessin', shippingFee: 45, isActive: true },
      { id: 'sub-haram', nameAr: 'الهرم وفيصل', nameEn: 'Haram & Faisal', shippingFee: 50, isActive: true },
      { id: 'sub-october', nameAr: 'مدينة 6 أكتوبر والشيخ زايد', nameEn: '6th of October & Zayed', shippingFee: 60, isActive: true },
    ])
  );

  insertZone.run(
    'zone-alexandria',
    'محافظة الإسكندرية',
    'Alexandria Governorate',
    60,
    'FLAT',
    1,
    1,
    JSON.stringify([
      { id: 'sub-smouha', nameAr: 'سموحة وسيدي جابر', nameEn: 'Smouha & Sidi Gaber', shippingFee: 60, isActive: true },
      { id: 'sub-miami', nameAr: 'ميامي ومحرم بك', nameEn: 'Miami & Moharam Bek', shippingFee: 60, isActive: true },
    ])
  );

  insertZone.run(
    'zone-qalyubia',
    'محافظة القليوبية',
    'Qalyubia Governorate',
    60,
    'FLAT',
    1,
    1,
    JSON.stringify([
      { id: 'sub-banha', nameAr: 'بنها وقليوب', nameEn: 'Banha & Qalyub', shippingFee: 60, isActive: true },
      { id: 'sub-shubra-kheima', nameAr: 'شبرا الخيمة', nameEn: 'Shubra El-Kheima', shippingFee: 45, isActive: true },
    ])
  );

  insertZone.run(
    'zone-sharqia',
    'محافظة الشرقية',
    'Sharqia Governorate',
    75,
    'FLAT',
    1,
    1,
    JSON.stringify([
      { id: 'sub-zagazig', nameAr: 'الزقازيق والعاشر من رمضان', nameEn: 'Zagazig & 10th of Ramadan', shippingFee: 75, isActive: true },
    ])
  );

  // Seed Branches
  const insertBranch = sqlite.prepare(`
    INSERT INTO branches (id, name_ar, address_ar, phone, working_hours_ar, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertBranch.run(
    'branch-sabtiya',
    'فرع السبتية المركزي (سوق الكهرباء)',
    '14 شارع السبتية الرئيسي، بجوار بنك مصر، وسط القاهرة',
    '0225789123',
    'يومياً من 8:30 صباحاً حتى 9:00 مساءً (الجمعة عطلة)',
    1
  );

  insertBranch.run(
    'branch-ataba',
    'فرع العتبة وشارع عبد العزيز',
    'ميدان العتبة، عمارة الأوقاف، تقاطع شارع عبد العزيز',
    '0223914488',
    'يومياً من 9:00 صباحاً حتى 10:00 مساءً',
    1
  );

  insertBranch.run(
    'branch-nozha',
    'فرع النزهة الجديدة ومصر الجديدة',
    'شارع جوزيف تيتو، أمام مطار القاهرة، النزهة الجديدة',
    '0226229910',
    'يومياً من 10:00 صباحاً حتى 11:00 مساءً',
    1
  );

  // Seed Admin User (Phase 2 Compliance: check environment for production)
  const isProd = process.env.NODE_ENV === 'production';
  let adminPassword = process.env.ADMIN_PASSWORD;
  let emergencyCode = process.env.ADMIN_RECOVERY_CODE;

  if (isProd) {
    if (!adminPassword || adminPassword === 'AdminMotaheda2026!' || !emergencyCode || emergencyCode === 'MOTAHEDA-EMERGENCY-2026-X99') {
      throw new Error(
        'SECURITY HALT: Production environment must provide secure non-default ADMIN_PASSWORD and ADMIN_RECOVERY_CODE. Default test credentials are strictly rejected.'
      );
    }
  } else {
    adminPassword = adminPassword || 'AdminMotaheda2026!';
    emergencyCode = emergencyCode || 'MOTAHEDA-EMERGENCY-2026-X99';
  }

  const adminSalt = crypto.randomBytes(32).toString('hex');
  const adminPasswordHash = hashPassword(adminPassword, adminSalt);
  const recoveryCodeHash = crypto.createHash('sha256').update(emergencyCode.trim()).digest('hex');

  sqlite.prepare(`
    INSERT INTO admin_users (id, username, password_hash, salt, full_name, role, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'admin-01',
    'admin',
    adminPasswordHash,
    adminSalt,
    'م. أحمد مصطفى (المدير العام)',
    'SUPER_ADMIN',
    '01012345678',
    1
  );

  // Single-use recovery code
  sqlite.prepare(`
    INSERT INTO recovery_codes (id, username, code_hash, is_used, created_at)
    VALUES (?, ?, ?, 0, ?)
  `).run(
    `rec-${Date.now()}`,
    'admin',
    recoveryCodeHash,
    now
  );

  // Initial Audit Log
  sqlite.prepare(`
    INSERT INTO audit_logs (id, timestamp, actor, role, action, entity, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'audit-init-01',
    now,
    'SYSTEM_BOOTSTRAP',
    'SYSTEM',
    'INITIALIZE_SQL_DATABASE',
    'STORE_CONFIG',
    'DATABASE_SQLITE',
    'تمت تهيئة قاعدة بيانات SQLite العلائقية بنجاح وتفعيل وضع WAL والمفاتيح الأجنبية وسجل الاسترداد الأحادي.'
  );
}

// Run initial migration
initializeDatabase();
