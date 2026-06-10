/**
 * tiketcom/index.js
 * Poll tiket.com API sampai paket target tersedia (ACTIVE + BOOKABLE),
 * lalu otomatis buka browser, inject session, set quantity, klik Book.
 * User tinggal isi form order dan bayar secara manual.
 *
 * Usage:
 *   node tiketcom/index.js
 */

"use strict";

const { execFileSync } = require("child_process");
const { randomUUID }   = require("crypto");
const { openAndBook }  = require("./book");

// ── Config ───────────────────────────────────────────────────────

// const PRODUCT_SLUG    = "theweekndinjakarta-generalonsaleday2";
const PRODUCT_SLUG    = "bts-jakarta-day1";
const PACKAGE_CODES   = ["16"];     // semua kode paket target dari API (packageCodes[] di tier, atau packages[].code)
const PACKAGE_HASH    = "16";       // index hash di URL: buka /packages → klik paket → lihat #pricetierDetail-{n}
const PACKAGE_NAME    = "VIP PACKAGE B - WEVERSE";  // display only — tidak mempengaruhi logika
const TARGET_QTY      = 3;         // jumlah tiket yang akan dibooking (klik + sebanyak TARGET_QTY-1)

// Isi dengan cookie dari browser (DevTools → Network → request ke tiket.com → Request Headers → Cookie)
const SESSION_COOKIE  = 'device_id=e1d8ee2a-17d9-4085-aa42-cee1c139c5b9; session_access_token=eyJraWQiOiJ4dzlKa2FlZVFZUWRISlllSDhodm80SW9jX2FnbWRxbCJ9.eyJhdWQiOiJ0aWtldC5jb20iLCJzdWIiOiI2YTBmYjQyYmNjZDUxODAwMGUyNWEyYzEiLCJuYmYiOjE3Nzk0MTQwNTksImlzcyI6Imh0dHBzOi8vd3d3LnRpa2V0LmNvbSIsImV4cCI6MTc4MDYyMzY1OX0.cKjWEKVUaTja1lEiosRCO-TWmjuZwoAksKBzD75vLtOQnMMm8nGgwAOy0MjuTgj6; session_refresh_token=eyJraWQiOiJJMDR6dG5RMUtZMF9oQ3BEMXgyNXlsOW45aWpINWdzWCJ9.eyJhdWQiOiJ0aWtldC5jb20vcnQiLCJzdWIiOiI2YTBmYjQyYmNjZDUxODAwMGUyNWEyYzEiLCJuYmYiOjE3Nzk0MTQwNTksImlzcyI6Imh0dHBzOi8vd3d3LnRpa2V0LmNvbSIsImV4cCI6MTgxMDk3NDA1OX0.3jwns6hPdb_jrvuWGeaON2ZIKwiYbqrA86UyhiOilF6ocsRKfLu-dR261T_sZtCY; _cfuvid=B7cCH1FGQeILuwgcwZjEH8AyRoYTqnapXa5QgPAhxFY-1779414059.6287966-1.0.1.1-r.rErumJntFWH9moxWJWcEOjaD2uYNZJcJrXSJGypqA; _gcl_au=1.1.866105580.1779414059; _gcl_gs=2.1.k1$i1779414057$u245719809; _ga=GA1.1.1075879192.1779414059; _twpid=tw.1779414059290.679464059207211436; _fbp=fb.1.1779414060340.562441783109747775; _tt_enable_cookie=1; _ttp=01KS6NFKN0DPCZ65QNV23HFPQZ_.tt.1; _gcl_aw=GCL.1779414080.CjwKCAjw2rrQBhBuEiwAarLWHTFKQipiDZ5Ire6jL0PF4f01kC4HY8d0MDvorNACm7wpXuuG3rSBixoCd-oQAvD_BwE; _gcl_dc=GCL.1779414080.CjwKCAjw2rrQBhBuEiwAarLWHTFKQipiDZ5Ire6jL0PF4f01kC4HY8d0MDvorNACm7wpXuuG3rSBixoCd-oQAvD_BwE; g_state={"i_l":0,"i_ll":1779589624518,"i_b":"pOlSphWytgBjTUhmfyRYvAuDOprK5wl53lAibXqq45Y","i_e":{"enable_itp_optimization":0},"i_et":1779414059016}; QueueITAccepted-SDFrts345E-V3_theweekndgosday2=EventId%3Dtheweekndgosday2%26RedirectType%3Dafterevent%26IssueTime%3D1779593536%26Hash%3D63c728e74cea8dd84a207f2103a67b4319dd2ebb89e99a4fdb6fbb2996c4b0c3; cf_clearance=DbioGiJx2V852JYNmJHH51Gh41jyDMjwfui8jNHUFeY-1779593537-1.2.1.1-u6PGhHUrup6fbMequHoDsa6oDAbybJ.dEUQlbnwFYlpKaAUt7gSqggUBEqTVaEWIF6c1jId_WWtXmRdBUYHlBtKKUjoNNW_EJ5lzG7oz4PtJxjR8fGIB7IlCD5MIIt8c0ezrLQ3qXfHe4hppZgFQWT1qRSkqXL3I6o8P9QlCOplL5ghjiQZipgMfAzQjzfEJ.nwBCXuLr767HIgcYaMV8lQ0tFXCIbF9w_JjLHZTuL0XypyC_M7stv_jwU0vx3ApzAkL7NX1sGL1nxLpzjpY8o_3L3I0I1LJCCZNQrCvXMHKm89_DVRVLQWj04Kq3l4Rwz3M99JvvR6kctXKsCqPng; __cf_bm=.1AyOWLaivOPT1sI5tzxm73b1GyFCjKO8rW2CpbrY0Y-1779593537.1664658-1.0.1.1-o.i0mUeJ5jyn_u.D0TO0ZKAadUG9NC9D9UHBIi_ruhzbzfmesYtsUl.ca8PxvcKwayjDgAjy0PFiNWCANp_ZNUbkX72c8T2Frikfo44J3PSxRXumtP_8YGp_b0wQgZqYPqdcXB89Kkv1QBRoSjiWOQ; _ga_7H6ZDP2ZXG=GS2.1.s1779592676$o5$g1$t1779593538$j58$l0$h0; ttcsid=1779589626169::gMB-FHY_2iXrMO-L6lKV.5.1779593540194.0::1.3909570.3913746::3684153.55.304.2150::3908291.235.1132; ttcsid_C6F1LR0B3BVPD5SJMP6G=1779589626168::Agaj82DrtSpHE6kTOXfZ.4.1779593540194.1; app_logger_correlation_id=fe7d1e41-bbf9-4fb6-abea-9a719c38634e';

