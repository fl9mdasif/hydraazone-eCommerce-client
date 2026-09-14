<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HydraaZone Client, Build Guide (SOP + PRD)

This is the single working document for the `client/` frontend of **www.hydraazone.com**. It is both the PRD (what to build and why) and the SOP (how we work, phase by phase). The server is already finished and its contract below was read directly out of `server/src`, not assumed. The companion server doc is `../claude.md`.

> **Status: client folder is empty. This is a fresh Next.js build.**
> The server is feature complete (auth, products, categories, cart, orders, wishlist, reviews, settings, uploads, sitemap, security) and only needs a real `DATABASE_URL` and real S3 credentials before go live.

---

## 0. How we work (read this before writing any code)

These rules are not suggestions. They exist because this is a paid client project going to production.

1. **One page per phase. Finish it, then push, then move on.** Never start the next page while the current one is unfinished. "Finished" means the Definition of Done in section 8 is met, not "the UI renders".
2. **Do not invent the visual design.** Asif provides the UI direction and dashboard style. Until he does, use the neutral placeholder tokens in `src/styles/tokens.css` and never hardcode a color, font, radius or shadow inside a component. When the real design arrives, only the token file changes.
3. **Motion is the product differentiator here.** Every interactive component gets a deliberate, branded micro interaction, not a generic fade in. Section 5 defines the system. Motion is designed once as tokens and primitives, then reused, never improvised per component.
4. **Production code only.** No mock data, no `TODO` left behind, no commented out blocks, no `any` used to silence TypeScript, no placeholder Lorem Ipsum shipped to a branch. If something cannot be finished, stop and raise it, do not fake it.
5. **The server contract in section 3 is fixed.** Do not invent an endpoint, a query parameter or a response field. If the UI needs data the API does not return, that is a server change to raise with Asif, not something to paper over on the client.
6. **Ask before adding a dependency.** Every package added to a client bundle costs load time. The approved list is in section 2.
7. **Never commit secrets.** Only `NEXT_PUBLIC_*` values belong in client env. The Meta Conversions API token lives on the server and is deliberately not returned by the public settings endpoint.

---

## 1. What we are building

A production e commerce storefront for HydraaZone, COD only, Bangladesh market, with a customer facing store, a customer account area, and an admin dashboard. One Next.js app, three surfaces:

| Surface | Auth | Who |
|---|---|---|
| Storefront | public | anyone, including anonymous shoppers |
| Account area | logged in | role `user` |
| Admin dashboard | logged in | roles `admin`, `superAdmin` |

Guests must be able to complete a full purchase without ever creating an account first. That is the single most important commercial requirement, because most Bangladeshi f commerce buyers abandon at signup.

---

## 2. Stack and project conventions

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion. State: Zustand for client state (cart, wishlist, auth token, UI). Data fetching: Next.js server components and `fetch` for public catalog pages (SEO), a typed client for authenticated calls.

**Approved dependencies:** `next`, `react`, `typescript`, `tailwindcss`, `framer-motion`, `zustand`, `zod` (for parsing API responses at the boundary), `clsx`, `lucide-react` (icons), `sonner` or equivalent for toasts. Anything else needs a yes from Asif first.

**Folder structure:**

```
src/
  app/                    # routes only, thin files
    (store)/              # public storefront group
    (account)/            # logged in customer group
    (admin)/              # admin dashboard group
  components/
    ui/                   # primitives: Button, Input, Modal, Drawer
    motion/               # motion primitives, see section 5
    store/                # ProductCard, VariantPicker, CartLine
    admin/                # tables, stat cards
  lib/
    api/                  # one file per server module, mirrors the API
    hooks/
    utils/
  stores/                 # zustand stores
  styles/tokens.css       # the ONLY place colors/fonts/radii/shadows live
  types/                  # shared types mirroring server models
```

**Rules:**
- One file per server module in `lib/api/` (`auth.ts`, `products.ts`, `categories.ts`, `cart.ts`, `orders.ts`, `wishlist.ts`, `reviews.ts`, `settings.ts`, `uploads.ts`) so the client structure is legible against `server/src/app/modules/`.
- Server components by default. `"use client"` only on the leaf component that actually needs interactivity or motion, never on a whole page.
- Every API response is parsed at the boundary. The server envelope is not trusted blindly into React state.
- Catalog pages (home, category, product) are server rendered for SEO. Cart, checkout, account and admin are client rendered.

**Environment variables:**

```
NEXT_PUBLIC_API_URL=https://api.hydraazone.com     # no trailing slash, /api/v1 is appended in the client
NEXT_PUBLIC_SITE_URL=https://www.hydraazone.com
```

