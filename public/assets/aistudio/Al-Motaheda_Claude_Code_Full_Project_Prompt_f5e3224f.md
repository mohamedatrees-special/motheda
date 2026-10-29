# MASTER SOFTWARE ENGINEERING PROMPT — CLAUDE CODE EDITION

## Al-Motaheda Electrical Supplies — Production-Grade E-Commerce Platform

> **Project status:** BRAND-NEW PROJECT. There is no existing application or legacy repository to preserve. Create the application from scratch in the current working directory.
>
> **How to use this document:** Open Claude Code in the folder where the project should live, attach or paste this entire specification, and let Claude Code work directly on the files. Do not use this as a request to merely print code in chat.

## CLAUDE CODE EXECUTION CONTRACT — READ FIRST

You are working as an autonomous senior engineering team inside Claude Code, with access to the current workspace and terminal. Your job is to create the actual project, not just provide an architecture proposal or code snippets.

### A. Start from scratch

- Assume there is no existing application. Inspect the current directory only to confirm what is present; do not assume there is a working repository.
- If the directory is empty, initialize the project and create all required files.
- If unrelated files exist, do not delete or overwrite them without inspecting and explaining why.
- Create a Git repository if one is not already present, and add a safe `.gitignore` before creating local environment files.
- Never create, commit, print, or request real secrets in chat. Create `.env.example` with placeholders only and keep real `.env` files out of Git.

### B. Build the complete application in phases, autonomously

- Follow the phases in this specification in order and continue from one phase to the next without asking for approval after every phase.
- Do not stop after producing a plan, mockup, architecture document, or initial scaffold. Implement the actual application, connect the modules, and run checks.
- Make sensible, documented, reversible engineering decisions when details are missing. Ask the user only when a decision is genuinely blocking and cannot be safely handled with a conservative default.
- If a third-party credential or external service is unavailable, complete all code and tests that can be completed safely, clearly mark the integration as BLOCKED/NOT VERIFIED, and continue with other work. Never fake a successful live integration.
- If the session or context limit prevents completion, leave the workspace in a coherent state and update `IMPLEMENTATION_STATUS.md` with completed work, exact next steps, commands/results, blockers, and the next phase to resume. Do not claim the whole project is complete.
- Keep `IMPLEMENTATION_STATUS.md` and `DECISIONS.md` up to date as work proceeds. Use them to avoid losing progress.

### C. Required workflow for every phase

1. Briefly state the phase and intended changes in the terminal/session summary.
2. Implement the phase in the real project files.
3. Run the relevant commands yourself: lint, typecheck, unit tests, integration tests, migrations, and build as applicable.
4. Fix failures caused by your changes before moving forward. Do not silence checks or weaken security to get a green result.
5. Record exact commands and actual outcomes in `IMPLEMENTATION_STATUS.md`.
6. Continue to the next phase unless blocked by a genuine external dependency or a dangerous/destructive action requiring explicit authorization.

### D. Technical decision rules

- Follow the stack specified below unless a verified compatibility or deployment constraint makes it unsuitable. If you change the stack, document the reason in `DECISIONS.md` and update all affected requirements consistently.
- Before adding dependencies, check whether they are necessary and compatible with the selected Node.js/Next.js versions.
- Use official, current documentation for Next.js, Prisma, PostgreSQL, Redis, Paymob, and any messaging provider. Do not invent SDK methods, API endpoints, callback formats, or provider configuration.
- Use real PostgreSQL and Redis in local development and integration tests when available. Docker Compose is the default local setup. If Docker or a service is unavailable, report the exact blocked checks and still run all independent checks.
- Prefer maintainable, boring, well-supported implementations over unnecessary abstraction or an oversized microservice architecture.
- Use strict TypeScript, shared server-side domain services, validated inputs, explicit state machines, and database constraints for business invariants.

### E. Completion and honesty rules

- A polished UI, successful compilation, or generated code alone does not prove production readiness.
- Never report a test as passing unless you executed it and observed the result.
- Never represent a placeholder, mock, or sandbox-only integration as production-ready.
- Never claim legal compliance, complete security, or successful live payment processing without the corresponding evidence and qualified review where needed.
- At the end, provide a clear READY / NOT READY / BLOCKED recommendation, with evidence and the exact owner actions still required.

### ROLE AND MISSION

Act as a Principal Full-Stack Software Architect, Senior TypeScript Engineer, Application Security Engineer, Database Architect, and QA Automation Engineer.

Design, implement, test, and document a complete, secure, production-ready Arabic e-commerce platform for:

**Arabic Brand Name:** المتحدة للأدوات الكهربائية

**English Brand Name:** Al-Motaheda Electrical Supplies

This is a real commercial application intended to handle actual customers, inventory, orders, shipping, payments, and administrative operations.

Do not produce a prototype, static mockup, UI-only implementation, or a collection of disconnected code snippets.

Build a cohesive application with working frontend components, persistent database storage, validated server-side business logic, secure authentication, real payment integration, automated tests, deployment documentation, and operational safeguards.

All customer-facing interfaces must use Arabic as the default language with full RTL support. The architecture should allow English to be added later without rewriting the application.

Prioritize correctness, security, financial integrity, maintainability, accessibility, and a polished user experience over unnecessary complexity.

# 0. CRITICAL DELIVERY RULES — READ BEFORE CODING

These rules override any instruction that could encourage superficial completion, unsafe shortcuts, or unsupported claims.

## 0.1. Work from evidence, not assumptions

- First inspect the repository, package scripts, current schema, migrations, environment-variable usage, and existing tests.
- If this is an existing project, produce a concise change plan and preserve working behavior unless a change is necessary and documented.
- Do not overwrite or delete user data, production databases, existing migrations, credentials, or working features without explicit authorization.
- Do not claim a file, endpoint, integration, test, or security control exists unless you have inspected or created it.
- Do not claim tests pass unless you actually ran them and can report the command and result.
- If a command cannot be run because credentials, services, network access, or infrastructure are unavailable, state exactly what is blocked and what remains unverified.

## 0.2. Required implementation loop

For each phase:

1. State the files and behavior to be changed.
2. Implement the smallest cohesive set of changes.
3. Run formatting, linting, type checking, relevant tests, and build checks that are available.
4. Fix regressions before proceeding.
5. Summarize changed files, commands run, actual results, and remaining risks.

Do not dump disconnected snippets and call them a finished application. Create or edit the actual project files in the repository when tool access permits. If the environment cannot modify files, clearly label the response as a proposed patch rather than an implemented change.

## 0.3. Never fake production integrations

- Use sandbox/test mode for payment development.
- Do not create fake success responses for Paymob, OTP delivery, email, WhatsApp, storage, or background jobs and present them as real integrations.
- Keep mock providers isolated to tests or an explicitly labeled local-development mode.
- Fail closed for security-critical operations when configuration or verification is missing.
- Provide an explicit feature/configuration status showing whether an integration is configured, disabled, sandbox-only, or production-ready. Never expose secret values in this status.

## 0.4. Stop-ship conditions

Do not label the application production-ready while any of these conditions remains:

- A critical or high-severity security defect is unresolved.
- A customer can manipulate the final price, shipping fee, discount, payment state, stock, or permissions.
- Invalid or duplicate payment callbacks can mark an order paid or trigger fulfillment more than once.
- Concurrent checkout can oversell inventory or create inconsistent reservations.
- An unauthenticated or unauthorized user can read or modify another customer's order or personal information.
- A production secret is exposed to the browser, repository, logs, or error responses.
- Required migrations, backup/restore procedures, or essential integration tests are missing.
- A required release check has not run or its result is unknown.

A blocked check must be reported as BLOCKED/NOT VERIFIED, never as PASS.

# 1. MANDATORY ENGINEERING PRINCIPLES

Follow these principles throughout the implementation:

