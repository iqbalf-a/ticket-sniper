"use strict";

const { execFileSync } = require("child_process");
const { randomUUID }   = require("crypto");

// const PRODUCT_SLUG   = "theweekndinjakarta-generalonsaleday2";
const PRODUCT_SLUG   = "bts-jakarta-day1";
const SESSION_COOKIE = "device_id=2ec1ae47-636d-491d-9a98-c42497649324; session_access_token=eyJraWQiOiJTbE0xLWE1SmJHNFFTS0NremJhdDhZaHJyTHB5cThOeiJ9.eyJhdWQiOiJ0aWtldC5jb20iLCJzdWIiOiI2YTI2YzE0MjY1NjZiZTQyMThhYjMyNzAiLCJuYmYiOjE3ODA5MjQ3MzgsImlzcyI6Imh0dHBzOi8vd3d3LnRpa2V0LmNvbSIsImV4cCI6MTc4MjEzNDMzOH0.3vzL78JmTxYCQB9kzV10q_4MOwB_mDQGAzEgTzLRLCM2szPlnDJM9_3uZ5os24gC; session_refresh_token=eyJraWQiOiJGa2M5QllteUY2aXo4Ymt4M1k0anVjSXNtVl9TNmdpWCJ9.eyJhdWQiOiJ0aWtldC5jb20vcnQiLCJzdWIiOiI2YTI2YzE0MjY1NjZiZTQyMThhYjMyNzAiLCJuYmYiOjE3ODA5MjQ3MzgsImlzcyI6Imh0dHBzOi8vd3d3LnRpa2V0LmNvbSIsImV4cCI6MTgxMjQ4NDczOH0.EoUZEFpNl3LKMaIeiuYs_Aq-jQssHa9lj4r0v6wMrRC9EMoSTRPX6RH6SCFBiJoh; _cfuvid=1xfqO7SpYVjyi7.Fa3WA34iarpUkgRNkmcIO5dTQynw-1780924740.4724596-1.0.1.1-UlCHoZmnwCyB.rEVj5D5mKlZJBn1pVSOp_ZUkrSjKjs; _gcl_au=1.1.180741628.1780924741; _ga=GA1.1.1523062061.1780924741; _twpid=tw.1780924740774.190024205895150999; _fbp=fb.1.1780924743149.504740002587038032; cf_clearance=31UQQ8qgd1_pyYYhZhRSCGr1IcUDqesA5REiw7gBOmo-1780924743-1.2.1.1-Nw0VXytbtfssSG5ZQtoECNV7rYggFamRnafNJFwhyNNJtUF1Vn5tauPamn2.h8eO1csXRXLxP9viC5HlCoUhhwdgl7q0dtowLIc4LsSr.mrQ.GS_B.vvjeXupjxJAF317vvbiZFLHmakXtTK4.IH0KFHQM3eRxDgYfzFP4LyV8KgED7ddANNyOYUWLs8oxOYY1jM1V_jqJpN0DZ6ISE1LIA08v1JkN8IGDNn2XAbW8f7ORYg8MJTP8mpc27XPZJTnQ6xASif2aSh63y2BZWltS5fr_YSrpRa_f5BBSmWa_naL8MmL_SACeBGDa2QAWx02FMEa4eg_5JhQHAngqHnzA; _tt_enable_cookie=1; _ttp=01KTKP5ZVM7RQ5B7FM7QEBENBC_.tt.1; ttcsid_C6F1LR0B3BVPD5SJMP6G=1780924743547::GGE7NaIlTIQhAxalr12C.1.1780924860024.1; ttcsid=1780924743548::ytx2A2nUN3XdPonjQabt.1.1780924860024.0::1.112663.114464::52806.1.1181.661::32272.12.0; __cf_bm=CZbOalasr4ASqrADE8uF7Zucj1Xy2kUuWqzIQdl1qDU-1780926101.8435962-1.0.1.1-fXdyHG..t9MfZbby3dKdclpSu2qMhLqmeFHXwnAThL2JHPzCVowh2YW19CUQQW0z4hvIdsp15.5LrXK1LTfMB6QWXnD_up.kWAT57t2YnSzPzYlVZFapQfqJ5.dnxUIqL4mIXjedgqCrhnpBk2dfPQ; QueueITAccepted-SDFrts345E-V3_btsweverseday1=EventId%3Dbtsweverseday1%26FixedValidityMins%3D3%26RedirectType%3Didle%26IssueTime%3D1780926102%26Hash%3D18bc35417a24a4fa78f45c3ae0ec379818468de44f3c486d487c5939808c555a; _ga_7H6ZDP2ZXG=GS2.1.s1780924740$o1$g1$t1780926102$j60$l0$h0";   // boleh kosong, tapi isi kalau kena 403

const BASE_URL = "https://www.tiket.com";
const API_BASE = `${BASE_URL}/ms-gateway/tix-events-v2-inventory/v1`;

function fetchJSON(url) {
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
    const headers = {
        "language": "EN", "lang": "en",
        "X-Platform-V2": "WEB", "X-Channel-Id-V2": "WEB",
        "X-Currency": "IDR", "X-Country-Code": "id", "X-Country-Id": "id",
        "X-Audience": "tiket.com", "X-Cookie-Session-V2": "true",
        "storeId": "TIKETCOM", "countryCode": "id", "currency": "IDR",
        "channelId": "WEB", "serviceId": "GATEWAY", "platform": "WEB",
        "X-Request-Id": randomUUID(), "X-Correlation-ID": randomUUID(),
        "tag_kuber": "budget_exp", "requestId": "NONE",
        "Referer": `${BASE_URL}/en-id/to-do/${PRODUCT_SLUG}/packages?tag_kuber=budget_exp`,
        "User-Agent": UA, "userAgent": UA,
        "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
        "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"',
        "Accept": "application/json, text/plain, */*", "Accept-Language": "en",
        "Origin": BASE_URL,
        "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin",
        "cf-ipcountry": "ID",
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
    return JSON.parse(body);
}

(async () => {
    console.log(`\nFetching packages for: ${PRODUCT_SLUG}\n`);
    const data = await fetchJSON(`${API_BASE}/products/url/${PRODUCT_SLUG}`);

    if (data.code !== "SUCCESS" || !data.data) {
        console.error("API error:", data.code, data.message);
        process.exit(1);
    }

    const product = data.data;
    console.log(`Event        : ${product.name || product.title || product.eventName || "-"}`);
    console.log(`Status       : ${product.availabilityStatus}`);
    console.log(`\nPackages (isi ke PACKAGE_CODES dan PACKAGE_HASH di index.js):\n`);

    const pkgs = product.packages || [];
    pkgs.forEach((p, i) => {
        const t = p.translations;
        const name = (Array.isArray(t) ? t[0]?.name : t?.en?.name || t?.id?.name) || p.name || "-";
        const price = p.startingFinalPrice != null ? `Rp${(p.startingFinalPrice/100).toLocaleString("id-ID")}` : "-";
        console.log(`  [${i + 1}] code=${p.code}  status=${p.productPackageStatus}  price=${price}  name="${name}"`);
    });

    console.log();
})().catch(e => { console.error(e.message); process.exit(1); });
