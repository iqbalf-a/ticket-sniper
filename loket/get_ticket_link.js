/**
 * get_ticket_link.js
 * ──────────────────────────────────────────────────────────────
 * Polling loop: fetch halaman Loket berulang kali sampai
 * button dengan label HARI INI ditemukan dan AKTIF (tidak disabled),
 * lalu print link & buka browser otomatis.
 *
 * Usage:
 *   node get_ticket_link.js              ← fetch live (default)
 *   node get_ticket_link.js page.html   ← dari file lokal (test)
 * ──────────────────────────────────────────────────────────────
 */

"use strict";

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Config ───────────────────────────────────────────────────────
// const PAGE_URL = "https://dyandraglobalstore-05.com"; tanggal 6 mei
// const PAGE_URL = "https://dyandraglobalstore-04.com/#layout";
const PAGE_URL = "https://westlifestadiumshowjkt.com/";

const ARG = process.argv[2] || "";

const INTERVAL_MS = 100;   // cek setiap 3 detik
const RETRY_ON_ERROR = 5000;   // tunggu 5 detik kalau fetch error
const MAX_RETRIES = null;   // null = loop selamanya sampai dapat

const BULAN_ID = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
    5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
    9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

// ── Config profiles Chrome ───────────────────────────────────────
const CHROME_PROFILES = [
    "Default",    // Profile pertama
    "Profile 1",  // Profile kedua
    "Profile 2",  // Profile ketiga
    "Profile 4",  // Profile keempat
];

// ── Helpers ──────────────────────────────────────────────────────

function todayLabel() {
    const d = new Date();
    // return `${d.getDate()} ${BULAN_ID[d.getMonth() + 1]} ${d.getFullYear()}`;
    return `21 May 2026`;
}

function timestamp() {
    return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function fetchHTML(url, hops = 0) {
    if (hops > 5) return Promise.reject(new Error("Too many redirects"));
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
                "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
                "Cache-Control": "no-cache",       // jangan pakai cache
                "Pragma": "no-cache",
            },
            timeout: 15000,
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
                return fetchHTML(res.headers.location, hops + 1).then(resolve).catch(reject);
            if (res.statusCode !== 200)
                return reject(new Error(`HTTP ${res.statusCode}`));
            let body = "";
            res.setEncoding("utf8");
            res.on("data", c => body += c);
            res.on("end", () => resolve(body));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    });
}

function extractContentJSON(html) {
    const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRe.exec(html)) !== null) {
        const src = m[1];
        if (!src.includes("const content")) continue;
        const eqIdx = src.indexOf("=", src.indexOf("const content")) + 1;
        const braceIdx = src.indexOf("{", eqIdx);
        if (braceIdx === -1) continue;
        let depth = 0, i = braceIdx;
        for (; i < src.length; i++) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") { depth--; if (depth === 0) break; }
        }
        try { return JSON.parse(src.slice(braceIdx, i + 1)); }
        catch (e) { throw new Error("JSON parse gagal: " + e.message); }
    }
    throw new Error("Objek 'content' tidak ditemukan.");
}

function findButtons(obj, out = []) {
    if (Array.isArray(obj)) obj.forEach(v => findButtons(v, out));
    else if (obj && typeof obj === "object") {
        if (obj.type === "button") out.push(obj);
        Object.values(obj).forEach(v => findButtons(v, out));
    }
    return out;
}