---

## 3. The server contract (verified against `server/src`)

Base path: `NEXT_PUBLIC_API_URL` + `/api/v1`. The sitemap is the one exception, it is served at the API root, not under `/api/v1`.

### 3.1 Response envelope

Success (single item):
```json
{ "success": true, "statusCode": 200, "message": "...", "data": { } }
```

Success (list endpoints, adds meta):
```json
{ "success": true, "statusCode": 200, "message": "...", "meta": { "page": 1, "limit": 12, "total": 57 }, "data": [ ] }
```

Error:
```json
{ "success": false, "message": "...", "errorMessage": "...", "errorDetails": { }, "stack": null }
```

Show `message` to the user. Never render `errorDetails` or `stack`.

### 3.2 Auth, and the three things that will waste your day if you miss them

**A. The Authorization header takes the raw token with NO `Bearer ` prefix.**
`server/src/app/middlewares/auth.ts` does `jwt.verify(req.headers.authorization, ...)` directly. Sending `Bearer <token>` fails every protected request. Send the token string by itself.

**B. Cookies are set by the server but are NOT used for authorization.**
Login and guest checkout set httpOnly `accessToken` and `refreshToken` cookies, but the auth middleware only reads the `Authorization` header. So the client must keep the `accessToken` returned in the response body and attach it to every protected call itself. The cookies matter for exactly one thing: `POST /auth/refresh-token` reads the `refreshToken` cookie, so that call needs `credentials: 'include'`.

**C. Cookies are `sameSite: 'lax'` with no domain attribute, and CORS allows only three origins.**
`allowedOrigins` is `http://localhost:3000`, `https://hydraazone.com`, `https://www.hydraazone.com`. A `*.vercel.app` preview deployment will be blocked by CORS, and the refresh cookie will not be sent from it because it is cross site. Production frontend must be served from `hydraazone.com` / `www.hydraazone.com`. Raise it with Asif before the first deploy, not after.

| Method | Path | Auth | Body / notes |
|---|---|---|---|
| POST | `/auth/register` | public | `{ username, email, password (6-30), contactNumber, profilePicture?, address? }` |
| POST | `/auth/login` | public | `{ email, password }` returns `{ user, accessToken }` |
| POST | `/auth/logout` | public | clears cookies |
| POST | `/auth/refresh-token` | cookie | needs `credentials: 'include'` |
| POST | `/auth/change-password` | any role | `{ oldPassword, newPassword }` |
| POST | `/auth/guest-checkout` | public | `{ email, fullName, phone }` |

**Guest checkout behavior, build the UI around this:** a brand new email silently creates an account with password `123456` and returns a token. An email that already exists returns **409**, it does not return a token. The checkout UI must catch that 409 and show an inline login form on the same screen, not a full page redirect that loses the cart. After a guest order succeeds, prompt the customer to set a real password, since `123456` is a known default.

Rate limits to handle: auth routes 20 requests / 15 min, `POST /orders` 30 / 15 min. On 429 show the server `message`, do not retry automatically.

### 3.3 Catalog

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/products` | public | `?search &category &status &isFeatured &minPrice &maxPrice &sort &page &limit` (limit default 12, sort default `-createdAt`) |
| GET | `/products/:productIdOrSlug` | public | accepts ObjectId **or slug**, use slugs in URLs |
| GET | `/categories` | public | |
| GET | `/categories/:categoryIdOrSlug` | public | |

**`GET /products` does not filter by status on its own.** Every storefront call must pass `status=active` or draft and archived products will appear in the shop. Only admin listings may omit it.

**Product shape:** `name, slug, description, category (populated as {name, slug}), tags[], thumbnail, gallery[], variants[], rating, reviewCount, status ('active'|'draft'|'archived'), isFeatured, metaTitle, metaDescription`.

**Variant shape:** `_id, name, sku, price, discountPrice?, stock, weight?, images[], isAvailable, attributes (key/value map)`.

Price and stock live on the **variant**, never on the product. A product card shows a price range or the default variant price, and stock state is per variant. `discountPrice` present means show it as the live price with `price` struck through.

### 3.4 Cart (server cart is for logged in users only)

Routes are mounted at **`/carts`**, not `/cart`, and all of them require auth. There is no guest cart on the server.

| Method | Path | Notes |
|---|---|---|
| GET | `/carts` | current user's cart |
| POST | `/carts` | add item |
| PATCH | `/carts/:productId/:variantId` | change quantity |
| DELETE | `/carts/:productId/:variantId` | remove one line |
| DELETE | `/carts` | clear |

Cart item shape: `{ product, variantId, quantity }`.

**Design consequence:** the guest cart lives in a Zustand store persisted to `localStorage`. On login or successful guest checkout, merge the local cart into the server cart, then treat the server as the source of truth. This merge is a real piece of work, budget for it in Phase 4.

### 3.5 Orders

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/orders` | user | place order |
| GET | `/orders/my-orders` | user | own orders |
| GET | `/orders/:orderId` | owner or admin | |
| PATCH | `/orders/:orderId/cancel` | **role `user` only** | an admin account cannot use this route |
| GET | `/orders` | admin | all orders, paginated, filter by status |
| PATCH | `/orders/:orderId/status` | admin | `{ status, note? }` |
| PATCH | `/orders/:orderId/payment-status` | admin | `{ paymentStatus, transactionId? }` |
| GET | `/orders/analytics/sales` | admin | time series for charts |
| GET | `/orders/analytics/dashboard` | admin | totals, pending count, delivered revenue, low stock variants |