1. Treat all client-provided values as untrusted.
2. Never trust client-provided prices, totals, discounts, payment statuses, shipping fees, stock quantities, or administrative permissions.
3. Perform authorization and sensitive business logic on the server.
4. Use PostgreSQL as the authoritative persistent data store.
5. Use Redis for suitable ephemeral data, rate limiting, OTP challenges, distributed coordination, and session storage when appropriate.
6. Make payment processing, inventory management, and order creation resilient to concurrent requests, race conditions, and duplicate events.
7. Use database transactions (`SELECT ... FOR UPDATE` where applicable) and constraints to protect business invariants and prevent double-processing.
8. Implement idempotency for operations that may be retried.
9. Keep secrets and privileged integrations exclusively on the server.
10. Maintain auditable records for sensitive administrative and financial operations.
11. Never mark an order as paid merely because a customer visits a success URL.
12. Never claim an integration works without implementing and testing its actual behavior.
13. Do not invent provider API endpoints, credentials, webhook formats, or SDK capabilities. Verify them against official documentation for the selected provider and API version.
14. Do not silently replace real integrations with fake implementations or mock responses.
15. Make all unavailable external dependencies explicit and provide clearly documented development alternatives.

Before implementation, inspect the existing repository if one is provided. Preserve working functionality where appropriate, identify existing conventions, and avoid destructive changes.

If starting from scratch, establish the architecture and project structure before implementing the modules.

# 2. TECHNOLOGY STACK

Use the following stack unless a documented technical constraint requires an alternative.

## Frontend

- Next.js App Router.
- React.
- TypeScript with strict mode enabled.
- Tailwind CSS.
- Lucide React icons.
- Arabic RTL-first design.
- Server Components for suitable read-heavy pages.
- Client Components only where browser interaction is necessary.
- TanStack Query for client-side server-state management when justified.
- Zustand for shared client-side state when justified.

Do not introduce TanStack Query or Zustand into every page by default.

Use native Server Components and server-side data loading when they provide a simpler, safer solution.

## Backend

Use Next.js Route Handlers and Server Actions with a clear service-layer architecture.

Organize business logic into reusable server-side services, including:

- ProductService.
- PricingService.
- PromotionService.
- InventoryService.
- CartService.
- OrderService.
- ShippingService.
- PaymentService.
- AuthenticationService.
- GuestOrderAccessService.
- NotificationService.
- AuditService.

Route Handlers, Server Actions, background workers, and webhooks must reuse the same validated business rules instead of duplicating them.

Every sensitive entry point must perform its own authorization and input validation.

Never assume that middleware or a hidden frontend button provides sufficient authorization.

## Database

- PostgreSQL.
- Prisma ORM.
- Versioned database migrations.
- Explicit foreign keys, indexes, uniqueness constraints, and appropriate database-level checks.
- Monetary values stored strictly as integers representing minor currency units (e.g., Piasters) or high-precision decimals (`Decimal(10, 2)`) to avoid floating-point inaccuracies.
- UTC timestamps for persisted event times.

## Cache and coordination

- Redis.
- Server-side rate limiting.
- Short-lived OTP challenges.
- Administrative session storage where appropriate.
- Temporary inventory reservation coordination when justified.

PostgreSQL remains the authoritative source for orders, payments, inventory, and financial records.

Redis must not be the only persistent record of a completed order or payment.

## Testing

Use an appropriate combination of:

- Vitest or Jest for unit and service tests.
- Integration tests against a real test PostgreSQL instance.
- Playwright for end-to-end browser tests.
- Redis-backed integration tests for rate limiting and temporary state.
- Provider sandbox environments for payment integration testing.

Pin compatible dependency versions and document the supported Node.js version.

# 3. APPLICATION ARCHITECTURE

Organize the application into clear modules.

Suggested structure:

app/ (store)/ page.tsx products/ categories/ cart/ checkout/ order/ admin/ login/ verify-otp/ dashboard/ products/ categories/ promotions/ orders/ inventory/ delivery/ branches/ settings/ audit-logs/ api/ checkout/ webhooks/ auth/ orders/ admin/ health/

components/ ui/ storefront/ products/ cart/ checkout/ admin/ forms/ layout/

lib/ auth/ db/ redis/ security/ validation/ pricing/ shipping/ payments/ notifications/ logging/

services/ products/ promotions/ inventory/ orders/ shipping/ payments/ notifications/ admin/

workers/ notification-worker.ts reservation-expiry-worker.ts

prisma/ schema.prisma migrations/ seed.ts

tests/ unit/ integration/ e2e/ security/

The structure may be adjusted when necessary, but keep responsibilities clearly separated.

Never import server-only modules, database clients, private credentials, or privileged payment code into client components.

Use the `server-only` package where appropriate to prevent accidental server-module imports into client bundles.

# 4. DATABASE DESIGN

Create a complete, normalized Prisma schema.

At minimum, evaluate and implement the following models where appropriate.

## 4.1. Product and catalog

### Product

Fields should include:

- id.
- slug.
- Arabic title.
- Optional English title.
- Arabic description.
- Optional English description.
- SKU.
- Category relationship.
- Manufacturer or brand.
- Base price.
- Optional cost price with restricted administrative access.
- Stock-related fields or inventory relationships.
- Low-stock threshold.
- Voltage.
- Wattage.
- Warranty information.
- Active/inactive status.
- SEO metadata.
- Created and updated timestamps.

Use unique constraints for SKU and slug as appropriate.

Do not store multiple independent representations of the same inventory quantity unless their synchronization rules are explicitly defined.

### ProductImage

Include:

- Product relationship.
- Image URL or storage key.
- Alternative text.
- Display order.
- Primary-image indicator.

### Category

Support:

- Arabic and optional English names.
- Slug.
- Parent category.
- Active status.
- Display order.
- SEO fields.

Support hierarchical categories and subcategories without creating an unnecessarily rigid hierarchy.

### ProductVariant

Use this model when products have distinct purchasable variants, such as cable lengths, dimensions, colors, or electrical specifications.

Each variant must have its own SKU and appropriate inventory tracking.

## 4.2. Promotions

Create a Promotion model supporting:

- Flash sales.
- Inventory-limited promotions.
- Manually activated indefinite promotions.
- Fixed discounts.
- Percentage discounts.
- Start and end timestamps.
- Active status.
- Promotion priority.
- Eligible products or categories.
- Allocated promotion inventory when applicable.
- Maximum discount rules where appropriate.

Use a separate promotion-inventory model if the business requires stock allocation.

Define the behavior of overlapping promotions explicitly.

Never allow a promotion to produce a negative price or bypass server-side pricing rules.

## 4.3. Shopping cart

Implement Cart and CartItem if persistent carts are needed.

Support guest carts without treating client-side cart data as authoritative.

Revalidate product availability, current prices, promotions, and quantities on the server before creating an order.

## 4.4. Orders

### Order

Include:

- Internal ID.
- Public order reference.
- Optional customer account relationship.
- Guest/customer contact information.
- Order status.
- Payment status.
- Fulfillment method.
- Selected branch when applicable.
- Shipping address snapshot.
- Delivery-zone snapshot.
- Shipping fee snapshot.
- Subtotal.
- Discount total.
- Tax total where applicable.
- Final payable total.
- Currency.
- Cancellation metadata.
- Created and updated timestamps.

Use a non-sequential public reference if appropriate, but never treat knowledge of the reference as authorization.

### OrderItem

Preserve immutable purchase-time information:

- Product and optional variant references.
- Product name snapshot.
- SKU snapshot.
- Quantity.
- Unit price.
- Applied discount.
- Tax information where applicable.
- Line total.

Historical orders must remain financially consistent when product prices, names, categories, or promotions change.

## 4.5. Payments

### Payment

Support multiple attempts per order.

Include:

- Order relationship.
- Provider.
- Provider transaction identifier (with strict unique constraints to guarantee idempotency).
- Provider order identifier when applicable.
- Payment-attempt reference.
- Amount.
- Currency.
- Payment status.
- Provider response metadata with sensitive fields excluded.
- Creation and update timestamps.

