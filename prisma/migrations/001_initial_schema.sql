-- PostgreSQL DDL Migration for Production Deployment
-- Platform: Al-Motaheda Electrical Supplies (المتحدة للأدوات الكهربائية)

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(128) UNIQUE NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  icon VARCHAR(64),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(128) UNIQUE NOT NULL,
  title_ar VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  description_ar TEXT NOT NULL,
  description_en TEXT,
  sku VARCHAR(64) UNIQUE NOT NULL,
  category_id VARCHAR(64) NOT NULL REFERENCES categories(id),
  brand VARCHAR(128) NOT NULL,
  base_price INT NOT NULL, -- Stored in Egyptian Piasters or integer EGP
  cost_price INT,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  voltage VARCHAR(64),
  wattage VARCHAR(64),
  amperage VARCHAR(64),
  warranty VARCHAR(128),
  cable_specs VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  images_json JSONB NOT NULL DEFAULT '[]',
  variants_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotions (
  id VARCHAR(64) PRIMARY KEY,
  title_ar VARCHAR(255) NOT NULL,
  discount_type VARCHAR(32) NOT NULL,
  discount_value INT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INT NOT NULL DEFAULT 0,
  eligible_product_ids_json JSONB DEFAULT '[]',
  allocated_stock INT,
  used_stock INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id VARCHAR(64) PRIMARY KEY,
  name_ar VARCHAR(128) NOT NULL,
  name_en VARCHAR(128),
  default_fee INT NOT NULL,
  mode VARCHAR(32) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  allow_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  sub_zones_json JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(64) PRIMARY KEY,
  name_ar VARCHAR(128) NOT NULL,
  address_ar VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  working_hours_ar VARCHAR(128) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(64) UNIQUE NOT NULL,
  customer_name VARCHAR(128) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  email VARCHAR(128),
  fulfillment_method VARCHAR(32) NOT NULL,
  governorate VARCHAR(64),
  district VARCHAR(64),
  address_details TEXT,
  delivery_instructions TEXT,
  branch_id VARCHAR(64),
  branch_name VARCHAR(128),
  subtotal INT NOT NULL,
  discount_total INT NOT NULL DEFAULT 0,
  shipping_fee INT NOT NULL DEFAULT 0,
  final_total INT NOT NULL,
  currency VARCHAR(16) NOT NULL DEFAULT 'EGP',
  order_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
  payment_method VARCHAR(32) NOT NULL,
  guest_access_token_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes_json JSONB NOT NULL DEFAULT '[]',
  cancellation_reason TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  variant_id VARCHAR(64),
  title_ar VARCHAR(255) NOT NULL,
  sku VARCHAR(64) NOT NULL,
  quantity INT NOT NULL,
  unit_price INT NOT NULL,
  discount INT NOT NULL DEFAULT 0,
  line_total INT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  variant_id VARCHAR(64),
  order_id VARCHAR(64) NOT NULL,
  quantity INT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  type VARCHAR(32) NOT NULL,
  quantity INT NOT NULL,
  order_id VARCHAR(64),
  reason TEXT NOT NULL,
  actor VARCHAR(64) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paymob_transactions (
  transaction_id VARCHAR(128) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(16) NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload_redacted JSONB
);

CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  role VARCHAR(64) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  username VARCHAR(64) NOT NULL REFERENCES admin_users(username),
  full_name VARCHAR(128) NOT NULL,
  role VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS recovery_codes (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL REFERENCES admin_users(username),
  code_hash VARCHAR(128) UNIQUE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor VARCHAR(64) NOT NULL,
  role VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  challenge_id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL REFERENCES admin_users(username),
  otp_hash VARCHAR(128) NOT NULL,
  expires_at BIGINT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  is_used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS guest_rate_limits (
  identifier VARCHAR(128) PRIMARY KEY,
  count INT NOT NULL,
  first_attempt_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON inventory_reservations(status, expires_at);

