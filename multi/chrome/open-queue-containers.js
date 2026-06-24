/**
 * multi/chrome/open-queue-containers.js
 * Bypass Queue-IT via N Playwright Chromium context terpisah.
 * Auto-solve CAPTCHA (3 style: dark-bg, checkered, noise/grain).
 *
 * Config: multi/chrome/config.js
 *   - QUEUE_URL      : harus URL /packages (trigger queue + butuh login)
 *   - SESSION_COOKIE : cookie akun yang sudah login
 *   - CONTEXT_COUNT  : jumlah slot paralel
 *
 * Usage:
 *   node multi/chrome/open-queue-containers.js        ← pakai CONTEXT_COUNT dari config
 *   node multi/chrome/open-queue-containers.js 5      ← override 5 slot
 */

"use strict";

const path      = require("path");
const { chromium } = require("playwright-core");
const Tesseract    = require("tesseract.js");
const Jimp         = require("jimp");
const {
    CHROME_EXE,
    CONTEXT_COUNT: CFG_CONTEXT_COUNT,
    QUEUE_URL,
    SESSION_COOKIE,
} = require("./config");

const CONTEXT_COUNT  = process.argv[2] ? parseInt(process.argv[2]) : CFG_CONTEXT_COUNT;
const POLL_MS        = 2000;
const OPEN_DELAY_MS  = 800;
const PACKAGES_URL   = "https://www.tiket.com/id-id/to-do/bts-jakarta-3rdshowday/packages";
const EVENT_ID       = "btsgosday333";
const QUEUEIT_COOKIE = `QueueITAccepted-SDFrts345E-V3_${EVENT_ID}`;
const QUEUE_DOMAIN   = "queue.tiket.com";

const CAPTCHA_DEBUG = false; // set true untuk simpan debug image per slot per threshold