Apply appropriate unique constraints to provider transaction identifiers.

### PaymentWebhookEvent

Store verified provider events or event-processing records sufficient to support:

- Duplicate detection.
- Idempotent processing.
- Processing status.
- Retry and recovery handling.
- Auditability.

Do not store unnecessary payment secrets or raw sensitive payloads.

### Refund

Include a separate model if refunds are supported.

Record provider references, amounts, status, and audit information.

## 4.6. Inventory

### InventoryReservation

Track:

- Product or variant.
- Order relationship.
- Quantity reserved.
- Reservation expiration (with grace or extension logic if a payment attempt is actively pending).
- Reservation status.

### InventoryMovement

Record inventory changes:

- Product or variant.
- Movement type.
- Quantity.
- Related order or reservation.
- Reason.
- Actor or system process.
- Timestamp.

Implement atomic stock updates and appropriate locking or conditional database updates.

Never permit available stock to become negative.

## 4.7. Shipping

Create:

- DeliveryZone.
- DeliverySubZone.
- Branch.

DeliveryZone represents a governorate or primary service area.

DeliverySubZone represents a district or more granular delivery area.

Branch represents a physical store available for pickup.

Support flat-rate and district-specific pricing.

Store shipping-policy snapshots in orders.

## 4.8. Authentication and security

Create appropriate models for:

- AdminUser.
- AdminRole or AdminPermission.
- AdminSession if PostgreSQL-backed sessions are used.
- AuditLog.
- GuestOrderAccess.
- NotificationLog.

OTP challenges may live in Redis rather than PostgreSQL, provided the implementation handles expiry, single use, attempt limits, and recovery correctly.

Do not store plaintext passwords, plaintext OTPs, or plaintext guest access tokens in the database.

Use migrations to create and evolve the schema.

Provide a development seed script with realistic sample products, categories, shipping zones, and branches.

Never seed production with known default administrative credentials.

# 5. STOREFRONT AND PRODUCT EXPERIENCE

Build a polished, fully functional Arabic storefront.

## Homepage

Include:

- Brand header and navigation.
- Search.
- Product categories.
- Featured products.
- Active promotional offers.
- Popular products.
- Low-stock indicators where applicable.
- Delivery and pickup information.
- Footer with store contact details and policies.

## Product listing

Support:

- Search.
- Category filtering.
- Brand filtering.
- Price range.
- Electrical specifications.
- Sorting.
- Pagination.
- Responsive product cards.

Validate query parameters on the server.

Use suitable indexes and avoid loading the entire catalog into memory.

## Product details

Display:

- Product images.
- Arabic title and description.
- SKU.
- Brand.
- Electrical specifications.
- Warranty.
- Current price.
- Applicable promotion.
- Stock availability.
- Delivery/pickup availability.
- Related products.

When stock is below the configured threshold, display:

"باقي X قطع فقط في المخزن - اطلب الآن!"

Only display the notice when the server confirms that the quantity is genuinely low.

Do not expose internal stock or supplier information unnecessarily.

## Flash-sale countdown

Display an animated countdown for active Flash Sale promotions.

The timer is a presentation feature, not a source of pricing authority.

Validate promotion eligibility and expiration on the server whenever prices are calculated or an order is created.

## Accessibility

Implement:

- Semantic HTML.
- Keyboard navigation.
- Visible focus states.
- Accessible form labels.
- Appropriate contrast.
- Accessible dialog behavior.
- Screen-reader-friendly status messages.
- Reduced-motion support.

# 6. PRICING AND PROMOTION ENGINE

Implement a centralized server-side PricingService.

It must calculate:

1. Valid product or variant prices.
2. Eligible promotions.
3. Promotion precedence.
4. Discount amounts.
5. Applicable tax.
6. Shipping charges through the ShippingService.
7. Final payable amount.

Define and document whether promotions can be combined.

Use an explicit promotion-priority policy.

Support:

### Flash Sale

- Start timestamp.
- End timestamp.
- Automatic activation and expiration.
- Server-side eligibility checks.

### Inventory-limited promotion

- Separate promotion allocation when required.
- Atomic reservation of promotional stock.
- No overselling.
- Explicit fallback to standard pricing after the promotional allocation is exhausted.

### Manual indefinite promotion

- Remains active until disabled or otherwise made ineligible.
- Must not bypass stock or price validation.

Define how a promotion interacts with an existing inventory reservation and an expired checkout session.

Preserve the price accepted at order creation in an immutable snapshot.

Document whether the promotion price is locked during a reservation and for how long.

Never use floating-point arithmetic for monetary calculations.

# 7. INVENTORY RESERVATION AND CONCURRENCY

Implement an inventory reservation system designed to prevent overselling and race conditions.

Define a consistent checkout sequence.

The system must:

1. Revalidate requested quantities.
2. Calculate the authoritative price.
3. Check stock availability.
4. Reserve stock using concurrency-safe database operations (using transactions with row-level locks `SELECT ... FOR UPDATE`).
5. Create the order and associated records transactionally where appropriate.
6. Release expired or cancelled reservations according to policy—ensuring active payment processing sessions extend or hold reservation expiration to prevent releasing stock while a payment gateway response is pending.
7. Finalize stock changes without duplication.
8. Handle payment success and failure consistently.

Use database transactions, atomic conditional updates, and appropriate locking.

A background worker or scheduled process should release expired reservations safely using atomic checks.

The process must remain safe if it runs multiple times or processes the same reservation more than once.

Define behavior for:

- Two customers attempting to buy the final item.
- A customer abandoning checkout.
- Payment success after a reservation expires.
- Delayed payment notifications.
- Cancellation during payment processing.
- A failed payment followed by a successful retry.
- Promotion inventory reaching zero during concurrent checkout.

Do not depend on Redis alone for financial or inventory correctness.

# 8. DYNAMIC SHIPPING MATRIX

Implement a centralized ShippingService used by both the storefront and administrative tools.

## 8.1. Governorate-level flat rate

Administrators can:

- Add or edit governorates.
- Activate or deactivate service.
- Set a default shipping fee.
- Change the pricing mode.

Example:

Alexandria: 60 EGP.

All eligible districts use the configured governorate rate when flat-rate mode is active.

## 8.2. District-specific pricing

Example:

Cairo:

- Nasr City: 40 EGP.
- New Cairo: 50 EGP.
- Maadi: 45 EGP.

Each sub-zone must belong to a valid governorate.

Support explicit fallback policies.

Recommended default behavior:

If district pricing is enabled and the selected district is missing or inactive, reject home delivery for that location.

A fallback to the governorate rate must occur only when the administrator explicitly enables it.

## 8.3. Pickup

Support:

"استلام من الفرع"

Pickup must:

- Cost 0 EGP for shipping.
- Require selection of an active pickup branch.
- Validate the branch on the server.
- Preserve the selected branch in the order snapshot.

## 8.4. Checkout behavior

Update the shipping quote when the customer changes the fulfillment method, governorate, or district.

The frontend must display the result returned by the backend.

At order creation, recalculate and validate the shipping charge.

If the address is unsupported, display:

"التوصيل غير متاح لهذه المنطقة حالياً"

Do not allow an unsupported address to bypass the delivery resolver.

## 8.5. Administrative editor

Build a working management interface supporting:

- Governorate CRUD.
- District CRUD.
- Flat-rate/district-rate mode switching.
- Default shipping fees.
- Sub-zone fees.
- Active/inactive status.
- Fallback policy configuration.
- Branch management.
- Validation before saving.
- Clear confirmation for destructive actions.
- Immediate preview of shipping calculations.

Persist every change to PostgreSQL and record sensitive changes in AuditLog.

# 9. CHECKOUT AND ORDER LIFECYCLE

Implement a complete checkout flow.