`POST /orders` body:
```ts
{
  items: [{ productId: string, variantId: string, quantity: number }],  // at least 1
  shippingAddress: {
    fullName, phone, address, city, district,
    postalCode?, country?   // country defaults to "Bangladesh"
  },
  paymentMethod: 'cod',           // enum also allows bkash|nagad|card|bank, we only ship cod
  discount?: number,
  note?: string
}
```

**The server takes `items` from the request body, not from the saved cart, and then clears the cart unconditionally.** So checkout must submit exactly the current cart contents. Do not submit a subset, and do not let the user edit quantities on a confirmation screen after the payload has been built.

Order statuses: `pending, confirmed, processing, shipped, delivered, cancelled, returned`. Payment statuses: `pending, paid, failed, refunded`.

### 3.6 Shipping totals

Defaults live in `server/src/app/modules/order/const.order.ts`: flat **60 BDT**, free above a **10000 BDT** subtotal. An admin can override both through settings (`shippingRate`, `freeShippingThreshold`). The client reads those from `GET /settings` and falls back to 60 / 10000 when unset, purely to display an estimate. The server recomputes the real total at order time and its number wins. Never show a total the server did not confirm on the success screen.

### 3.7 Wishlist, reviews, uploads, settings

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET / POST | `/wishlist` | user | POST body `{ productId }`, idempotent |
| DELETE | `/wishlist/:productId` | user | |
| GET | `/reviews/product/:productId` | public | approved reviews only |
| POST | `/reviews` | user | see below |
| GET | `/reviews` | admin | `?status=pending` for the moderation queue |
| PATCH | `/reviews/:reviewId/status` | admin | `{ status: 'pending'\|'approved'\|'rejected' }` |
| POST | `/uploads/generate-upload-url` | any role | `{ filename, contentType }` returns `{ uploadUrl, fileUrl }` |
| GET | `/settings` | public | marketing IDs + shipping values |
| PATCH | `/settings` | admin | |

Review submission body: `{ productId, orderId, variantId, rating (1-5 int), comment? (max 2000), photos? (max 6 URLs) }`. The server rejects it unless the order belongs to the caller, the order is `delivered`, and that product/variant is actually in it. One review per order item. New reviews are `pending`, so after submitting, tell the user it is awaiting approval instead of optimistically rendering it.

Photo upload flow: call `/uploads/generate-upload-url`, `PUT` the file straight to `uploadUrl`, then send the returned `fileUrl` in `photos`. Wishlist is also auth only, so a guest wishlist is local storage until login.

`GET /settings` returns only: `fbPixelId, gaId, gtmId, searchConsoleTag, whatsappNumber, messengerPageId, shippingRate, freeShippingThreshold`. The Conversions API token is intentionally withheld.

### 3.8 Two integration decisions to settle with Asif before Phase 10

1. **Meta Pixel double counting.** The server already fires a server side Conversions API `Purchase` event inside `placeOrder`. If the browser Pixel also fires `Purchase` without a shared `event_id`, every sale is counted twice and the ad data becomes unusable. Either the browser does not fire Purchase, or the server starts sending a matching `event_id`. This is a server change, so decide it early.
2. **Sitemap host.** `GET /sitemap.xml` is served by the API, so it sits on the API host while the pages sit on `www.hydraazone.com`. Add a Next.js rewrite so `https://www.hydraazone.com/sitemap.xml` proxies to the API route, and point `robots.txt` at the site URL, not the API URL.

---

## 4. Design and styling

