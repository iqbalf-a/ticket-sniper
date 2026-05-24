# tiket.com VIP Ultimate Ticket Checkout - API Flow Analysis

> **Scope otomasi:** Hanya sampai halaman order/checkout terbuka. Pengisian form data diri dan pembayaran tetap dilakukan manual.

**Event:** The Weeknd After Hours Til Dawn Tour - General On-Sale Day 2  
**Venue:** Jakarta International Stadium (JIS), Papanggo, North Jakarta City  
**Date:** September 27, 2026  
**Analysis Date:** 2026-05-24  
**HAR Files Analyzed:**
1. `1-tiketcom-click-buyticket.har` — Product page / packages page load (331 entries)
2. `2-tiketcom-click-select-dropdown-vipultimatepackage.har` — Package dropdown selection (19 entries, all analytics/tracking only)
3. `3-tiketcom-after-select-vipultimate-then-add-quantity-book.har` — After selecting VIP Ultimate + quantity + clicking Book (31 entries)

---

## Key IDs and Constants

| Field | Value |
|-------|-------|
| **Product ID** | `6a0334c674968825eb962e22` |
| **Product URL Slug** | `theweekndinjakarta-generalonsaleday2` |
| **Partner ID** | `6a02fc9474968825eb962c7a` |
| **Event Date (epoch ms)** | `1790528399000` (= 2026-09-27 16:59:59 UTC) |
| **Device ID (session)** | `e1d8ee2a-17d9-4085-aa42-cee1c139c5b9` |
| **Session ID** | `6a0fb42bccd518000e25a2c1` |
| **VIP Ultimate Package Code** | `2` |
| **Next.js Build ID** | `to-do__79ac2a4dadcae07fff3ca12cfcf84f33c12ce121` |
| **Auth State** | Guest (unauthenticated) — `isLogin: false`, `accessToken: null` |

---

## Package Catalog (productId: 6a0334c674968825eb962e22)

Available packages on date 2026-09-27 (`packageCodes` from `availablePackages` API):

| Code | Name | Price (IDR) | Admin Fee (IDR) | Total/ticket |
|------|------|-------------|-----------------|--------------|
| **2** | **ULTIMATE VIP PACKAGE** | **14,732,000** | **515,620** | **15,247,620** |
| 3 | GOLD VIP PACKAGE | 10,092,000 | 353,220 | 10,445,220 |
| 4 | EARLY ENTRY PACKAGE | 7,540,000 | 263,900 | 7,803,900 |
| 1 | FESTIVAL | 3,364,000 | 117,740 | 3,481,740 |
| 5 | CAT 1A (NUMBERED SEATING) | 6,380,000 | 223,300 | 6,603,300 |
| 6 | CAT 1B (NUMBERED SEATING) | 6,380,000 | 223,300 | 6,603,300 |
| 7 | CAT 1C (NUMBERED SEATING) | 6,380,000 | 223,300 | 6,603,300 |
| 8 | CAT 2 (NUMBERED SEATING) | 4,060,000 | 142,100 | 4,202,100 |
| 9 | CAT 3 (NUMBERED SEATING) | 3,190,000 | 111,650 | 3,301,650 |
| 10 | CAT 4A (NUMBERED SEATING) | 1,914,000 | 66,990 | 1,980,990 |
| 12 | CAT 5 (NUMBERED SEATING) | 1,682,000 | 58,870 | 1,740,870 |
| 18 | CAT 5 (NUMBERED SEATING) | 1,682,000 | 58,870 | 1,740,870 |

> **Note:** Packages 11, 13, 14, 15, 16, 17 exist in product data but are NOT in the `availablePackages` list for 2026-09-27, meaning they are not available on that date.

---

## VIP Ultimate Package Details (Code 2)

```json
{
  "code": "2",
  "name": "ULTIMATE VIP PACKAGE",
  "availability": 9999,
  "minPax": 1,
  "maxPax": 6,
  "seatType": "NO_SEATING",
  "quotaType": "NUMBER",
  "isLoginRequired": false,
  "isRefundable": false,
  "displayRefundTier": "NON_REFUND",
  "enableQueueNumber": false,
  "blockedTimeInSeconds": 1500,
  "saleStartDate": "2026-05-21 07:00:00",
  "saleEndDate": "2026-09-26 07:00:00",
  "productPackageStatus": "ACTIVE",
  "priceTier": {
    "code": "ALL",
    "finalPrice": 14732000,
    "additionalFees": [{"type": "ADMIN_FEE", "amount": 515620}]
  }
}
```