Collect only necessary customer information, including:

- Full name.
- Contact phone.
- Governorate.
- District where applicable.
- Detailed delivery address.
- Optional delivery instructions.
- Fulfillment method.
- Pickup branch where applicable.
- Payment method.

Validate Egyptian phone numbers using an appropriate server-side validation rule without assuming that syntactic validity proves ownership.

Support guest checkout.

Recalculate all financial values on the server.

The checkout must clearly show:

- Item subtotal.
- Discounts.
- Taxes, if applicable.
- Shipping cost.
- Final total.
- Payment method.
- Fulfillment method.

## Order status

Define a documented order-state machine.

Suggested states:

- PENDING.
- CONFIRMED.
- PROCESSING.
- SHIPPED.
- DELIVERED.
- CANCELLED.

## Payment status

Keep payment status separate:

- UNPAID.
- PENDING.
- PAID.
- FAILED.
- REFUND_PENDING.
- REFUNDED.

Use only the states appropriate to the implemented payment workflow.

Define allowed state transitions.

Do not permit arbitrary state changes through a generic status-update endpoint.

Separate order cancellation from refund processing.

Define the policy for cancellation before payment, during payment, after payment, and after shipment.

For manual confirmation, clearly distinguish:

- Customer submitted an order.
- Customer requested confirmation through WhatsApp.
- Store confirmed the order.
- Payment succeeded.

These are different events and must not be conflated.

# 10. GUEST CHECKOUT RATE LIMITING

Implement a configurable rule limiting guest order creation.

Default business policy:

One eligible guest order per hour per recognized guest identifier / verified phone number / secure browser session token, subject to the configured anti-abuse policy.

Use:

- Redis-backed rate limiting.
- Resilient identifiers (avoiding pure IP-based blocking due to Egyptian ISP CGNAT architectures which group multiple legitimate users behind shared IPs).
- A server-issued secure guest identifier cookie combined with phone-number verification controls where appropriate.
- Server-side enforcement.

Apply limits separately where appropriate to:

- Order creation.
- Payment-intent creation.
- OTP requests.
- Login attempts.
- Contact or messaging abuse.

Return HTTP 429 when appropriate, including Retry-After and a clear Arabic message describing when another attempt is permitted.

Ensure concurrent requests cannot bypass the configured limit.

Document how legitimate customers can recover from accidental duplicate submissions.

# 11. SECURE GUEST ORDER ACCESS

Implement guest order access without requiring account registration.

Generate a cryptographically secure, high-entropy access token on the server.

Store a hash of the access token in persistent storage.

Deliver the token through a Secure, HttpOnly cookie when appropriate.

Do not duplicate the raw token into localStorage.

Use a separate short-lived or revocable authorization mechanism if a browser-accessible bearer token is genuinely required.

Protect the following operations:

- View order.
- Update permitted shipping details.
- Cancel an eligible order.

For every operation:

1. Verify the access token.
2. Resolve the corresponding order.
3. Verify authorization for that exact order.
4. Verify the order's current state.
5. Validate the requested operation.
6. Enforce CSRF protections for cookie-authenticated state-changing requests.
7. Record relevant changes.

Do not expose personal data merely because a user knows an order ID.

Allow guest updates or cancellations only while the order is in an explicitly eligible state.

Invalidate access when required by policy.

Do not allow a guest to change product prices, payment status, stock quantities, or administrative fields.

Implement protection against insecure direct object references (IDOR).

# 12. PAYMOB PAYMENT INTEGRATION

Implement a real server-side Paymob integration.

Verify the current official Paymob documentation for the selected account, API version, authentication mechanism, checkout method, and webhook format.

Do not mix incompatible Paymob API generations or invent request fields.

Required environment variables should follow the selected integration's actual requirements, for example:

DATABASE_URL= REDIS_URL= PAYMOB_API_KEY= PAYMOB_SECRET_KEY= PAYMOB_INTEGRATION_ID= PAYMOB_IFRAME_ID= PAYMOB_HMAC_SECRET= PAYMOB_BASE_URL= APP_BASE_URL=

Use the exact credentials required by the chosen Paymob flow.

Never expose these values to client-side code.

## 12.1. Payment-intent endpoint

Implement:

POST /api/checkout/paymob-intent

The endpoint must:

1. Validate the incoming request using Zod.
2. Verify the order's eligibility for payment.
3. Authorize access to the order.
4. Recalculate or validate the authoritative payable amount.
5. Validate the currency.
6. Confirm that required inventory reservations remain valid.
7. Create or reuse a suitable payment attempt according to the idempotency policy.
8. Request the required payment data from Paymob server-to-server.
9. Associate the provider's identifiers with the correct order and payment attempt.
10. Return only the minimum checkout information needed by the browser.

Use timeouts and controlled error handling for external API requests.

Never return provider credentials, secret keys, private request headers, or unrestricted internal error details.

## 12.2. Hosted checkout

Redirect the customer to the official hosted Paymob checkout page using the flow supported by the configured integration.

Support only payment methods enabled for the merchant account.

Do not assume that cards, mobile wallets, Vodafone Cash, ValU, or other methods are automatically available.

Use the provider's current configuration to determine supported methods.

## 12.3. Webhook

Implement:

POST /api/webhooks/paymob

The webhook must:

- Validate the signature using the exact documented Paymob HMAC procedure.
- Use the exact documented list and order of signed fields.
- Reject missing or invalid signatures.
- Verify transaction and merchant identifiers where required.
- Verify the amount and currency.
- Verify the relationship between the transaction, payment attempt, and order.
- Validate the provider's authoritative payment-success indicators.
- Detect duplicate events using unique database constraints and transaction locks to prevent concurrent webhook execution race conditions.
- Handle delayed and out-of-order notifications.
- Apply state transitions transactionally.
- Prevent duplicate payment recording and duplicate fulfillment.
- Avoid logging secrets or unnecessary personal information.

Use constant-time comparison for locally calculated signatures when applicable.

Do not assume every webhook payload has the same HMAC format.

Follow Paymob's documented verification procedure for the selected API and callback type.

## 12.4. Payment reliability

Handle:

- Duplicate webhooks.
- Delayed callbacks.
- Payment success after a client timeout.
- Payment success while local database persistence is temporarily unavailable.
- Failed payments.
- Expired payment attempts.
- Multiple attempts for one order.
- Unexpected amounts.
- Invalid currencies.
- Transactions associated with the wrong order.
- Duplicate checkout submissions.

Persist enough information to reconcile unresolved transactions.

Never mark an order as paid based solely on browser redirection.

## 12.5. Payment result pages

Implement:

- /checkout/success
- /checkout/failed

The success page must retrieve authoritative server-side order/payment status.

If payment verification is still pending, display an appropriate pending message instead of claiming success.

Never expose payment credentials or allow arbitrary order IDs to reveal private order details.

# 13. WHATSAPP CLICK-TO-CHAT CONFIRMATION

Implement a zero-cost manual WhatsApp contact flow.

Environment variable:

STORE_WHATSAPP_NUMBER=

The number must be configured in the international format required by the WhatsApp click-to-chat URL.

Do not hardcode private contact details into unrelated components.

## Success page

Display a prominent button:

"تأكيد الطلب عبر واتساب المتجر"

## Order tracking page

Display the same button when appropriate.

Use the template:

"مرحباً متجر المتحدة، قمت بعمل طلب جديد رقم #{{order_id}} بقيمة {{total_amount}} ج.م باسم {{customer_name}}. برجاء تأكيد الطلب."

Construct the URL safely using URLSearchParams or an equivalent correct URL-encoding implementation.

Use the configured store number.

The button must open the official WhatsApp click-to-chat destination.

Do not include:

- Guest access tokens.
- Session identifiers.
- Payment secrets.
- Full shipping addresses.
- Unnecessary personal information.

Do not automatically open WhatsApp without a clear user action.

Do not assume that clicking the button means the message was sent.