Asif provides the storefront and dashboard direction. Until then:

- All visual values live in `src/styles/tokens.css` as CSS custom properties: color, typography scale, spacing, radius, shadow, and the motion tokens from section 5. Components consume tokens only.
- Tailwind is configured to read those tokens, so a component never contains a raw hex value or a magic pixel number.
- Build light theme first and keep the token structure ready for dark, do not build two themes before the direction is confirmed.
- Storefront and admin share primitives but not personality. The store can be expressive, the dashboard stays dense, quiet and fast.
- Currency is BDT, formatted consistently through one `formatCurrency` helper. Dates through one `formatDate` helper.
- Mobile first. Test at 360px, 390px, 768px, 1024px and 1440px. Most HydraaZone traffic will be Android phones on mobile data.

---

## 5. Motion system (the signature)

The brief is that HydraaZone components feel distinctly ours, not a template. That only works if motion is a system. Improvised animation per component reads as noise.

**Tokens** (in `tokens.css`, referenced by every animation):

```
--dur-instant: 120ms     --ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--dur-fast:    200ms     --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)
--dur-base:    320ms     --ease-spring: spring, stiffness 260, damping 24
--dur-slow:    520ms     --lift:        translateY(-4px)
```

**Primitives** in `components/motion/`, built once and reused: `<Reveal>` (viewport entrance), `<Stagger>` (list children, 40 to 60ms apart), `<PageTransition>`, `<Magnetic>` (subtle pointer attraction for primary CTAs), `<CountUp>` (dashboard numbers).

**Signature interactions**, one per key surface:

| Surface | The moment |
|---|---|
| Product card | image cross fades to the second gallery shot, variant swatches slide up from the bottom edge, card lifts |
| Add to cart | the button morphs into a checkmark, the cart icon receives a weight bump, the drawer springs open |
| Variant picker | the selected pill animates its background between options, price and stock numbers roll rather than swap |
| Cart line removal | line collapses its own height while fading, the total counts to its new value |
| Checkout steps | horizontal slide between steps, the progress bar fills continuously |
| Order placed | a single celebratory checkmark draw in, then the order summary staggers in beneath it |
| Admin dashboard | stat cards count up on mount, table rows stagger in once per navigation, never on every refetch |

**Hard rules, these protect production performance:**

1. Animate `transform` and `opacity` only. Never animate `width`, `height`, `top`, `left` or anything that triggers layout.
2. Cumulative Layout Shift from animation must be zero. Reserve space before animating into it.
3. Respect `prefers-reduced-motion`. One shared hook, and every primitive checks it. Reduced motion means an instant state change, not a broken UI.
4. Never animate the LCP element in a way that delays its paint. The hero image appears, it does not fade in over 500ms.
5. Use `LazyMotion` with `domAnimation` so the Framer Motion bundle stays small, and keep `"use client"` on the animated leaf, not the page.
6. UI feedback stays in the 120 to 320ms range. Only a deliberate hero or success moment may exceed 500ms. Nothing blocks input while animating.
7. If an animation cannot hold 60fps on a mid range Android phone, it is cut. Verify with the browser performance panel, not by eye on a desktop.

---

## 6. Phases (one per push)

Each phase is one branch, one Definition of Done, one push. The order is dependency driven, each phase is usable by the next.

### Phase 0, Foundation
Next.js app scaffolded, Tailwind and tokens wired, `lib/api/` client with the envelope parser, the raw token Authorization header, 401 and 429 handling, refresh flow, Zustand stores (auth, cart, wishlist, UI), motion primitives from section 5, header, footer, layout shells for the three route groups, error and loading and not found states, `formatCurrency` and `formatDate`.
**Done when:** a real call to `GET /products?status=active&limit=1` renders live data on a scratch page, and a protected call succeeds with a real token.

### Phase 1, Homepage
Hero, featured products (`?isFeatured=true&status=active`), category grid from `/categories`, new arrivals, trust and how to buy section, WhatsApp and Messenger floating buttons driven by `/settings`, full footer. Server rendered with metadata.
**Done when:** it renders entirely from live API data, passes the DoD, and scores well on a mobile Lighthouse run.

### Phase 2, Shop and category listing
`/shop` and `/category/[slug]`. Product grid with pagination, search, category filter, price range, sort. Filters reflected in the URL so a filtered view is shareable. Skeletons, empty state, error state.

### Phase 3, Product detail
`/product/[slug]`. Gallery with zoom, variant picker driving price, stock, SKU and variant images, quantity selector bounded by variant stock, add to cart, add to wishlist, description, approved reviews with rating summary, related products. Per product metadata from `metaTitle` and `metaDescription`, plus Product JSON-LD.

