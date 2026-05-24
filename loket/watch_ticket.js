/**
 * watch_ticket.js
 * ─────────────────────────────────────────────────────────────
 * Monitor widget Loket — reload terus sampai kondisi berhenti.
 *
 * STOP + window tetap buka  →  Full Booked hilang / jadi quantity
 * STOP + window tetap buka  →  semua tiket Sold Out
 * LANJUT reload             →  ada yang masih Full Booked
 *
 * Mau pakai 2 profile? Buka 2 terminal, jalankan script 2x.
 *
 * Usage:
 *   node watch_ticket.js [WIDGET_URL]
 *
 * Setup:
 *   npm install puppeteer-core
 * ─────────────────────────────────────────────────────────────
 */

"use strict";

const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Config ───────────────────────────────────────────────────

const WIDGET_URL = process.argv[2]
    || "https://widget.loket.com/widget/5601fcaa078034c8ffac";

const CHROME_PATHS_WIN = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
];
const CHROME_PATH_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const CHROME_USER_DATA_WIN = path.join(
    process.env.LOCALAPPDATA || `C:\\Users\\${process.env.USERNAME}\\AppData\\Local`,
    "Google", "Chrome", "ticket-sniper"
);
const CHROME_USER_DATA_MAC = path.join(
    process.env.HOME || "/tmp",
    "Library", "Application Support", "Google", "Chrome", "ticket-sniper"
);

// Jeda antar reload (ms) — 0 = secepat mungkin
const INTERVAL_MS = 0;

// ── Helpers ──────────────────────────────────────────────────

function killChrome() {
    try {
        if (process.platform === "win32") {
            execSync("taskkill /F /IM chrome.exe", { stdio: "ignore" });
        } else if (process.platform === "darwin") {
            execSync('pkill -f "Google Chrome"', { stdio: "ignore" });
        }
        console.log("  🔫  Chrome ditutup otomatis.\n");
    } catch {
        // Chrome tidak sedang berjalan, lanjut
    }
}

function getChromePath() {
    if (process.platform === "darwin") return CHROME_PATH_MAC;
    for (const p of CHROME_PATHS_WIN) {
        try { fs.accessSync(p); return p; } catch { }
    }
    throw new Error("Chrome tidak ditemukan. Set path di CHROME_PATHS_WIN.");
}