Do not assume that the store has confirmed the order.

Provide an appropriate fallback if the phone number is not configured.

If an order has already been cancelled, refunded, or otherwise become ineligible, adapt the displayed message or button behavior accordingly.

# 14. NOTIFICATION SERVICE ARCHITECTURE

Create a provider-independent NotificationService interface.

Example responsibilities:

- sendOrderCreated.
- sendPaymentConfirmed.
- sendOrderStatusUpdated.
- sendOrderCancelled.

Use separate adapters for:

- Email.
- WhatsApp Cloud API.
- Twilio WhatsApp.
- Database notification logging.

Do not couple core order creation logic to a single messaging provider.

## Email

Use Resend or Nodemailer with a properly configured provider.

Keep email credentials server-side.

Provide configurable templates and delivery error handling.

## Future automated WhatsApp

Environment variables may include:

ENABLE_WHATSAPP_NOTIFICATIONS=false WHATSAPP_PROVIDER= WHATSAPP_CLOUD_API_TOKEN= WHATSAPP_PHONE_NUMBER_ID= WHATSAPP_BUSINESS_ACCOUNT_ID= WHATSAPP_API_VERSION= TWILIO_ACCOUNT_SID= TWILIO_AUTH_TOKEN= TWILIO_WHATSAPP_FROM=

Use only the credentials required by the selected provider.

Do not activate both WhatsApp providers accidentally.

Do not log access tokens.

Automated WhatsApp messages must remain disabled unless explicitly enabled and properly configured.

Implement a transactional outbox or another durable event-delivery mechanism where appropriate.

A notification worker should process queued events independently of the checkout response.

Support:

- Idempotent processing.
- Retry with exponential backoff.
- Timeouts.
- Delivery-state tracking.
- Provider-specific error handling.
- Failed-event inspection.
- Safe replay of eligible failed events.
- Data minimization.
- Explicit activation checks.

Follow the selected provider's current messaging policies, template requirements, consent requirements, and applicable legal requirements.

Do not promise that automated messaging will work merely because an environment flag is enabled.

The manual Click-to-Chat flow must continue to work independently of automated WhatsApp delivery.

# 15. ADMIN AUTHENTICATION, WHATSAPP OTP & RESILIENCE

Create a completely protected administrative area.

Suggested routes:

/admin/login /admin/verify-otp /admin/dashboard

All administrative APIs and Server Actions must independently enforce authorization.

## 15.1. Password authentication

Use Argon2id for password hashing.

Implement:

- Generic login errors.
- Rate limiting.
- Secure password verification.
- Secure password-reset procedures if supported.
- Audit logging for successful and failed authentication.
- Appropriate session expiration.

Never store plaintext passwords.

Do not include default production credentials.

## 15.2. OTP challenge

After successful password verification:

1. Generate a cryptographically secure six-digit OTP.
2. Associate it with a unique authentication challenge.
3. Give it a three-minute lifetime.
4. Store a secure representation in Redis.
5. Limit verification attempts.
6. Limit OTP resending.
7. Invalidate the previous OTP when a replacement is issued.
8. Prevent reuse after successful verification.
9. Bind the challenge to the appropriate authentication flow.
10. Delete or invalidate the challenge after success, expiry, or exhausting the attempt limit.

Use a keyed hash or another appropriate protection against offline guessing of a six-digit OTP.

## 15.3. Multi-Channel 2FA Delivery & Emergency Fallback

Dispatch OTP through the configured WhatsApp Cloud API or Twilio adapter.

**Resilience Rule:** To prevent administrative lockout in case of WhatsApp API outages or rate limits, implement a secondary fallback mechanism:

- Support **TOTP (Google Authenticator / Authy)** as a robust parallel or alternative authenticator.
- Provide secure, hashed **Emergency Recovery Codes** stored in the database for emergency admin access when messaging channels fail.

In development, provide a console fallback only when explicitly enabled.

Never log production OTP values.

## 15.4. Session management

After successful OTP verification:

- Create a cryptographically random session identifier.
- Rotate the authentication session.
- Set an HttpOnly cookie.
- Use Secure cookies in production.
- Apply an appropriate SameSite policy.
- Keep session state server-side.
- Define idle and absolute expiration.
- Invalidate sessions on logout.
- Support administrative session revocation.
- Protect sensitive state-changing actions against CSRF.

Use Redis or another suitable session store with explicit TTLs.

Do not treat a client-side role value as proof of authorization.

## 15.5. Future authentication options

Design the authentication module so that passkeys can be added without rewriting the entire administrative authorization system.

# 16. ADMINISTRATIVE AUTHORIZATION

Implement role-based access control.

Example roles:

- SUPER_ADMIN.
- ORDER_MANAGER.
- INVENTORY_MANAGER.
- CATALOG_MANAGER.
- FINANCE_MANAGER.

These roles are examples and should be configurable.

Use the principle of least privilege.

Possible permissions include:

- View orders.
- Update order status.
- Manage products.
- Manage promotions.
- Adjust inventory.
- Manage delivery zones.
- View payment records.
- Initiate eligible refunds.
- Manage administrative users.
- View audit logs.

Enforce permissions within server-side services, Server Actions, and Route Handlers.

Middleware may provide an additional routing layer but must not be the only security boundary.

Sensitive changes must require appropriate authorization and generate AuditLog entries.

Do not permit order status, payment status, or inventory changes through unrestricted generic update operations.

# 17. ADMIN DASHBOARD

Build a complete, responsive Arabic RTL dashboard.

## Overview

Display:

- Orders by status.
- Revenue from verified payment records.
- Recent orders.
- Low-stock products.
- Active promotions.
- Payment failures requiring investigation.
- Notification failures.
- Recent administrative activity.

Clearly distinguish gross order value, successfully collected payments, refunds, and net revenue.

Do not count pending or failed payments as collected revenue.

## Order management

Allow authorized staff to:

- Search orders.
- Filter by status, payment status, date, and fulfillment method.
- View order items.
- View shipping details.
- View payment attempts.
- Update permitted order states.
- Add internal notes.
- Review cancellation requests.
- Inspect relevant audit history.

Validate every state transition server-side.

## Product management

Support:

- Create.
- Edit.
- Archive.
- Manage images.
- Manage variants.
- Update prices.
- Configure low-stock thresholds.
- View inventory movements.

Require confirmation for destructive actions.

## Promotion management

Support:

- Creating and editing promotions.
- Scheduling.
- Activating and deactivating.
- Configuring promotion inventory.
- Previewing effective prices.
- Detecting conflicting promotions.

## Delivery management

Provide the delivery matrix editor described earlier.

## Audit logs

Record relevant actions, including:

- Price changes.
- Promotion changes.
- Inventory adjustments.
- Order status changes.
- Delivery pricing changes.
- Refund operations.
- Administrative user and permission changes.
- Authentication and session security events.

Do not store passwords, OTPs, session cookies, or payment secrets in audit records.

Audit records should be append-only from the application's normal administrative interface.

# 18. SECURITY HARDENING

Implement defense in depth.

## Input validation

Use Zod schemas for all untrusted server inputs.

Validate:

- Request bodies.
- Query parameters.
- Path parameters.
- Pagination.
- Sorting.
- Monetary values.
- Product quantities.
- Shipping selections.
- Payment references.
- Administrative changes.

Set appropriate request-size limits.

Return consistent, sanitized error responses.

## SQL injection

Use Prisma's safe query interfaces and parameterized queries.

Avoid dynamically concatenating untrusted strings into SQL.

Review every use of raw SQL.

## XSS

- Use React's normal escaping.
- Avoid unsafe HTML rendering.
- Sanitize rich HTML only when such functionality is genuinely required.
- Validate URLs and uploaded content.
- Implement an appropriate Content Security Policy.

## CSRF

For cookie-authenticated state-changing operations, implement appropriate CSRF defenses, including suitable SameSite cookies and Origin validation.