### Phase 4, Cart
Cart drawer and `/cart` page. Quantity changes, line removal, subtotal, estimated shipping from `/settings`, free shipping progress indicator, empty state. Local guest cart persisted, and the merge into the server cart on login. Stock revalidated against the API before checkout is allowed.

### Phase 5, Checkout and order success
`/checkout`. Shipping address form matching the server schema exactly, saved address picker for logged in users, COD as the only payment method, order note, order summary, guest checkout with the inline 409 to login fallback, then `/order/[orderNumber]` success with the server confirmed totals and the set a real password prompt for new guest accounts.

### Phase 6, Auth pages
`/login`, `/register`, logout. Post login redirect back to where the user was. Password rules matching the server (6 to 30 characters). Friendly handling of the 429 rate limit.

### Phase 7, Account area
`/account` with profile, change password, order history from `/orders/my-orders`, order detail with the status timeline from `statusHistory`, cancel order (role `user` only), saved addresses CRUD with a default, wishlist page.

### Phase 8, Review submission
Write a review from a delivered order item, star rating, comment, up to 6 photos through the pre signed upload flow, the awaiting approval state, and hiding the control on items already reviewed via `isReviewed`.

### Phase 9, Admin dashboard
Summary cards from `/orders/analytics/dashboard`, sales chart from `/orders/analytics/sales`, order management with status and payment status updates, product CRUD including variants and image upload, category CRUD, review moderation queue, user management for superAdmin, settings form. Role gated in the UI, with the server as the real boundary.

### Phase 10, Marketing and SEO
Pixel, GA and GTM injected from `/settings` (not hardcoded), Search Console tag, the Purchase event decision from 3.8, the sitemap rewrite, `robots.txt`, canonical URLs, Open Graph and Twitter cards, Organization and Breadcrumb JSON-LD.

### Phase 11, Production hardening and go live
Lighthouse pass on mobile, image optimization audit, bundle analysis, 404 and 500 pages, the real domain deployed (see the CORS constraint in 3.2), full smoke test as a real customer, then handover notes for the client.

---

## 7. Per phase workflow

1. Re read this file and the specific phase.
2. Branch: `feat/phase-<n>-<name>`.
3. Build. Wire to real endpoints from the first commit, never to mock data.
4. Test by hand in the browser, on desktop and a real phone viewport, as a guest and as a logged in user.
5. Run `npm run lint` and `npm run build`. Both must be clean. A build warning is not acceptable as a known issue.
6. Walk the Definition of Done in section 8 line by line.
7. Commit and push. Commit style: `feat(homepage): hero, featured products, category grid`.
8. Report to Asif what shipped and what is still open, then wait for the go ahead before starting the next phase.

---

## 8. Definition of Done (every phase)

- [ ] Wired to real API endpoints, no mock data anywhere in the branch
- [ ] Loading, empty and error states all handled, an empty product list says so rather than rendering a blank grid
- [ ] Motion follows section 5, including `prefers-reduced-motion`, and holds 60fps
- [ ] Responsive and verified at 360, 390, 768, 1024 and 1440px
- [ ] Keyboard reachable, visible focus states, images have alt text, forms have labels
- [ ] `npm run lint` and `npm run build` both clean, no `any` added to silence an error
- [ ] No console errors or warnings in the browser
- [ ] Nothing previously shipped is broken, re test the prior phase's main flow
- [ ] Server rendered pages have correct metadata and canonical URLs
- [ ] No secret, token or hardcoded API URL committed

---

## 9. Out of scope for this build

Online payment gateways (bkash, Nagad, card, the enum exists on the server but only COD ships), multi vendor or marketplace features, multi language or i18n, coupon and promo code engine, loyalty points, live chat beyond the WhatsApp and Messenger buttons, push notifications, native mobile apps, inventory management beyond per variant stock, multi warehouse, courier API integration. If the client asks for any of these, it is a new scope conversation, not a quiet addition.

---

## 10. Open items needing Asif's input

1. Storefront visual direction: palette, typography, logo, imagery style.
2. Admin dashboard visual direction.
3. The real product catalog, categories and photography, to replace whatever seed data is used during the build.
4. Production frontend hosting, which must serve from `hydraazone.com` or `www.hydraazone.com` because of the CORS allowlist and the cookie policy in 3.2.
5. The Meta Purchase event decision from 3.8, since it needs a server change if the browser Pixel is to fire.
6. Whether guest accounts created with password `123456` should be forced to change it on first login, or only prompted.
