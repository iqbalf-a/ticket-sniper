/**
 * get_ticket_link_westlife.js
 * ──────────────────────────────────────────────────────────────
 * Polling loop khusus untuk halaman event Loket pola "Buy Tickets":
 * - Button berlabel "Buy Tickets", tanggal ada di text_editor sibling
 * - Hanya ambil button dari kolom yang mengandung tanggal hari ini
 *
 * Usage:
 *   node get_ticket_link_westlife.js
 *   node get_ticket_link_westlife.js response.js   ← file lokal (test)
 * ──────────────────────────────────────────────────────────────
 */

"use strict";

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Config ───────────────────────────────────────────────────────
const PAGE_URL = "https://westlifestadiumshowjkt.com/";
const ARG = process.argv[2] || "";

const INTERVAL_MS = 100;
const RETRY_ON_ERROR = 5000;

// Isi untuk testing tanggal tertentu, kosongkan untuk pakai hari ini
// const TARGET_DATE_OVERRIDE = "21 May 2026";  // contoh: "21 May 2026"
const TARGET_DATE_OVERRIDE = "";  // contoh: "21 May 2026"

// ── Config profiles Chrome ───────────────────────────────────────
const CHROME_PROFILES = [
    "Default",
    "Profile 1",
    "Profile 2",
    "Profile 4",
];

const BULAN_EN = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December",
};

// ── Helpers ──────────────────────────────────────────────────────

function todayLabel() {
    if (TARGET_DATE_OVERRIDE) return TARGET_DATE_OVERRIDE;
    const d = new Date();
    return `${d.getDate()} ${BULAN_EN[d.getMonth() + 1]} ${d.getFullYear()}`;
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
                "Cache-Control": "no-cache",
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

function isActive(button) {
    const disabled = button.disabled === true ||
        button.disabled === 1 ||
        String(button.disabled).toLowerCase() === "true";
    return !disabled && typeof button.link === "string" && button.link.trim() !== "";
}

// Cari button dari kolom yang htmlContent-nya mengandung tanggal target
function findButtonByDate(contentObj, dateLabel) {
    const sections = contentObj?.layout?.sections || [];
    for (const section of sections) {
        for (const row of section.rows || []) {
            for (const column of row.columns || []) {
                const elements = column.elements || [];
                const hasDate = elements.some(el =>
                    el.type === "text_editor" &&
                    typeof el.htmlContent === "string" &&
                    el.htmlContent.includes(dateLabel)
                );
                if (hasDate) {
                    return elements.find(el => el.type === "button") || null;
                }
            }
        }
    }
    return null;
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

function printSpinner(attempt) {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const frame = frames[attempt % frames.length];
    process.stdout.write(`\r  ${frame}  [#${attempt}] ${timestamp()} — Menunggu button aktif...`);
}

// ── Polling ──────────────────────────────────────────────────────

async function poll(source, isLocal) {
    const label = todayLabel();
    const hr = "─".repeat(56);

    console.log("\n" + hr);
    console.log("  🎫  Loket Ticket Link Finder  —  WESTLIFE MODE");
    console.log(hr);
    console.log(`  🗓  Target tanggal : "${label}"`);
    console.log(`  🔁  Interval       : setiap ${INTERVAL_MS / 1000} detik`);
    console.log(`  🌐  Sumber         : ${isLocal ? path.resolve(source) : source}`);
    console.log(hr + "\n");

    let attempt = 0;

    while (true) {
        attempt++;

        let html = "";
        try {
            html = isLocal ? fs.readFileSync(source, "utf8") : await fetchHTML(source);
        } catch (err) {
            clearLine();
            console.log(`  ⚠️  [#${attempt}] ${timestamp()} Fetch error: ${err.message} — retry dalam ${RETRY_ON_ERROR / 1000}s`);
            await sleep(RETRY_ON_ERROR);
            continue;
        }

        let btn = null;
        try {
            btn = findButtonByDate(extractContentJSON(html), label);
        } catch (err) {
            clearLine();
            console.log(`  ⚠️  [#${attempt}] ${timestamp()} Parse error: ${err.message}`);
            await sleep(INTERVAL_MS);
            continue;
        }

        if (btn && isActive(btn)) {
            clearLine();
            console.log("\n" + hr);
            console.log(`  ✅  BUTTON AKTIF DITEMUKAN! (attempt #${attempt})`);
            console.log(hr);
            console.log(`  🗓  Tanggal : ${label}`);
            console.log(`  🔗  Link   : ${btn.link}`);
            console.log(hr);
            console.log(`\n  🚀 Membuka di browser...\n`);

            const opened = openInBrowser(btn.link);
            if (!opened) {
                console.log("  ⚠️  Browser tidak bisa dibuka otomatis.");
                console.log("     Salin link di atas dan buka manual.\n");
            }

            process.exit(0);

        } else {
            printSpinner(attempt);
            await sleep(INTERVAL_MS);
        }
    }
}

// ── Main ─────────────────────────────────────────────────────────
(async () => {
    const isLocal = ARG && !ARG.startsWith("http") && fs.existsSync(ARG);
    const source = isLocal ? ARG : (ARG.startsWith("http") ? ARG : PAGE_URL);

    if (isLocal) return poll(source, true);

    console.log(`\n  🌐 Mengecek koneksi ke ${source}...`);
    try {
        await fetchHTML(source);
        console.log("  ✅ Koneksi OK, mulai polling...");
        return poll(source, false);
    } catch (err) {
        const fallback = path.join(process.cwd(), "response.js");
        if (fs.existsSync(fallback)) {
            console.warn(`  ⚠️  Fetch gagal (${err.message}), fallback ke response.js`);
            return poll(fallback, true);
        }
        console.error([
            `  ❌ Fetch gagal: ${err.message}`,
            "",
            "  Cara pakai lokal:",
            "    node get_ticket_link_westlife.js response.js",
            "",
        ].join("\n"));
        process.exit(1);
    }
})();
