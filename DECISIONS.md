# Architectural & Technical Decisions — Al-Motaheda Electrical Supplies

## 1. Runtime & Full-Stack Architecture
- **Decision:** Fullstack TypeScript architecture with Node.js/Express handling server-side API routes, transactions, rate limiting, and business invariant validations, integrated directly with Vite dev server and React 19 frontend.
- **Rationale:** Ensures strict separation between server-only secrets (Paymob HMAC, admin hashes, payment intents) and browser client components, while delivering instant Arabic RTL UI responsiveness.
- **Port:** Configured to port 3000 to comply with runtime environment constraints.

## 2. Persistent Relational Storage & Concurrency
- **Decision:** Implemented `better-sqlite3` (`data/almotaheda.db`) with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`), strict foreign keys (`PRAGMA foreign_keys = ON;`), and atomic SQL transactions. Also generated production PostgreSQL DDL migrations (`prisma/migrations/001_initial_schema.sql`).
- **Rationale:** The execution environment lacks background Docker/PostgreSQL system daemons. SQLite provides native, high-performance ACID compliance, real relational tables, and durable disk persistence so restarting the server never erases products, orders, stock, or audit history.
- **Concurrency & Invariants:** Serialized write transactions and atomic reservations prevent overselling even under concurrent requests.

## 3. Currency & Monetary Value Calculation
- **Decision:** All monetary values are handled in integer Egyptian Piasters (`EGP * 100`) or fixed high-precision decimal calculations server-side.
- **Rationale:** Prevents floating point inaccuracies (e.g., `0.1 + 0.2 !== 0.3`) in financial transactions, order line items, discounts, and payment gateways. Strict exact match is required for webhook payment amounts (no permissive tolerances).

## 4. Shipping Matrix Resolution
- **Decision:** Dual-mode shipping engine:
  - **Flat-Rate mode:** Governorate default flat rate (e.g. Alexandria = 60 EGP).
  - **District-specific mode:** Granular pricing per district (e.g., Cairo -> Nasr City: 40 EGP, New Cairo: 50 EGP, Maadi: 45 EGP).
  - **Pickup from branch ("استلام من الفرع"):** 0 EGP with mandatory physical branch validation (Al-Sabtiya, Al-Ataba, Al-Nozha Al-Gedida).
  - **Fallback/Validation:** Unmapped or deactivated districts are explicitly rejected with Arabic error `"التوصيل غير متاح لهذه المنطقة حالياً"` unless explicitly allowed by admin.

## 5. Payment Gateway (Paymob) & Idempotency
- **Decision:**
  - Mandatory HMAC-SHA512 verification on all incoming webhook requests. Missing or invalid HMAC is rejected immediately.
  - Verification of transaction ID, order reference, currency (`EGP`), exact amount (to the piaster), and `success` status before confirming orders.
  - Strict deduplication using `paymob_transactions` primary key constraints and transactional order status transitions.
  - Public sandbox simulation endpoint is strictly forbidden in production (`process.env.NODE_ENV === 'production'`).
  - Sensitive PAN and customer card numbers are redacted from audit logs.

## 6. WhatsApp Integration (Two-Tier Model)
- **Decision:**
  - **Tier 1 (Zero-Cost Manual Click-to-Chat):** Primary customer confirmation channel via WhatsApp URL scheme (`https://wa.me/{number}?text={encoded_message}`) with sanitized payload (order ID, customer name, total amount only).
  - **Tier 2 (Automated WhatsApp Cloud API / Twilio):** Pluggable provider architecture in `NotificationService`, disabled by default until merchant credentials are provided.

## 7. Security, Admin 2FA & Emergency Access
- **Decision:**
  - Multi-factor authentication for administrators: PBKDF2 password hash verification (100,000 iterations of SHA-512) + 6-digit OTP challenge (3-minute TTL, attempt limit, dev console fallback).
  - Account lockout throttling: 5 consecutive failed login attempts locks the user/account for 15 minutes.
  - Single-use, expiring emergency recovery codes stored as SHA-256 hashes in database. Once used, immediately consumed and invalidated.
  - In production mode, OTP codes are never sent to browser clients or logged to console. Insecure default credentials fail closed on startup.
  - CSRF protection: Origin and Referer verification on all mutating `/api/admin/*` routes.