**VIP Package inclusions:**
- 1 (one) CAT 1 ticket (Numbered Seating)
- Unprecedented stage access for a photo opportunity with The Weeknd's stage by professional photographer*
- Limited edition The Weeknd gift item
- VIP laminate and lanyard
- Exclusive VIP only wristband
- Priority merchandise shopping (if applicable)

---

## Checkout Form Fields (Smart Profile Questionnaires)

Required per-ticket guest info for order form:

| Code | Input Type | Label |
|------|-----------|-------|
| `SALUTATION_SMART_PROFILE` | `SALUTATION` | Title (Mr/Mrs/etc) |
| `FIRST_NAME_SMART_PROFILE` | `STRING` | First Name |
| `LAST_NAME_SMART_PROFILE` | `STRING` | Last Name |
| `PHONE_NUMBER_SMART_PROFILE` | `PHONE` | Phone Number |
| `EMAIL_SMART_PROFILE` | `STRING` | Email |
| `ID_NUMBER_SMART_PROFILE` | `STRING` | Identity Card Number (KTP/Passport) |

---

## Full API Flow (Chronological)

### STEP 1 — File 1 — Load Product Detail Page

**GET** `https://www.tiket.com/ms-gateway/tix-events-v2-inventory/v1/products/url/theweekndinjakarta-generalonsaleday2`  
Status: 200

**Purpose:** Fetch all product data including all packages with names, prices, questionnaires, availability.

**Required Headers:**
```
language: EN
lang: en
X-Platform-V2: WEB
X-Channel-Id-V2: WEB
X-Currency: IDR
X-Country-Code: id
X-Country-Id: id
X-Audience: tiket.com
X-Cookie-Session-V2: true
storeId: TIKETCOM
deviceId: e1d8ee2a-17d9-4085-aa42-cee1c139c5b9
countryCode: id
currency: IDR
channelId: WEB
serviceId: GATEWAY
Referer: https://www.tiket.com/en-id/to-do/theweekndinjakarta-generalonsaleday2/packages
```

**Key Response Fields:**
```json
{
  "code": "SUCCESS",
  "data": {
    "id": "6a0334c674968825eb962e22",
    "availabilityStatus": "BOOKABLE",
    "isEnableCaptcha": true,
    "isLoginRequired": false,
    "packages": [ ... 18 packages with codes 1-18 ... ]
  }
}
```

---

### STEP 2 — File 1 — Fetch Available Packages by Date Range

**GET** `https://www.tiket.com/ms-gateway/tix-events-v2-inventory/v1/productSchedules/availablePackages?productId=6a0334c674968825eb962e22&dateTimeFrom=2026-08-31+17%3A00%3A00&dateTimeTo=2026-11-01+17%3A00%3A00`  
Status: 200

**Purpose:** Determine which packages are available on which dates (for the calendar/date picker).

**Response:**
```json
{
  "code": "SUCCESS",
  "data": [
    {
      "date": "2026-09-27",
      "packageCodes": ["1", "12", "2", "3", "4", "5", "6", "7", "18", "8", "9", "10"]
    }
  ],
  "serverTime": "2026-05-24T02:32:08.707+00:00"
}
```

> VIP Ultimate (code `2`) IS available on 2026-09-27.

---

### STEP 3 — File 1 — Fetch Additional Labels (Prices + Promos)

**GET** `https://www.tiket.com/ms-gateway/tix-events-v2-inventory/v1/products/additional-labels?ids=6a0334c674968825eb962e22&funnel=PDP&productUrl=theweekndinjakarta-generalonsaleday2`  
Status: 200

**Purpose:** Fetch current pricing, any promo labels, admin fees per package.

**Response:**
```json
{
  "data": {
    "paymentCurrency": "IDR",
    "products": [{
      "id": "6a0334c674968825eb962e22",
      "packages": [
        {
          "code": "2",
          "startingFinalPrice": 14732000,
          "priceTiers": [{
            "code": "ALL",
            "finalPrice": 14732000,
            "additionalFees": [{"type": "ADMIN_FEE", "name": "Admin Fee", "amount": 515620}]
          }]
        }
      ]
    }]
  }
}
```

---

### STEP 4 — File 1 — Check Account / Auth Status

**GET** `https://www.tiket.com/ms-gateway/tix-member-core/v2/account`  
Status: 200

**Purpose:** Verify login state. In this capture, returns BUSINESS_ERROR ("Gagal memuat konten") because session is guest/unauthenticated.

**Note:** `isLogin: false`, `accessToken: null` — the order flow captured here was as a **guest user**. For automation you need an authenticated session with a valid `accessToken`.

