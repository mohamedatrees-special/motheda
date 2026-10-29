import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { runSqliteToPostgresMigration } from './migrate-sqlite-to-pg.ts';
import { getPostgresClient, PostgresClient } from './postgres.ts';

let isDbInitialized = false;

/**
 * Initializes the persistent PostgreSQL database.
 * 1. Connects to PostgreSQL (via Pool on DATABASE_URL or persistent PGlite in dev/test).
 * 2. Applies the full DDL schema from prisma/migrations/001_initial_schema.sql.
 * 3. Migrates data from existing SQLite database with immutable backup and parity checks.
 * 4. In production, strictly requires DATABASE_URL and throws if missing (Fail-Closed).
 */
export async function initializeDatabase(): Promise<PostgresClient> {
  const pg = getPostgresClient();

  if (isDbInitialized) {
    return pg;
  }

  // 1. Apply PostgreSQL Relational Schema DDL
  const schemaPath = path.resolve(process.cwd(), 'prisma', 'migrations', '001_initial_schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await pg.exec(schemaSql);
  }

  // 2. Check if database has products/categories
  const catRes = await pg.query('SELECT COUNT(*) as count FROM categories');
  const catCount = parseInt((catRes.rows[0] as any)?.count || '0', 10);

  if (catCount === 0) {
    const sqlitePath = path.resolve(process.cwd(), 'data', 'almotaheda.db');
    if (fs.existsSync(sqlitePath)) {
      console.log('🔄 [PostgreSQL Init] Found existing SQLite database. Starting automatic migration with backup...');
      const migrationResult = await runSqliteToPostgresMigration(pg, sqlitePath);
      console.log(`✅ [PostgreSQL Init] Migration completed. Parity: ${migrationResult.allParityVerified}`);
    } else {
      console.log('🌱 [PostgreSQL Init] Fresh database detected. Seeding default electrical catalog...');
      await seedDefaultPostgresData(pg);
    }
  }

  isDbInitialized = true;
  return pg;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 220000, 64, 'sha512').toString('hex');
}