function timestamp() {
    return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

function statusIcon(s) {
    switch (s) {
        case "sold_out": return "🔴 Sold Out  ";
        case "full_booked": return "🟠 Full Book ";
        case "available": return "🟢 TERSEDIA  ";
        default: return "⚪ Unknown   ";
    }
}

// ── Scraper (dijalankan di dalam browser) ─────────────────────

function scrapeTickets() {
    const results = [];

    const cardSelectors = [
        '[class*="ticket-item"]',
        '[class*="ticket_item"]',
        '[class*="TicketItem"]',
        '[class*="ticket-card"]',
        '[class*="product-item"]',
        '[class*="ProductItem"]',
    ];

    let cards = [];
    for (const sel of cardSelectors) {
        const found = [...document.querySelectorAll(sel)];
        if (found.length > 0) { cards = found; break; }
    }

    if (cards.length === 0) {
        document.querySelectorAll("button").forEach(btn => {
            const parent = btn.closest("div, article, section, li");
            if (parent && !cards.includes(parent)) cards.push(parent);
        });
    }

    cards.forEach(card => {
        const nameEl = card.querySelector(
            '[class*="name"], [class*="title"], [class*="Name"], [class*="Title"], h3, h4, strong, b'
        );
        const name = nameEl?.innerText?.trim() || card.innerText?.split("\n")[0]?.trim() || "Unknown";
        const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
        const price = priceEl?.innerText?.trim() || "-";
        const btn = card.querySelector("button");
        const btnText = btn?.innerText?.trim() || "";
        const hasQty = !!card.querySelector('input[type="number"]') || card.querySelectorAll("button").length > 1;

        let status = "available";
        const lower = btnText.toLowerCase();
        if (lower.includes("sold out") || lower.includes("terjual habis")) {
            status = "sold_out";
        } else if (lower.includes("full book") || lower.includes("fully book") || lower.includes("penuh")) {
            status = "full_booked";
        }

        results.push({ name, price, status, btnText, hasQty });
    });

    return results;
}

// ── Evaluate ─────────────────────────────────────────────────

function evaluate(tickets, prevStatus) {
    if (!tickets || tickets.length === 0)
        return { stop: false, reason: "no_data" };

    if (tickets.every(t => t.status === "sold_out"))
        return { stop: true, reason: "all_sold" };

    const slotOpened = tickets.some(t =>
        prevStatus[t.name] === "full_booked" &&
        (t.status === "available" || t.hasQty)
    );
    if (slotOpened)
        return { stop: true, reason: "slot_open" };

    return { stop: false, reason: "monitoring" };
}

// ── Main ─────────────────────────────────────────────────────

(async () => {
    const hr = "─".repeat(58);
    console.log("\n" + hr);
    console.log("  🎫  Loket Ticket Watcher");
    console.log(hr);
    console.log(`  🌐  URL  : ${WIDGET_URL}`);
    console.log(`  🔁  Mode : reload tanpa henti`);
    console.log(`  💡  Tip  : jalankan script 2x di terminal berbeda untuk 2 profile`);
    console.log(hr + "\n");

    const userDataDir = process.platform === "win32" ? CHROME_USER_DATA_WIN : CHROME_USER_DATA_MAC;

    console.log(`  📁  UserData : ${userDataDir}\n`);

    killChrome();

    const browser = await puppeteer.launch({
        executablePath: getChromePath(),
        headless: false,
        userDataDir: userDataDir,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--start-maximized",
        ],
        defaultViewport: null,
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", req => {
        if (["image", "font", "media"].includes(req.resourceType())) req.abort();
        else req.continue();
    });

    let prevStatus = {};
    let attempt = 0;
    let isFirstRun = true;

    console.log("  📄 Membuka halaman...\n");
    await page.goto(WIDGET_URL, { waitUntil: "networkidle2", timeout: 30000 });

    while (true) {
        attempt++;

        if (!isFirstRun) {
            await page.reload({ waitUntil: "networkidle2", timeout: 30000 });
        }
        isFirstRun = false;

        try {
            await page.waitForSelector("button", { timeout: 10000 });
        } catch {
            process.stdout.write(`\r\x1b[K  ⚠️  #${attempt} ${timestamp()} — belum siap, reload...`);
            continue;
        }

        let tickets = [];
        try {
            tickets = await page.evaluate(scrapeTickets);
        } catch (e) {
            process.stdout.write(`\r\x1b[K  ⚠️  #${attempt} ${timestamp()} — scrape error: ${e.message}`);
            continue;
        }

        const result = evaluate(tickets, prevStatus);
        tickets.forEach(t => {
            if (t.status === "full_booked") prevStatus[t.name] = "full_booked";
        });

        // Print status
        process.stdout.write("\r\x1b[K");
        const lines = [`  🔄 #${attempt}  ${timestamp()}`];
        tickets.forEach(t => lines.push(`     ${statusIcon(t.status)} ${t.name}  ${t.price}`));
        const lineCount = lines.length;
        process.stdout.write(lines.join("\n") + "\n");

        // ── STOP: slot terbuka ──
        if (result.reason === "slot_open") {
            console.log("\n" + hr);
            console.log("  🔥  SLOT TERBUKA! Selesaikan pembelian di window ini.");
            console.log(hr + "\n");
            await page.bringToFront();
            break;
        }

        // ── STOP: semua sold out ──
        if (result.reason === "all_sold") {
            console.log("\n" + hr);
            console.log("  🔴  SEMUA SOLD OUT. Tidak ada harapan lagi.");
            console.log(hr + "\n");
            break;
        }

        if (INTERVAL_MS > 0) await new Promise(r => setTimeout(r, INTERVAL_MS));
        process.stdout.write(`\x1b[${lineCount + 1}A`);
    }
})();