---

### STEP 5 — File 2 — Package Dropdown Selection (NO API CALLS)

Opening the package dropdown and selecting "ULTIMATE VIP PACKAGE" from the dropdown on the `/packages` page does **NOT** trigger any tiket.com API call. All 19 requests in HAR2 are pure tracking/analytics (TikTok, Facebook, Twitter pixels, Mixpanel).

**Implication for automation:** No API call needed for the selection itself — it is purely client-side state. The "Book" button click is what triggers the page navigation.

---

### STEP 6 — File 3 — Click "Book" — Navigate to Order Page

Clicking Book triggers a browser navigation from:  
`/en-id/to-do/theweekndinjakarta-generalonsaleday2/packages?tag_kuber=budget_exp#pricetierDetail-2`

To:  
`/en-id/to-do/theweekndinjakarta-generalonsaleday2/order?tag_kuber=budget_exp`

The `#pricetierDetail-2` hash encodes the selected package (code=2). This is a client-side navigation using Next.js router.

---

### STEP 7 — File 3 — Order Page SSP Data Load

**GET** `https://www.tiket.com/_next/data/to-do__79ac2a4dadcae07fff3ca12cfcf84f33c12ce121/en/en-id/to-do/theweekndinjakarta-generalonsaleday2/order.json?tag_kuber=budget_exp`  
Status: 200

**Purpose:** Next.js SSP (server-side props) for the order page. Returns middleware data including session, deviceId, locale.

**Required Headers:**
```
x-nextjs-data: 1
accept: */*
Referer: https://www.tiket.com/en-id/to-do/theweekndinjakarta-generalonsaleday2/packages?tag_kuber=budget_exp
```

**Key Response:**
```json
{
  "pageProps": {
    "middlewareData": {
      "sessionId": "6a0fb42bccd518000e25a2c1",
      "deviceId": "e1d8ee2a-17d9-4085-aa42-cee1c139c5b9",
      "correlationId": "322eca0e-3f52-4c51-8b35-d1ef3ba53edc",
      "isLogin": false,
      "accessToken": null,
      "currency": "IDR",
      "locale": "en"
    }
  }
}
```

**Next.js Build ID:** `to-do__79ac2a4dadcae07fff3ca12cfcf84f33c12ce121`  
This will change with deployments. For automation, either scrape it from the HTML or use the page navigation directly.

---

### STEP 8 — File 3 — Fetch Cross-Sell Vouchers (Optional/Non-Critical)

**GET** `https://www.tiket.com/ms-gateway/tix-promotion-page/cross-sell/widgets/vertical-vouchers?productType=EVENT&category=EVENT&eventDate=1790528399000&bookAmount=29464000&isRefundable=false&totalChildTickets=0&totalAdultTickets=0&totalSeniorTickets=0&totalInfantTickets=0&totalGeneralTickets=1&partnerId=6a02fc9474968825eb962c7a&inventoryId=6a0334c674968825eb962e22&userType=B2C&country=indonesia&province=jakarta-108001534490276204&city=north-jakarta-108001534490276603`  
Status: 200

**Purpose:** Fetch available promo vouchers to display on order page sidebar. Called **multiple times** (4x in HAR3).

**Query Params decoded:**
- `eventDate=1790528399000` — Concert date (epoch ms = 2026-09-27 16:59:59 UTC)
- `bookAmount=29464000` — 2 × 14,732,000 (2 VIP Ultimate tickets selected, price without admin fee)
- `totalGeneralTickets=1` — Note: shows 1, but bookAmount suggests 2; "general" may be a ticket type classification
- `inventoryId=6a0334c674968825eb962e22` — Product ID
- `partnerId=6a02fc9474968825eb962c7a` — Partner ID

**Response:** `{"code":"DATA_NOT_EXIST","message":"No data exist"}` — No vouchers available for this booking.

**Required Extra Headers (order page headers):**
```
X-Account-Id: 0
X-Channel-Id: MOBILE
X-Service-Id: gateway
X-Store-Id: TIKETCOM
X-Username: GUEST
X-Loyalty-Level: 0
```

---

## Page Navigation Flow (URL Sequence)

```
1. /en-id/to-do/theweekndinjakarta-generalonsaleday2
   ↓ click "Buy Ticket"
2. /en-id/to-do/theweekndinjakarta-generalonsaleday2/packages?tag_kuber=budget_exp
   ↓ open dropdown, select "ULTIMATE VIP PACKAGE", set quantity, click "Book"
3. /en-id/to-do/theweekndinjakarta-generalonsaleday2/order?tag_kuber=budget_exp
   ↓ fill in personal details form, proceed to payment
4. /en-id/to-do/theweekndinjakarta-generalonsaleday2/payment?...  (NOT CAPTURED)
```