function normalizeLabel(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function isDisabled(button) {
    return button.disabled === true ||
        button.disabled === 1 ||
        String(button.disabled).toLowerCase() === "true";
}

function openInBrowser(url) {
    if (process.platform === "win32") {
        CHROME_PROFILES.forEach(profile => {
            try {
                execSync(`start chrome --profile-directory="${profile}" "${url}"`);
                console.log(`  ✅ Opened: ${profile}`);
            } catch (e) {
                console.warn(`  ⚠️  Gagal buka ${profile}: ${e.message}`);
            }
        });
        return true;
    } else if (process.platform === "darwin") {
        CHROME_PROFILES.forEach(profile => {
            try {
                execSync(`open -na "Google Chrome" --args --profile-directory="${profile}" "${url}"`);
                console.log(`  ✅ Opened: ${profile}`);
            } catch (e) {
                console.warn(`  ⚠️  Gagal buka ${profile}: ${e.message}`);
            }
        });
        return true;
    }
}

function clearLine() {
    process.stdout.write("\r\x1b[K");
}

function printSpinner(attempt, label) {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const frame = frames[attempt % frames.length];
    process.stdout.write(`\r  ${frame}  [#${attempt}] ${timestamp()} — Menunggu button "${label}" aktif...`);
}

// ── Polling ──────────────────────────────────────────────────────

async function poll(source, isLocal) {
    const label = todayLabel();
    const hr = "─".repeat(56);

    console.log("\n" + hr);
    console.log("  🎫  Loket Ticket Link Finder  —  POLLING MODE");
    console.log(hr);
    console.log(`  🗓  Target label  : "${label}"`);
    console.log(`  🔁  Interval      : setiap ${INTERVAL_MS / 1000} detik`);
    console.log(`  🌐  Sumber        : ${isLocal ? path.resolve(source) : source}`);
    console.log(hr + "\n");

    let attempt = 0;

    while (true) {
        attempt++;

        // ── Ambil HTML ──
        let html = "";
        try {
            if (isLocal) {
                html = fs.readFileSync(source, "utf8");
            } else {
                html = await fetchHTML(source);
            }
        } catch (err) {
            clearLine();
            console.log(`  ⚠️  [#${attempt}] ${timestamp()} Fetch error: ${err.message} — retry dalam ${RETRY_ON_ERROR / 1000}s`);
            await sleep(RETRY_ON_ERROR);
            continue;
        }

        // ── Parse & cari button ──
        let buttons = [];
        try {
            const contentObj = extractContentJSON(html);
            buttons = findButtons(contentObj);
        } catch (err) {
            clearLine();
            console.log(`  ⚠️  [#${attempt}] ${timestamp()} Parse error: ${err.message}`);
            await sleep(INTERVAL_MS);
            continue;
        }

        // ── Cari button hari ini ──
        const todayBtns = buttons.filter(b => normalizeLabel(b.label) === label);
        const linkedBtn = todayBtns.find(b => b.link);

        if (linkedBtn && linkedBtn.link) {
            // ── DAPAT! ──
            clearLine();
            console.log("\n" + hr);
            console.log(`  ✅  LINK TANGGAL DITEMUKAN! (attempt #${attempt})`);
            console.log(hr);
            console.log(`  🏷️   Label    : ${linkedBtn.label}`);
            console.log(`  🔒  Disabled : ${isDisabled(linkedBtn) ? "yes" : "no"}`);
            console.log(`  🔗  Link     : ${linkedBtn.link}`);
            console.log(hr);
            console.log(`\n  🚀 Membuka di browser...\n`);

            const opened = openInBrowser(linkedBtn.link);
            if (!opened) {
                console.log("  ⚠️  Browser tidak bisa dibuka otomatis.");
                console.log("     Salin link di atas dan buka manual.\n");
            }

            process.exit(0);

        } else if (todayBtns.length > 0) {
            // Button ada tapi masih disabled
            printSpinner(attempt, label);
            await sleep(INTERVAL_MS);

        } else {
            // Button belum ada sama sekali
            printSpinner(attempt, label);
            await sleep(INTERVAL_MS);
        }
    }
}

// ── Main ─────────────────────────────────────────────────────────
(async () => {
    const isLocal = ARG && !ARG.startsWith("http") && fs.existsSync(ARG);
    const source = isLocal ? ARG : (ARG.startsWith("http") ? ARG : PAGE_URL);

    // Kalau local file mode, langsung poll
    if (isLocal) return poll(source, true);

    // Cek dulu apakah bisa fetch live
    console.log(`\n  🌐 Mengecek koneksi ke ${source}...`);
    try {
        await fetchHTML(source);
        console.log("  ✅ Koneksi OK, mulai polling...");
        return poll(source, false);
    } catch (err) {
        // Fallback ke page.html kalau ada
        const fallback = path.join(process.cwd(), "page.html");
        if (fs.existsSync(fallback)) {
            console.warn(`  ⚠️  Fetch gagal (${err.message}), fallback ke page.html`);
            return poll(fallback, true);
        }
        console.error([
            `  ❌ Fetch gagal: ${err.message}`,
            "",
            "  Cara pakai lokal:",
            "    1. Buka halaman di browser → Ctrl+S → simpan sebagai page.html",
            "    2. Letakkan di folder yang sama dengan script ini",
            "    3. node get_ticket_link.js page.html",
            "",
        ].join("\n"));
        process.exit(1);
    }
})();