Use CSRF tokens where required by the selected authentication architecture.

## IDOR and authorization

Verify access to every requested resource.

A valid session does not automatically authorize access to every order, payment, guest token, or administrative record.

## SSRF

If the application fetches external URLs or processes remotely hosted images, restrict outbound destinations and prevent access to internal services and prohibited address ranges.

Avoid unnecessary server-side URL fetching.

## File uploads

If product images are uploaded:

- Validate file type and actual content.
- Enforce size limits.
- Generate safe storage names.
- Restrict permitted image formats.
- Prevent executable file uploads.
- Use a suitable object-storage service in production.
- Avoid exposing private upload credentials.
- Configure image optimization safely.

## Security headers

Configure appropriate headers, including:

- Content-Security-Policy.
- Strict-Transport-Security in HTTPS production environments.
- X-Content-Type-Options.
- Referrer-Policy.
- An appropriate frame-embedding policy.

Configure CSP carefully to support the chosen payment redirect and other required integrations.

## Secrets

Use server-side environment variables or a suitable secret manager.

Never expose secrets through:

- NEXT_PUBLIC\_ environment variables.
- Client Components.
- Browser responses.
- Public source maps.
- Error messages.
- Logs.
- Public repository files.

Add `.env.example` containing placeholder values only.

Ensure real `.env` files are excluded from version control.

# 19. PRODUCTION BUILD AND CODE PROTECTION

Configure the production build appropriately.

Requirements:

- Production minification.
- Dead-code elimination through the normal build pipeline.
- No publicly served browser source maps unless explicitly required and safely configured.
- `productionBrowserSourceMaps: false` where supported by the selected Next.js configuration.
- No secrets embedded in client bundles.
- No unnecessary debugging output.
- No production stack traces returned to customers.
- Dependency and vulnerability checks.
- Reproducible dependency installation through the package lockfile.

Do not treat minification, obfuscation, or hidden source code as a security boundary.

Security must rely on server-side authorization, proper secret handling, safe data access, and tested business rules.

# 20. PERFORMANCE AND RELIABILITY

Implement sensible production defaults.

## Database

- Index frequently filtered fields.
- Avoid N+1 queries.
- Use pagination.
- Use transactions appropriately.
- Avoid unnecessary full-table scans.
- Configure connection pooling according to the deployment platform.
- Document migration and rollback considerations.

## Caching

Use caching only when consistency requirements allow it.

Do not serve stale prices, stock availability, or payment states as authoritative checkout data.

Invalidate relevant cached product or promotion data when changes occur.

## External integrations

Use:

- Request timeouts.
- Controlled retries.
- Backoff.
- Circuit-breaking or equivalent protection where justified.
- Safe failure responses.

Avoid automatically retrying non-idempotent external operations without a reliable idempotency strategy.

## Background jobs

Use a durable queue or another suitable worker architecture for:

- Notifications.
- Expired inventory reservations.
- Payment reconciliation.
- Other asynchronous tasks.

Design jobs to tolerate duplicate execution.

Document how workers are started, monitored, and recovered after failure.

## Observability

Implement structured logging and suitable error monitoring.

Include:

- Request or correlation IDs.
- Payment reconciliation alerts.
- Database and Redis health checks.
- Background-worker health.
- Notification failure metrics.
- Error-rate monitoring.

Redact personal information and credentials from logs.

Provide an authenticated or appropriately restricted operational health endpoint without exposing infrastructure secrets.

# 21. PRIVACY AND BUSINESS POLICIES

Prepare the application for a legitimate commercial launch.

Include configurable pages for:

- Privacy Policy.
- Terms and Conditions.
- Shipping Policy.
- Return and Refund Policy.
- Contact Information.

Collect only information necessary for the service.

Define retention and deletion policies for personal information, guest access credentials, authentication records, and notification logs.

Apply appropriate access controls to customer phone numbers, addresses, and financial information.

Document the intended handling of applicable Egyptian legal and regulatory requirements and obtain qualified review before production launch.

Do not invent legal compliance certifications.

Do not collect or store payment card details directly unless a separately reviewed and compliant architecture explicitly requires it. Prefer Paymob-hosted checkout.

# 22. ERROR HANDLING AND CUSTOMER EXPERIENCE

Use consistent error handling.

Customer-facing messages must be written in clear Arabic.

Examples:

Unsupported delivery area: "التوصيل غير متاح لهذه المنطقة حالياً."

Expired or invalid order access: "تعذر الوصول إلى الطلب. يرجى التحقق من بيانات الوصول أو التواصل مع خدمة العملاء."

Payment processing: "جاري التحقق من حالة الدفع. يمكنك تحديث الصفحة بعد قليل."

Rate limit: "لقد تجاوزت الحد المسموح من المحاولات. يرجى المحاولة بعد انتهاء الوقت المحدد."

Do not expose internal exception messages, database details, credentials, provider secrets, or stack traces.

Differentiate validation errors, authorization failures, temporary service failures, and payment states.

Preserve the customer's ability to safely recover from network interruptions without creating duplicate orders or payments.

# 23. REQUIRED AUTOMATED TESTS

The following scenarios are mandatory.

## Product and pricing

- Standard pricing.
- Active and expired promotions.
- Promotion precedence.
- Conflicting promotions.
- Promotion inventory exhaustion.
- Invalid quantities.
- Price changes after an item enters the cart.
- Decimal and rounding correctness.

## Inventory

- Successful reservation.
- Expired reservation release.
- Cancellation release.
- Duplicate reservation processing.
- Concurrent attempts to purchase the final item.
- Payment success during a reservation race.
- Prevention of negative stock.

## Shipping

- Flat-rate governorate.
- District-specific pricing.
- Missing district.
- Inactive district.
- Unsupported governorate.
- Explicit fallback behavior.
- Pickup with zero shipping cost.
- Invalid branch.
- Shipping price changed after order creation.

## Guest order access

- Valid token.
- Invalid token.
- Expired or revoked token.
- Attempt to access another customer's order.
- Attempt to edit a paid or shipped order.
- Unauthorized cancellation.
- CSRF attempts.
- Token leakage prevention.

## Payment

- Valid Paymob webhook.
- Invalid HMAC.
- Missing signature.
- Incorrect amount.
- Incorrect currency.
- Wrong transaction-to-order association.
- Duplicate webhook.
- Out-of-order webhook.
- Delayed success notification.
- Failed payment.
- Retry after failure.
- Success redirect before webhook confirmation.
- Database failure during payment processing.
- Reconciliation of unresolved transactions.

## Authentication

- Valid credentials.
- Invalid credentials.
- OTP expiry.
- OTP replay.
- Excessive OTP attempts.
- Excessive OTP resend attempts.
- Session rotation.
- Session expiration.
- Session revocation.
- CSRF.
- Role and permission enforcement.
- Unauthorized direct API access.

## Notifications

- Successful email.
- Provider unavailable.
- Timeout.
- Retry behavior.
- Duplicate event processing.
- Disabled WhatsApp integration.
- Invalid provider configuration.
- Sensitive-data redaction.

## Administrative operations

- Unauthorized product update.
- Unauthorized price change.
- Unauthorized inventory adjustment.
- Invalid order transition.
- Audit log generation.
- Permission changes.
- Destructive-action safeguards.

Tests must run against real application services and suitable test infrastructure.

Do not use mocks as a substitute for all integration tests.

Mocks may be used for isolated unit tests, but payment, database, Redis, and concurrency behavior must also receive appropriate integration coverage.

# 24. END-TO-END ACCEPTANCE CRITERIA

The application is not complete until the following journeys work.

### Journey A: Product purchase

1. Customer visits the storefront.
2. Browses or searches products.
3. Views product details.
4. Adds products to the cart.
5. Enters shipping details.
6. Receives a server-calculated shipping quote.
7. Reviews the final amount.
8. Creates an order.
9. Completes payment through the configured Paymob flow.
10. Receives an accurate payment-status page.
11. Can contact the store through the WhatsApp click-to-chat button.