> **Note:** The booking/order creation POST (which would call something like `/ms-gateway/tix-events-booking/v1/orders` or similar) was **NOT captured** in these HAR files. The capture ends at the order detail form page load. A further HAR capture of the form submission step is needed to get the actual booking API.

---

## Standard Request Headers (for all ms-gateway API calls)

```http
language: EN
lang: en
X-Platform-V2: WEB
X-Channel-Id-V2: WEB
X-Currency: IDR
X-Country-Code: id
X-Country-Id: id
X-Audience: tiket.com
X-Cookie-Session-V2: true
storeId: TIKETCOM
deviceId: {DEVICE_ID}
countryCode: id
currency: IDR
channelId: WEB
serviceId: GATEWAY
platform: WEB
requestId: NONE
cf-ipcountry: ID
X-City-Id: (empty)
X-Region-Id: (empty)
tag_kuber: budget_exp
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36
userAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36
X-Request-Id: {UUID}
X-Correlation-ID: {short-random-6-char}
Referer: https://www.tiket.com/en-id/to-do/{slug}/packages?tag_kuber=budget_exp
Accept-Language: en
```

### Additional headers on order page (Step 8 onward):
```http
X-Account-Id: 0
X-Channel-Id: MOBILE
X-Service-Id: gateway
X-Store-Id: TIKETCOM
X-Username: GUEST       (or actual username if logged in)
X-Loyalty-Level: 0      (or loyalty level if logged in)
```

---

## Automation Strategy

### What the HARs reveal:

1. **Product discovery is public** — No auth needed for Steps 1–3. GET product, packages, prices — all work without any token or cookie.

2. **Session is cookie-based (server-side)** — The `deviceId` is a persistent UUID stored in browser. The `sessionId` (`6a0fb42bccd518000e25a2c1`) likely comes from a cookie (`__Secure-*` or `TIKET_SESSION`) that was NOT included in the HAR (browser privacy masking, or Chrome DevTools cookie export disabled).

3. **No Bearer token visible** — The `authorization` header is absent on all captured requests. Either auth is cookie-based only, or these requests were guest-mode.

4. **CAPTCHA is enabled** — `isEnableCaptcha: true` at product level. This will be encountered on the booking POST step.

5. **Booking POST step missing** — The actual order creation API (form submit on /order page) is not in these HARs. Need an additional HAR capture of the form fill + submit step.

6. **Package selection is client-side** — No API needed to "select" a package. The package code is passed as a URL hash (`#pricetierDetail-2`) or query param to the order page.

7. **blockedTimeInSeconds: 1500** — VIP Ultimate ticket is "held" for 25 minutes (1500s) once a booking session starts.

### Minimal API calls needed to snipe:

```
1. GET /ms-gateway/tix-events-v2-inventory/v1/productSchedules/availablePackages
   → confirm package "2" is available on target date
   
2. GET /ms-gateway/tix-events-v2-inventory/v1/products/additional-labels
   → verify price hasn't changed
   
3. GET (or browser nav) to /en-id/to-do/{slug}/order?...
   → loads order page with session state
   
4. POST {booking endpoint} with:
   - productId: 6a0334c674968825eb962e22
   - packageCode: 2
   - date: 2026-09-27
   - quantity: {desired}
   - guestInfo: [{salutation, firstName, lastName, phone, email, idNumber}]
   - sessionId / accessToken (requires login)
   → Returns order ID / payment redirect
```

### Missing pieces (need more HAR captures):
- The actual booking POST endpoint URL and request body
- Auth/session cookie names (need to capture a logged-in session)
- CAPTCHA bypass mechanism (likely reCAPTCHA v3 or invisible hCaptcha)
- Payment redirect endpoint

---

## Important Notes

- **Authentication:** The captured flow was as a **guest user** (`isLogin: false`). Real ticket purchase requires login. Need to capture HAR from a logged-in session to get auth cookie/token names.
- **CAPTCHA:** `isEnableCaptcha: true` — automated booking will hit CAPTCHA on the order submission step.
- **Sale window:** VIP Ultimate sale runs 2026-05-21 07:00 WIB → 2026-09-26 07:00 WIB (day before event).
- **Max per order:** 6 tickets.
- **No queue system:** `enableQueueNumber: false` — no virtual queue, first-come-first-served.
- **Hold time:** 25 minutes (1500s) once booking initiated.