async function seedDefaultPostgresData(pg: PostgresClient): Promise<void> {
  const initialCategories = [
    ['cat-cables', 'cables-wires', 'كابلات وأسلاك نحاسية', 'Cables & Copper Wires', 1, true],
    ['cat-breakers', 'breakers-panels', 'قواطع ولوحات توزيع', 'Circuit Breakers & Distribution Boards', 2, true],
    ['cat-lighting', 'led-lighting', 'إضاءة وليد وكشافات', 'LED Lighting & Fixtures', 3, true],
    ['cat-switches', 'switches-sockets', 'مفاتيح وأفياش ومقابس', 'Switches & Sockets', 4, true],
    ['cat-conduits', 'conduits-fittings', 'مواسير ولوازم تأسيس', 'Conduits & Installation Supplies', 5, true],
    ['cat-tools', 'tools-testers', 'أدوات وأجهزة قياس كهربائية', 'Electrical Tools & Testers', 6, true],
  ];

  await pg.transaction(async (tx) => {
    for (const [id, slug, nameAr, nameEn, displayOrder, isActive] of initialCategories) {
      await tx.query(
        `INSERT INTO categories (id, slug, name_ar, name_en, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [id, slug, nameAr, nameEn, displayOrder, isActive]
      );
    }

    const now = new Date().toISOString();

    const initialProducts = [
      {
        id: 'prod-elsewedy-single-wire-2-5',
        slug: 'elsewedy-copper-wire-2-5mm',
        titleAr: 'لفة سلك معزول السويدي أصلي 2.5 مم² - 100 متر',
        titleEn: 'Elsewedy Single Core Copper Wire 2.5mm² - 100m',
        descriptionAr: 'سلك كهرباء نحاس معزول بي في سي أصلي 100% من السويدي للكابلات، معتمد للمنشآت السكنية والتجارية، جودة وتحمل فائق للحرارة وعوامل التشغيل.',
        sku: 'ESW-CU-25-100',
        categoryId: 'cat-cables',
        brand: 'السويدي للكابلات',
        basePrice: 1850,
        costPrice: 1600,
        stockQuantity: 45,
        lowStockThreshold: 5,
        voltage: '450/750V',
        warranty: 'ضمان المصنع المعتمد السويدي',
        cableSpecs: '1x2.5 مم² نحاس إلكتروليتي نقي',
        isActive: true,
        imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80']),
        variantsJson: JSON.stringify([
          { id: 'v-100m', sku: 'ESW-CU-25-100', nameAr: 'لفة كاملة 100 متر', priceDelta: 0, stockQuantity: 30 },
          { id: 'v-50m', sku: 'ESW-CU-25-50', nameAr: 'نصف لفة 50 متر', priceDelta: -900, stockQuantity: 15 },
        ]),
      },
      {
        id: 'prod-elsewedy-single-wire-4',
        slug: 'elsewedy-copper-wire-4mm',
        titleAr: 'لفة سلك السويدي أصلي 4 مم² - 100 متر (للتكييفات والسخانات)',
        titleEn: 'Elsewedy Single Core Copper Wire 4mm² - 100m',
        descriptionAr: 'سلك نحاس السويدي معتمد عالي الجودة للدوائر الثقيلة مثل التكييفات 2.25 حصان وسخانات المياه الفورية والمطابخ.',
        sku: 'ESW-CU-04-100',
        categoryId: 'cat-cables',
        brand: 'السويدي للكابلات',
        basePrice: 2850,
        costPrice: 2500,
        stockQuantity: 28,
        lowStockThreshold: 6,
        voltage: '450/750V',
        warranty: 'ضمان السويدي للكابلات',
        cableSpecs: '1x4 مم² نحاس أحمر معزول PVC',
        isActive: true,
        imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80']),
        variantsJson: '[]',
      },
      {
        id: 'prod-schneider-breaker-32a',
        slug: 'schneider-actit9-breaker-32a',
        titleAr: 'قاطع أوتوماتيك شنايدر إلكتريك أحادي 32 أمبير كيرف C',
        titleEn: 'Schneider Electric 1P 32A Miniature Circuit Breaker (MCB)',
        descriptionAr: 'قاطع تيار مصغر من سلسلة Acti9 الأصلية من شنايدر إلكتريك. حماية فائقة ضد التحميل الزائد وقصر الدائرة (Short Circuit) بقدرة فصل 6kA.',
        sku: 'SCH-MCB-1P-32A',
        categoryId: 'cat-breakers',
        brand: 'شنايدر إلكتريك (Schneider Electric)',
        basePrice: 260,
        costPrice: 210,
        stockQuantity: 80,
        lowStockThreshold: 10,
        voltage: '230V AC',
        amperage: '32A (Curve C)',
        warranty: 'ضمان 3 سنوات من شنايدر',
        isActive: true,
        imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=800&auto=format&fit=crop&q=80']),
        variantsJson: '[]',
      },
      {
        id: 'prod-abb-breaker-double-63a',
        slug: 'abb-double-pole-breaker-63a',
        titleAr: 'قاطع عمومي ABB ثنائي القطب 63 أمبير 10kA أصلي',
        titleEn: 'ABB 2-Pole 63A 10kA Main Circuit Breaker',
        descriptionAr: 'قاطع رئيسي ثنائي معتمد من شركة ABB العالمية سعة 63 أمبير، يوفر أعلى معايير الأمان للوحات التوزيع المنزلية والمكتبية.',
        sku: 'ABB-MCB-2P-63A',
        categoryId: 'cat-breakers',
        brand: 'ABB',
        basePrice: 780,
        costPrice: 650,
        stockQuantity: 4,
        lowStockThreshold: 5,
        voltage: '400V AC',
        amperage: '63A (Double Pole)',
        warranty: 'ضمان 5 سنوات',
        isActive: true,
        imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80']),
        variantsJson: '[]',
      },
      {
        id: 'prod-venus-led-panel-18w',
        slug: 'venus-led-panel-light-18w',
        titleAr: 'بانل ليد فينوس غاطس 18 وات إضاءة وورم/أبيض نقي',
        titleEn: 'Venus LED Panel Light 18W Recessed',
        descriptionAr: 'كشاف بانل سقف ديكوري دائري موفر للطاقة 18 وات من فينوس، عمر افتراضي يصل إلى 30,000 ساعة تشغيل، توزيع ضوئي متجانس ومريح للعين.',
        sku: 'VNS-LED-18W-RC',
        categoryId: 'cat-lighting',
        brand: 'فينوس (Venus)',
        basePrice: 195,
        costPrice: 145,
        stockQuantity: 72,
        lowStockThreshold: 15,
        voltage: '220-240V',
        wattage: '18W',
        warranty: 'ضمان سنتين استبدال فوري',
        isActive: true,
        imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=800&auto=format&fit=crop&q=80']),
        variantsJson: JSON.stringify([
          { id: 'v-white', sku: 'VNS-LED-18W-WH', nameAr: 'إضاءة بيضاء (ضوء النهار 6500K)', priceDelta: 0, stockQuantity: 70 },
          { id: 'v-warm', sku: 'VNS-LED-18W-WM', nameAr: 'إضاءة دافئة (وورم لايت 3000K)', priceDelta: 0, stockQuantity: 50 },
        ]),
      },
      {
        id: 'prod-legrand-socket-matrix',
        slug: 'legrand-belanko-double-socket',
        titleAr: 'بريزة كهرباء مزدوجة مع تأريض لوجراند بيلانكو أصلي',
        titleEn: 'Legrand Belanko Plus 16A Double Socket with Ground',
        descriptionAr: 'لقمة ومفتاح بريزة كهربائية مزدوجة أصلية من شركة لوجراند العالمية طراز بيلانكو، مصنعة من مواد مقاومة للاشتعال مع حماية للأطفال.',
        sku: 'LEG-BEL-DS-16A',
        categoryId: 'cat-switches',
        brand: 'لوجراند (Legrand)',
        basePrice: 145,
        costPrice: 110,
        stockQuantity: 95,
        lowStockThreshold: 12,
        voltage: '250V',
        amperage: '16A',
        warranty: 'ضمان 10 سنوات',
        isActive: true,
        imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80']),
        variantsJson: '[]',
      },
      {
        id: 'prod-digital-multimeter-uni-t',
        slug: 'uni-t-digital-multimeter-ut33d',
        titleAr: 'أفوميتر رقمي دقيق UNI-T UT33D+ لقياس الجهد والتيار والمقاومة',
        titleEn: 'UNI-T Palm Size Digital Multimeter UT33D+',
        descriptionAr: 'جهاز قياس كهربائي محترف ومدمج مع شاشة إضاءة خلفية، حماية ضد السقوط ومسبار اختبار متين لفنيي ومقاولي الكهرباء.',
        sku: 'UNI-UT33D-PLUS',
        categoryId: 'cat-tools',
        brand: 'UNI-T',
        basePrice: 580,
        costPrice: 460,
        stockQuantity: 3,
        lowStockThreshold: 5,
        voltage: 'حتى 600V AC/DC',
        warranty: 'ضمان سنة صيانة واستبدال',
        isActive: true,
        imagesJson: JSON.stringify(['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80']),
        variantsJson: '[]',
      },
    ];

    for (const p of initialProducts) {
      await tx.query(
        `INSERT INTO products (
          id, slug, title_ar, title_en, description_ar, sku, category_id, brand,
          base_price, cost_price, stock_quantity, low_stock_threshold, voltage,
          wattage, amperage, warranty, cable_specs, is_active, images_json, variants_json,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.slug, p.titleAr, p.titleEn || null, p.descriptionAr, p.sku,
          p.categoryId, p.brand, p.basePrice, p.costPrice || null, p.stockQuantity,
          p.lowStockThreshold, p.voltage || null, (p as any).wattage || null,
          (p as any).amperage || null, p.warranty || null, (p as any).cableSpecs || null,
          p.isActive, p.imagesJson, p.variantsJson, now, now
        ]
      );
    }

    // Promotions
    await tx.query(
      `INSERT INTO promotions (
        id, title_ar, discount_type, discount_value, start_date, end_date,
        is_active, priority, eligible_product_ids_json, allocated_stock, used_stock
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING`,
      [
        'promo-flash-sale-2026',
        'عرض التأسيس الكهربائي السريع - خصم 15% على كابلات السويدي الأصلية',
        'PERCENTAGE',
        15,
        new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        true,
        10,
        JSON.stringify(['prod-elsewedy-single-wire-2-5', 'prod-elsewedy-single-wire-4']),
        25,
        4
      ]
    );

    // Delivery Zones
    const initialZones = [
      ['zone-cairo', 'القاهرة الكبرى', 'Greater Cairo', 40, 'DISTRICT', true, false, JSON.stringify([
        { id: 'sub-nasr-city', nameAr: 'مدينة نصر', shippingFee: 40, deliveryHours: 24 },
        { id: 'sub-new-cairo', nameAr: 'التجمع والقاهرة الجديدة', shippingFee: 50, deliveryHours: 24 },
        { id: 'sub-maadi', nameAr: 'المعادي والمقطم', shippingFee: 45, deliveryHours: 24 },
        { id: 'sub-downtown', nameAr: 'وسط البلد والسبتية', shippingFee: 35, deliveryHours: 12 },
      ])],
      ['zone-giza', 'محافظة الجيزة', 'Giza Governorate', 45, 'DISTRICT', true, false, JSON.stringify([
        { id: 'sub-dokki', nameAr: 'الدقي والمهندسين', shippingFee: 45, deliveryHours: 24 },
        { id: 'sub-october', nameAr: 'مدينة 6 أكتوبر والشيخ زايد', shippingFee: 55, deliveryHours: 24 },
        { id: 'sub-haram', nameAr: 'الهرم وفيصل', shippingFee: 45, deliveryHours: 24 },
      ])],
      ['zone-alex', 'الإسكندرية', 'Alexandria', 60, 'FLAT', true, true, '[]'],
      ['zone-delta', 'محافظات الدلتا (المنوفية، الغربية، الدقهلية)', 'Delta Governorates', 75, 'FLAT', true, true, '[]'],
      ['zone-canal', 'مدن القناة (السويس، الإسماعيلية، بورسعيد)', 'Canal Cities', 85, 'FLAT', true, true, '[]'],
    ];

    for (const [zid, nameAr, nameEn, defaultFee, mode, isActive, allowFallback, subZonesJson] of initialZones) {
      await tx.query(
        `INSERT INTO delivery_zones (id, name_ar, name_en, default_fee, mode, is_active, allow_fallback, sub_zones_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [zid, nameAr, nameEn, defaultFee, mode, isActive, allowFallback, subZonesJson]
      );
    }

    // Branches
    const initialBranches = [
      ['br-sabtiya', 'فرع السبتية المركزي (سوق الكهرباء الرئيسي)', '14 شارع السبتية، بولاق، القاهرة', '01012345678', 'يومياً من 8:30 ص إلى 8:00 م (الجمعة راحة)', true],
      ['br-ataba', 'فرع العتبة التجاري', '8 ميدان العتبة، بجوار جراج العتبة، القاهرة', '01123456789', 'يومياً من 9:00 ص إلى 9:00 م', true],
      ['br-nozha', 'فرع النزهة ومصر الجديدة', '45 شارع الحجاز، مصر الجديدة، القاهرة', '01234567890', 'يومياً من 10:00 ص إلى 10:00 م', true],
    ];

    for (const [bid, nameAr, addressAr, phone, hours, isActive] of initialBranches) {
      await tx.query(
        `INSERT INTO branches (id, name_ar, address_ar, phone, working_hours_ar, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [bid, nameAr, addressAr, phone, hours, isActive]
      );
    }

    // Default Admin User
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const adminHash = hashPassword('AdminMotaheda2026!', adminSalt);
    await tx.query(
      `INSERT INTO admin_users (id, username, password_hash, salt, full_name, role, phone, is_active, failed_login_attempts, locked_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (username) DO NOTHING`,
      ['usr-superadmin', 'admin', adminHash, adminSalt, 'م. أحمد مصطفى (المدير العام)', 'SUPER_ADMIN', '01012345678', true, 0, 0]
    );

    // Emergency Recovery Code
    const recCode = 'MOTAHEDA-EMERGENCY-2026-X99';
    const recHash = crypto.createHash('sha256').update(recCode).digest('hex');
    await tx.query(
      `INSERT INTO recovery_codes (id, username, code_hash, is_used, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      ['rec-default-01', 'admin', recHash, false, now]
    );
  });
}