const INTERVAL_MS     = 200;       // poll setiap 200ms
const RETRY_ON_ERROR  = 5000;      // jeda kalau fetch error

// ── Constants ────────────────────────────────────────────────────
const BASE_URL  = "https://www.tiket.com";
const API_BASE  = `${BASE_URL}/ms-gateway/tix-events-v2-inventory/v1`;
const DEVICE_ID = SESSION_COOKIE.match(/device_id=([^;]+)/)?.[1] || randomUUID();

// ── Helpers ──────────────────────────────────────────────────────

function timestamp() {
    return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function fetchJSON(url) {
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
    const headers = {
        "language":           "EN",
        "lang":               "en",
        "X-Platform-V2":      "WEB",
        "X-Channel-Id-V2":    "WEB",
        "X-Currency":         "IDR",
        "X-Country-Code":     "id",
        "X-Country-Id":       "id",
        "X-Audience":         "tiket.com",
        "X-Cookie-Session-V2":"true",
        "storeId":            "TIKETCOM",
        "deviceId":           DEVICE_ID,
        "countryCode":        "id",
        "currency":           "IDR",
        "channelId":          "WEB",
        "serviceId":          "GATEWAY",
        "platform":           "WEB",
        "X-Request-Id":       randomUUID(),
        "X-Correlation-ID":   randomUUID(),
        "tag_kuber":          "budget_exp",
        "requestId":          "NONE",
        "Referer":            `${BASE_URL}/en-id/to-do/${PRODUCT_SLUG}/packages?tag_kuber=budget_exp`,
        "User-Agent":         UA,
        "userAgent":          UA,
        "sec-ch-ua":          '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
        "sec-ch-ua-mobile":   "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Accept":             "application/json, text/plain, */*",
        "Accept-Language":    "en",
        "Origin":             BASE_URL,
        "sec-fetch-dest":     "empty",
        "sec-fetch-mode":     "cors",
        "sec-fetch-site":     "same-origin",
        "cf-ipcountry":       "ID",
    };

    const args = ["-s", "--max-time", "15", "-w", "|||%{http_code}"];
    for (const [k, v] of Object.entries(headers)) args.push("-H", `${k}: ${v}`);
    if (SESSION_COOKIE) args.push("-H", `Cookie: ${SESSION_COOKIE}`);
    args.push(url);

    const out  = execFileSync("curl", args, { encoding: "utf8", timeout: 20000 });
    const sep  = out.lastIndexOf("|||");
    const body = out.slice(0, sep);
    const code = parseInt(out.slice(sep + 3));

    if (code !== 200) throw new Error(`HTTP ${code}`);
    try { return JSON.parse(body); }
    catch (e) { throw new Error("JSON parse gagal: " + e.message); }
}

async function checkAvailability() {
    const data = await fetchJSON(`${API_BASE}/products/url/${PRODUCT_SLUG}`);

    if (data.code !== "SUCCESS" || !data.data)
        throw new Error(`API error: ${data.code} — ${data.message || ""}`);

    const product = data.data;
    const productStatus = product.availabilityStatus;

    const matchedPkgs = (product.packages || []).filter(p => PACKAGE_CODES.includes(String(p.code)));
    if (matchedPkgs.length === 0)
        throw new Error(`Package codes [${PACKAGE_CODES.join(", ")}] tidak ditemukan di response`);

    const activePkg = matchedPkgs.find(p => p.productPackageStatus === "ACTIVE");
    const pkg       = activePkg || matchedPkgs[0];
    const pkgStatus = pkg.productPackageStatus;

    return { productStatus, pkgStatus, pkg };
}

function clearLine() {
    process.stdout.write("\r\x1b[K");
}

function printSpinner(attempt, pkgStatus, productStatus) {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const frame = frames[attempt % frames.length];
    process.stdout.write(
        `\r  ${frame}  [#${attempt}] ${timestamp()} — product:${productStatus} pkg:${pkgStatus}`
    );
}

// ── Main ─────────────────────────────────────────────────────────

(async () => {
    const hr = "─".repeat(60);
    const packagesUrl = `${BASE_URL}/en-id/to-do/${PRODUCT_SLUG}/packages?tag_kuber=budget_exp`;

    console.log("\n" + hr);
    console.log("  🎫  Tiket.com Ticket Sniper");
    console.log(hr);
    console.log(`  🎯  Paket     : [${PACKAGE_CODES.join(", ")}] ${PACKAGE_NAME}`);
    console.log(`  🌐  Slug      : ${PRODUCT_SLUG}`);
    console.log(`  🔁  Interval  : setiap ${INTERVAL_MS}ms`);
    console.log(hr + "\n");

    let attempt = 0;

    while (true) {
        attempt++;

        let result;
        try {
            result = await checkAvailability();
        } catch (err) {
            clearLine();
            console.log(`  ⚠️  [#${attempt}] ${timestamp()} Error: ${err.message} — retry ${RETRY_ON_ERROR / 1000}s`);
            await sleep(RETRY_ON_ERROR);
            continue;
        }

        const { productStatus, pkgStatus } = result;

        if (productStatus === "SOLD_OUT") {
            clearLine();
            console.log(`\n  🔴  Product SOLD_OUT. Script berhenti.\n`);
            process.exit(0);
        }

        if (pkgStatus === "ACTIVE" && productStatus === "BOOKABLE") {
            clearLine();
            console.log("\n" + hr);
            console.log(`  ✅  PAKET AKTIF! (attempt #${attempt})`);
            console.log(hr);
            console.log(`  🎯  Package : [${PACKAGE_CODES.join(", ")}] ${PACKAGE_NAME}`);
            console.log(`  🌐  URL     : ${packagesUrl}#pricetierDetail-${PACKAGE_HASH}`);
            console.log(hr);
            console.log(`\n  🚀 Membuka browser dan booking otomatis...\n`);

            try {
                await openAndBook(packagesUrl, {
                    packageHash:   PACKAGE_HASH,
                    sessionCookie: SESSION_COOKIE,
                    targetQty:     TARGET_QTY,
                });
            } catch (err) {
                console.warn(`  ⚠️  Puppeteer error: ${err.message}`);
                console.log(`     Buka manual: ${packagesUrl}#pricetierDetail-${PACKAGE_HASH}\n`);
            }

            process.exit(0);
        }

        printSpinner(attempt, pkgStatus, productStatus);
        await sleep(INTERVAL_MS);
    }
})();