### Journey B: Pickup order

1. Customer selects pickup.
2. Selects an active branch.
3. Shipping is calculated as zero.
4. The server validates the branch.
5. The order preserves the selected branch.
6. The order follows the configured payment and fulfillment lifecycle.

### Journey C: Administrative login

1. Administrator submits credentials.
2. Server verifies the password.
3. Server creates an OTP challenge.
4. Configured provider sends the OTP.
5. Administrator verifies the OTP.
6. Server creates an authenticated session.
7. Protected administrative actions enforce permissions.

### Journey D: Order management

1. Authorized staff view an order.
2. Staff perform a permitted status transition.
3. The system records the change.
4. Customer-facing tracking reflects the authoritative status.
5. Relevant notifications are queued safely.

### Journey E: Payment failure and recovery

1. Customer initiates payment.
2. Payment fails or times out.
3. The system preserves the order and payment-attempt history.
4. Inventory is handled according to the reservation policy.
5. Customer can recover or retry when eligible.
6. Duplicate charges and duplicate fulfillment are prevented.

### Journey F: Concurrent inventory

1. Multiple customers attempt to purchase the final available unit.
2. The database safely resolves the competing requests.
3. At most one eligible reservation succeeds.
4. No negative inventory is recorded.
5. Losing requests receive a clear error.

# 24.1. REQUIRED PROJECT HANDOVER FILES

In addition to the deliverables below, maintain these files in the project root:

- `IMPLEMENTATION_STATUS.md`: phase-by-phase progress, implemented features, exact commands run, PASS/FAIL/BLOCKED/NOT RUN status, blockers, and next steps.
- `DECISIONS.md`: important architecture and business assumptions, chosen defaults, trade-offs, and any decisions needing owner confirmation.
- `.env.example`: variable names and safe placeholders only.
- `README.md`: quick-start commands, prerequisites, local development, migrations, tests, and troubleshooting.

Do not put credentials, real customer data, or secrets in these files.

# 25. DEPLOYMENT AND OPERATIONS

Provide production deployment instructions.

Include:

- Supported Node.js version.
- Installation commands.
- Environment-variable reference.
- Database creation and migration commands.
- Redis setup.
- Development seed instructions.
- Production build and start commands.
- Background-worker commands.
- Health checks.
- Database backup and restoration procedures.
- Logging and monitoring setup.
- Secret rotation procedures.
- Payment-provider configuration.
- Webhook URL configuration.
- HTTPS requirements.
- Rollback guidance.
- Incident-response basics.

Provide Docker and Docker Compose configuration for local development if appropriate.

Do not hardcode production credentials or include secrets in Docker images.

Use separate configurations for development, test, staging, and production.

Never automatically run destructive database resets in production.

Run migrations through an explicit deployment procedure.

Document required external accounts and provider-side setup.

# 26. REQUIRED DELIVERABLES

Produce the following actual project artifacts.

1. Complete Next.js application.
2. Prisma schema covering the implemented domain models.
3. Versioned database migrations.
4. Development seed script.
5. Arabic RTL storefront.
6. Product catalog and product detail pages.
7. Shopping cart and checkout.
8. Server-side pricing and promotion engine.
9. Inventory reservation and movement services.
10. Dynamic delivery matrix resolver.
11. Working administrative delivery editor.
12. Product, category, promotion, and inventory management.
13. Secure order lifecycle and guest order access.
14. Paymob payment-intent route.
15. Paymob webhook with provider-specific signature verification.
16. Payment attempt and reconciliation mechanisms.
17. Order success and failure pages.
18. Dynamic WhatsApp click-to-chat buttons.
19. NotificationService with email support and optional WhatsApp adapters.
20. WhatsApp OTP administrative authentication (with TOTP & recovery codes fallback).
21. Secure administrative session management.
22. Role-based authorization.
23. Audit logging.
24. Automated unit, integration, and end-to-end tests.
25. `.env.example` containing placeholders only.
26. README with setup and development instructions.
27. Production deployment documentation.
28. Security review checklist.
29. Backup and recovery documentation.
30. Final implementation status report.

Do not present a proposed file as an implemented feature unless the file exists and contains the required working implementation.

# 27. IMPLEMENTATION WORKFLOW

Work in the following order. Because this is a new project and the user wants a complete implementation, proceed autonomously through the phases without requesting approval after each one. Stop only for genuinely blocking decisions, unavailable external prerequisites, or actions that could destroy user data. Record all blockers and continue with independent work.

## Phase 1: New-project initialization and architecture

This is a brand-new project. Confirm the working directory, initialize the application from scratch, and identify any pre-existing unrelated files without overwriting them. Establish the project structure, package manager and lockfile, `.gitignore`, `.env.example`, `DECISIONS.md`, and `IMPLEMENTATION_STATUS.md`.

Identify environment constraints, dependencies, and configuration needs. Then produce:

- Architecture overview.
- Data model.
- Trust boundaries.
- Order/payment/inventory state machines.
- Environment-variable inventory.
- Implementation plan.

## Phase 2: Foundation

Set up:

- Next.js.
- TypeScript.
- Tailwind CSS.
- Prisma.
- PostgreSQL.
- Redis.
- Shared validation.
- Error handling.
- Logging.
- Test infrastructure.

Verify the application builds.

## Phase 3: Database and core domain services

Implement schema and migrations.

Implement product, pricing, shipping, inventory, and order services.

Test business invariants before building dependent features.

## Phase 4: Storefront

Implement the Arabic RTL storefront, product browsing, cart, and checkout.

Connect all data to the backend.

Do not use static sample data in production routes.

## Phase 5: Payment

Implement Paymob server-to-server integration, hosted checkout, webhooks, idempotency, and reconciliation.

Use sandbox credentials during development.

## Phase 6: Guest access and notifications

Implement guest order access, Click-to-Chat, email notifications, durable event handling, and optional WhatsApp integration.

## Phase 7: Administration

Implement authentication, OTP, sessions, permissions, audit logs, and management screens.

## Phase 8: Testing and hardening

Run unit, integration, concurrency, security, and end-to-end tests.

Resolve discovered defects before claiming completion. Record the exact command and actual outcome for every required check. Do not infer that a test passed merely because the code appears correct.

## Phase 9: Deployment readiness

Verify the production build, migrations, environment configuration, health checks, backups, and operational documentation.

Do not run destructive database commands against production. Verify migrations against a disposable/test database and a staging-like environment before production deployment.

## Phase 10: Release evidence and handover

Deliver a release report containing:

- Implemented features and their relevant files/routes.
- Commands run and actual results for lint, typecheck, tests, and build.
- Database migration status and rollback limitations.
- Paymob sandbox status and any unverified provider-side setup.
- Security tests completed and unresolved findings by severity.
- Backup restoration test date/result, or an explicit statement that restore has not been tested.
- Required environment variables by name only, never their values.
- Known limitations, blocked checks, and a clear release recommendation: READY, NOT READY, or BLOCKED.

A READY recommendation is allowed only when all mandatory release gates below pass.

# 28. SECURITY, FINANCIAL INTEGRITY & RELEASE GATES

This section adds mandatory acceptance criteria to the preceding requirements. It does not replace any earlier section.

## 28.1. Threat model and trust boundaries

Before implementation, document a lightweight threat model covering:

- Anonymous storefront visitors and guest checkout.
- Authenticated administrators and each role/permission boundary.
- Browser-to-server requests and cookie-authenticated actions.
- Paymob redirects, callbacks/webhooks, and provider API requests.
- PostgreSQL, Redis, object storage, background workers, and notification providers.
- Secrets, customer personal data, order references, guest access tokens, and audit logs.