const CHROME_ARGS = [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-hang-monitor",
    "--disable-ipc-flooding-protection",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function timestamp() { return new Date().toLocaleTimeString("id-ID", { hour12: false }); }

function parseCookies(cookieStr) {
    if (!cookieStr) return [];
    return cookieStr.split(";")
        .map(s => {
            const eq = s.indexOf("=");
            if (eq === -1) return null;
            return {
                name:   s.slice(0, eq).trim(),
                value:  s.slice(eq + 1).trim(),
                domain: ".tiket.com",
                path:   "/",
            };
        })
        .filter(Boolean);
}

// ── Tesseract ─────────────────────────────────────────────────────────────────

let tesseractWorker = null;

async function getTesseractWorker() {
    if (!tesseractWorker) {
        tesseractWorker = await Tesseract.createWorker("eng", 1, {
            logger:    () => {},
            langPath:  "https://tessdata.projectnaptha.com/4.0.0_best",
            cachePath: path.join(__dirname, ".tessdata"),
        });
        await tesseractWorker.setParameters({
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            tessedit_pageseg_mode:   "7",
        });
        console.log("  ✅ Tesseract best model siap");
    }
    return tesseractWorker;
}

// ── Image preprocessing ───────────────────────────────────────────────────────

/**
 * Preprocessing gambar CAPTCHA untuk OCR.
 *
 * Queue-IT punya 3 style CAPTCHA:
 *   A) Background gelap (solid dark blue) + teks putih/terang
 *   B) Background checkered (kotak abu-abu) + teks biru
 *   C) Background noise/grain (acak piksel) + teks biru gelap
 *
 * Style B & C: isolasi teks biru via selisih channel B−R.
 * Blur(1) sebelum threshold meratakan noise random (style C).
 * brThreshold: ensemble memanggil 3x dengan nilai 32/40/50.
 */
async function preprocessCaptcha(rawBuffer, brThreshold = 40, debugLabel = "") {
    const img = await Jimp.read(rawBuffer);

    const bg = new Jimp(img.bitmap.width, img.bitmap.height, 0xFFFFFFFF);
    bg.composite(img, 0, 0);

    bg.blur(1);

    let bluishPixels = 0;
    let darkPixels   = 0;
    const total = bg.bitmap.width * bg.bitmap.height;

    bg.scan(0, 0, bg.bitmap.width, bg.bitmap.height, (_x, _y, idx) => {
        const r = bg.bitmap.data[idx];
        const g = bg.bitmap.data[idx + 1];
        const b = bg.bitmap.data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (b - r > 45 && b > 80 && lum < 175) bluishPixels++;
        if (lum < 80)                           darkPixels++;
    });

    const isLightBg = bluishPixels > 10 && darkPixels < total * 0.4;

    bg.scale(4, Jimp.RESIZE_NEAREST_NEIGHBOR);

    bg.scan(0, 0, bg.bitmap.width, bg.bitmap.height, (_x, _y, idx) => {
        const r   = bg.bitmap.data[idx];
        const g   = bg.bitmap.data[idx + 1];
        const b   = bg.bitmap.data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        const isText = isLightBg
            ? (b - r) > brThreshold && b > 70
            : lum > 150;

        const val = isText ? 0 : 255;
        bg.bitmap.data[idx]     = val;
        bg.bitmap.data[idx + 1] = val;
        bg.bitmap.data[idx + 2] = val;
        bg.bitmap.data[idx + 3] = 255;
    });

    const padded = new Jimp(bg.bitmap.width + 40, bg.bitmap.height + 40, 0xFFFFFFFF);
    padded.composite(bg, 20, 20);

    if (CAPTCHA_DEBUG && debugLabel) {
        await padded.writeAsync(path.join(__dirname, `captcha-debug-${debugLabel}.png`));
    }

    return padded.getBufferAsync(Jimp.MIME_PNG);
}

/**
 * Ensemble OCR: 3 threshold berbeda, voting per karakter.
 * Mengurangi miss karakter mirip (0/O, 8/S, 5/S) ~50%.
 */
async function ocrEnsemble(imgBuffer, slotId) {
    const worker     = await getTesseractWorker();
    const thresholds = [32, 40, 50];
    const results    = [];

    for (const t of thresholds) {
        const label     = CAPTCHA_DEBUG ? `slot${slotId}-t${t}` : "";
        const processed = await preprocessCaptcha(imgBuffer, t, label);
        const { data: { text } } = await worker.recognize(processed);
        const code = text.trim().replace(/[^A-Z0-9]/g, "");
        results.push(code);
    }

    const lenFreq = {};
    for (const r of results) lenFreq[r.length] = (lenFreq[r.length] || 0) + 1;
    const bestLen = parseInt(
        Object.entries(lenFreq).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
    );

    const candidates = results.filter(r => r.length === bestLen);

    let voted = "";
    for (let i = 0; i < bestLen; i++) {
        const freq = {};
        for (const c of candidates) {
            const ch = c[i] || "";
            if (ch) freq[ch] = (freq[ch] || 0) + 1;
        }
        voted += Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    }

    return { code: voted, detail: results.join(" / ") };
}

// ── CAPTCHA solver ────────────────────────────────────────────────────────────

async function fetchCaptchaImage(page, imgSrc) {
    try {
        const fullSrc = imgSrc.startsWith("http") ? imgSrc : new URL(imgSrc, page.url()).href;
        const bytes = await page.evaluate(async (src) => {
            const r = await fetch(src);
            if (!r.ok) return null;
            return Array.from(new Uint8Array(await r.arrayBuffer()));
        }, fullSrc);
        if (bytes && bytes.length > 200) return Buffer.from(bytes);
    } catch { /* fallback */ }
    return null;
}

async function trySolveCaptcha(page, slotId) {
    const hasCaptcha = await page.evaluate(() => {
        const inp = document.querySelector('input[type="text"]');
        return inp !== null && document.body.innerText.includes("Enter the code");
    }).catch(() => false);

    if (!hasCaptcha) return false;

    try {
        const imgSelectors = [
            ".queueit-layout-captcha-image",
            ".queueit-layout-captcha img",
            "img[src*='captcha']",
            "img[src*='Captcha']",
            "img[src*='challenge']",
            "img[src*='image']",
        ];

        let captchaEl  = null;
        let captchaSrc = null;

        for (const sel of imgSelectors) {
            const el = await page.$(sel);
            if (el) {
                const src = await el.getAttribute("src");
                if (src) { captchaEl = el; captchaSrc = src; break; }
            }
        }

        if (!captchaEl) {
            let maxArea = 0;
            for (const el of await page.$$("img")) {
                const box = await el.boundingBox();
                if (box && box.width * box.height > maxArea) {
                    maxArea    = box.width * box.height;
                    captchaEl  = el;
                    captchaSrc = await el.getAttribute("src");
                }
            }
        }

        if (!captchaEl) {
            console.log(`  [Slot #${slotId}] ⚠️  Elemen gambar CAPTCHA tidak ditemukan`);
            return false;
        }

        let imgBuffer = null;

        if (captchaSrc && captchaSrc.startsWith("data:")) {
            const b64 = captchaSrc.split(",")[1];
            if (b64) imgBuffer = Buffer.from(b64, "base64");
        } else if (captchaSrc) {
            imgBuffer = await fetchCaptchaImage(page, captchaSrc);
        }

        if (!imgBuffer) imgBuffer = await captchaEl.screenshot();

        const { code, detail } = await ocrEnsemble(imgBuffer, slotId);

        console.log(`  [Slot #${slotId}] OCR → "${code}"  [${detail}]`);

        if (code.length < 4) {
            console.log(`  [Slot #${slotId}] ⚠️  Kode terlalu pendek`);
            return false;
        }

        await page.locator('input[type="text"]').fill(code);
        await sleep(300);
        await page.locator([
            'button:has-text("I\'m not a robot")',
            'button[type="submit"]',
            'input[type="submit"]',
        ].join(", ")).first().click({ timeout: 5000 });

        console.log(`  [Slot #${slotId}] ✅ Submitted: ${code}`);
        return true;

    } catch (err) {
        console.log(`  [Slot #${slotId}] ⚠️  ${err.message.split("\n")[0]}`);
        return false;
    }
}

// ── Cloudflare Turnstile ──────────────────────────────────────────────────────

/**
 * Deteksi dan klik Cloudflare Turnstile ("Robot atau manusia?" / "Verify you are human").
 * Turnstile melakukan fingerprinting di background — dengan real Chrome (headless:false)
 * dan cf_clearance cookie yang valid, challenge ini biasanya tidak muncul sama sekali.
 * Jika muncul, auto-click mencoba menyelesaikannya; kalau gagal user klik manual di browser.
 */
async function handleCloudflareTurnstile(page, label = "") {
    const tag = label ? `[${label}]` : "";

    // Cek apakah halaman menampilkan CF challenge
    const isCf = await page.evaluate(() =>
        document.title.includes("Just a moment") ||
        (document.body?.innerText || "").includes("Verify you are human") ||
        (document.body?.innerText || "").includes("Robot atau manusia")
    ).catch(() => false);

    if (!isCf) return true;

    console.log(`  ${tag} ⚡ Cloudflare Turnstile — auto-klik...`);

    try {
        // Tunggu iframe CF Turnstile muncul
        const cfFrame = page.frameLocator(
            'iframe[src*="challenges.cloudflare.com"], iframe[title*="Widget"], iframe[title*="Cloudflare"]'
        );

        // Klik area checkbox (CF Turnstile = label wrapper, bukan input biasa)
        await cfFrame.locator("label, input[type='checkbox'], .ctp-checkbox-label").first()
            .click({ timeout: 8000 });

        // Tunggu CF redirect selesai (hilangnya "Just a moment" atau URL berubah)
        await page.waitForFunction(
            () => !document.title.includes("Just a moment") &&
                  !(document.body?.innerText || "").includes("Verify you are human"),
            { timeout: 15000 }
        );

        console.log(`  ${tag} ✅ Cloudflare Turnstile lolos!`);
        return true;

    } catch {
        console.log(`  ${tag} ⚠️  Auto-klik CF gagal — selesaikan manual di jendela browser`);
        console.log(`  ${tag}    (atau isi cf_clearance terbaru di SESSION_COOKIE config.js)`);
        return false;
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
    const hr = "─".repeat(64);
    console.log(`\n${hr}`);
    console.log("  Queue-IT Chrome Context Bypass  (auto-solve CAPTCHA)");
    console.log(hr);
    console.log(`  Slots       : ${CONTEXT_COUNT}`);
    console.log(`  Queue URL   : ${QUEUE_URL}`);
    console.log(`  Session     : ${SESSION_COOKIE ? "✅ ada" : "⚠️  kosong"}`);
    console.log(`${hr}\n`);

    let browser;
    try {
        browser = await chromium.launch({
            executablePath: CHROME_EXE,
            headless:       false,
            args:           CHROME_ARGS,
        });
    } catch (err) {
        console.error(`  ✖ Gagal buka Chrome: ${err.message}`);
        process.exit(1);
    }

    console.log(`  Membuka ${CONTEXT_COUNT} context...\n`);

    const slots = [];

    for (let i = 0; i < CONTEXT_COUNT; i++) {
        const ctx  = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        });
        const page = await ctx.newPage();

        if (SESSION_COOKIE) {
            try { await ctx.addCookies(parseCookies(SESSION_COOKIE)); } catch { /* ignore */ }
        }

        page.goto(QUEUE_URL, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});

        slots.push({ id: i + 1, ctx, page, passed: false });
        process.stdout.write(`\r  Dibuka: ${i + 1} / ${CONTEXT_COUNT}`);

        if (i < CONTEXT_COUNT - 1) await sleep(OPEN_DELAY_MS);
    }

    console.log(`\n\n  ${CONTEXT_COUNT} slot aktif. Memantau (auto-CAPTCHA aktif)...\n`);

    let winner = null;
    const captchaLastAttempt = {};

    while (!winner) {
        await sleep(POLL_MS);

        for (const slot of slots) {
            if (slot.passed) continue;

            let url    = "(loading)";
            let status = "antrean";

            try {
                url = slot.page.url();

                const onQueue  = url.includes(QUEUE_DOMAIN) || url === "about:blank" || url === "";
                const onTarget = !onQueue && url.includes("tiket.com");

                if (onTarget) {
                    slot.passed = true;
                    winner      = slot;
                    status      = "LOLOS ✅";
                } else if (onQueue) {
                    const now     = Date.now();
                    const lastTry = captchaLastAttempt[slot.id] || 0;

                    if (now - lastTry > 3000) {
                        const hasCaptcha = await slot.page.evaluate(() =>
                            !!document.querySelector('input[type="text"]') &&
                            document.body.innerText.includes("Enter the code")
                        ).catch(() => false);

                        if (hasCaptcha) {
                            captchaLastAttempt[slot.id] = now;
                            console.log(`\n  [Slot #${slot.id}] 🔍 CAPTCHA — auto-solve...`);
                            await trySolveCaptcha(slot.page, slot.id);
                            status = "CAPTCHA 🔑";
                        }
                    } else {
                        status = "CAPTCHA (cooldown)";
                    }

                    try {
                        const cookies   = await slot.ctx.cookies("https://www.tiket.com");
                        const qitCookie = cookies.find(c => c.name === QUEUEIT_COOKIE);
                        if (qitCookie) {
                            slot.passed = true;
                            winner      = slot;
                            status      = "LOLOS (cookie) ✅";
                        }
                    } catch { /* belum siap */ }
                }
            } catch { /* navigasi berlangsung */ }

            process.stdout.write(
                `  [${String(slot.id).padStart(3)}]  ${url.slice(0, 47).padEnd(47)}  ${status}\n`
            );
        }
    }

    // ── Winner ────────────────────────────────────────────────────────────────
    const hr2 = "═".repeat(64);
    console.log(`\n${hr2}`);
    console.log(`  🏆  SLOT #${winner.id} LOLOS ANTREAN! — ${timestamp()}`);
    console.log(hr2);

    try {
        const cookies = await winner.ctx.cookies([
            "https://www.tiket.com",
            "https://queue.tiket.com",
        ]);
        const qitOnly  = cookies.find(c => c.name === QUEUEIT_COOKIE);
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");

        console.log(`\n  QueueITAccepted cookie:`);
        console.log(qitOnly ? `  ${qitOnly.name}=${qitOnly.value}` : "  (tidak ditemukan)");
        console.log(`\n  Full cookie string (salin ke SESSION_COOKIE):`);
        console.log(`  ${cookieStr.slice(0, 200)}...`);
    } catch (err) {
        console.warn(`  ⚠️  Gagal ambil cookie: ${err.message}`);
    }

    if (SESSION_COOKIE) {
        try {
            const parsed = parseCookies(SESSION_COOKIE);
            await winner.ctx.addCookies(parsed);
            console.log(`\n  ✅ Session cookie diinjek (${parsed.length} cookie)`);
        } catch (err) {
            console.warn(`  ⚠️  Gagal inject: ${err.message}`);
        }
    }

    console.log(`\n  Membuka halaman packages...\n`);
    try {
        await winner.page.goto(PACKAGES_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

        // Handle Cloudflare Turnstile yang mungkin muncul sebelum halaman packages
        await handleCloudflareTurnstile(winner.page, `Slot #${winner.id}`);

        console.log(`  ✅ Halaman terbuka: ${winner.page.url()}`);
    } catch (err) {
        console.warn(`  ⚠️  ${err.message}`);
        console.log(`  Buka manual: ${PACKAGES_URL}`);
    }

    console.log(`\n  Browser tetap terbuka — lakukan booking secara manual.\n`);
    console.log(`${hr}\n`);

    if (tesseractWorker) await tesseractWorker.terminate();
})().catch(err => {
    console.error("\nFatal:", err.message);
    process.exit(1);
});