For each high-impact threat, record the protected asset, attack path, mitigation, and test that demonstrates the mitigation. At minimum, consider IDOR/BOLA, privilege escalation, CSRF, XSS, SQL injection, SSRF where outbound URL fetching exists, brute force, replay, race conditions, webhook forgery, secret leakage, unsafe file upload, and denial-of-service through expensive endpoints.

## 28.2. Non-negotiable financial invariants

Implement these invariants in shared server-side domain services and enforce them with database transactions and constraints wherever possible:

1. The browser never determines the authoritative price, discount, shipping fee, tax, payment status, or stock availability.
2. `order.total` equals the documented sum of immutable order-item snapshots, discounts, taxes, and shipping charges using one documented rounding policy and currency precision.
3. Payment amount and currency must match the eligible order/payment attempt before payment can be accepted.
4. A provider transaction identifier cannot be applied to more than one payment record.
5. One successful provider transaction can cause no more than one paid-state transition and no more than one fulfillment trigger.
6. A duplicate callback or job execution must be safe and produce no duplicate financial or inventory effect.
7. Inventory cannot become negative. A reservation may be committed or released only once.
8. A failed or pending payment is never counted as collected revenue.
9. Cancellation and refund are separate workflows. Cancelling an order does not silently imply that a refund occurred.
10. Historical order and payment records remain auditable if product prices, promotion settings, or shipping rates later change.
11. Any manual price, stock, payment reconciliation, refund, or order-state override requires permission, a reason, and an audit event.
12. If a payment succeeds after its inventory reservation has expired or the order has been cancelled, do not silently fulfill or discard the payment. Move it to an explicit exception/reconciliation workflow and alert an authorized operator.

Create automated tests for every invariant, including concurrent and repeated execution.

## 28.3. Payment reconciliation and exception handling

Implement a reconciliation process for payment attempts that remain pending, time out, receive contradictory events, or cannot be persisted when the provider reports success.

- Persist enough non-secret provider identifiers and state to investigate an attempt safely.
- Query the provider's official API only where supported and according to the selected Paymob flow.
- Reconcile using idempotent state transitions.
- Never resolve ambiguity by assuming payment succeeded or failed.
- Create an operational alert or admin-visible exception when automatic reconciliation cannot reach a verified conclusion.
- Record who resolved a manual exception, when it was resolved, the evidence/reference used, and the resulting state.
- Define safe behavior for partial refunds and repeated refund requests if refunds are implemented.

## 28.4. File upload and image delivery acceptance

If product image uploads are implemented:

- Enforce maximum size and dimensions.
- Verify actual file content rather than trusting the extension or browser-supplied MIME type.
- Decode and re-encode supported raster images where appropriate; reject unsupported or malformed content.
- Generate server-controlled object keys and never use user-provided paths as storage paths.
- Prevent SVG/script execution risks unless SVG is explicitly sanitized with a reviewed approach.
- Keep storage credentials private and restrict upload permissions.
- Ensure deleting/replacing an image does not delete unrelated assets.
- Test invalid MIME types, polyglot files, oversized files, malformed images, and path traversal attempts.

## 28.5. Database migration and recovery acceptance

- Every schema change must have a versioned migration.
- Do not edit an already-applied migration as a substitute for creating a new migration.
- For production data changes, prefer a documented expand/migrate/contract approach when a direct migration could cause downtime or data loss.
- Review destructive schema operations and data backfills before running them.
- Verify that a fresh database can be created from migrations and seeded in development.
- Verify that an existing test/staging database can be upgraded from the previous schema.
- Document the backup frequency, retention, encryption/access controls, and recovery-point/recovery-time objectives selected for the deployment.
- Perform a restore test in a non-production environment and record the result. A backup that has never been restored is not proven recoverable.
- Never print production database credentials or customer records in migration/debug output.

## 28.6. Security test matrix

In addition to the earlier tests, implement and run applicable tests for:

- Customer A cannot read, update, cancel, or infer private data about Customer B's order.
- A customer cannot invoke admin APIs by bypassing the UI.
- Each role is denied every action outside its permission set.
- Cookie-authenticated state-changing requests reject invalid Origin/CSRF conditions according to the selected design.
- Login, OTP, resend, guest order creation, payment-intent creation, and expensive search endpoints enforce server-side rate limits.
- Invalid, expired, replayed, duplicate, out-of-order, wrong-amount, wrong-currency, and wrong-order payment callbacks are rejected or safely quarantined.
- Two simultaneous requests cannot consume the same stock or promotion allocation.
- Repeated cancel/refund/retry actions do not double-release inventory or duplicate a refund.
- Logs and customer-facing errors do not expose secrets, session values, OTPs, guest tokens, stack traces, or unnecessary personal data.
- Production build output contains no server credentials or privileged modules in client bundles.
- Uploaded files cannot execute as application code and cannot escape their designated storage area.

Use test accounts and synthetic data. Never run destructive security tests against production customer data.

## 28.7. CI and release gates

Configure CI, where repository infrastructure supports it, to run at least:

1. Dependency installation using the lockfile.
2. Formatting/lint checks.
3. TypeScript type checking.
4. Unit tests.
5. Integration tests against test PostgreSQL and Redis.
6. Migration validation against a clean database.
7. Production build.
8. Security/dependency audit using an appropriate maintained tool.
9. End-to-end smoke tests for storefront, checkout, admin login, and order management.

Release gate status must be explicit:

- PASS: command executed and all required assertions passed.
- FAIL: command executed and one or more assertions failed.
- BLOCKED: required credentials, services, infrastructure, or permissions were unavailable.
- NOT RUN: the check was not executed.

Do not convert BLOCKED or NOT RUN into PASS. Do not claim a third-party payment integration is production-verified based only on unit tests; use the provider sandbox and clearly state any merchant-account configuration that still requires owner action.

## 28.8. Definition of done

A feature is done only when all applicable conditions are satisfied:

- The UI is connected to real server-side behavior and persistent storage.
- Input validation, authorization, and failure handling are implemented server-side.
- Loading, empty, success, error, and retry states are handled in Arabic.
- Relevant unit/integration/e2e tests exist and were run, or their blocked status is reported.
- Accessibility and responsive behavior have been checked for the affected interface.
- Logs and audit records follow data-minimization rules.
- Documentation and environment-variable examples are updated.
- No unrelated working behavior was silently removed.

## 28.9. Final report format

At the end of implementation, provide a concise but evidence-based report:

1. **Implemented:** feature and file/route references.
2. **Verification:** each command, PASS/FAIL/BLOCKED/NOT RUN, and relevant output summary.
3. **Security:** findings by severity and remediation status.
4. **Financial correctness:** invariant tests and reconciliation status.
5. **Integrations:** sandbox/production configuration status, without exposing credentials.
6. **Operations:** migrations, backups, restore test, monitoring, and deployment status.
7. **Outstanding work:** exact blockers and owner actions required.
8. **Release recommendation:** READY / NOT READY / BLOCKED with reasons.

Never declare the platform fully secure, legally compliant, or production-ready based solely on generated code or a successful build. Those claims require the corresponding verification evidence and, where necessary, qualified human review.


# 29. CLAUDE CODE FIRST-RUN INSTRUCTIONS

Start by confirming the current working directory and available Node.js/package-manager/Docker versions. Then implement the project in place. Do not respond with a plan only.

The first execution should: initialize the application, install compatible dependencies, create the project documentation/status files, and establish the basic app shell. Then continue through the remaining phases in order. Use the package manager's lockfile consistently. Do not use destructive database reset commands against any non-disposable database.

When the user must perform an external setup action, give exact steps and the required environment-variable names, but never ask them to paste secret values into the chat. Use clearly marked sandbox/development configuration until real provider credentials are added by the owner.

At each stopping point, leave the project runnable to the extent possible, with no knowingly broken imports or half-written files. If unable to finish the full specification in one session, explicitly say so and identify the next exact command or task to resume; never describe partial completion as a complete production-ready store.
