/**
 * watch_clipboard_reload.js
 * Reload tab Chrome aktif memakai Ctrl+A/Ctrl+C, tanpa Puppeteer dan tanpa profile baru.
 *
 * Cara kerja:
 *   1. Fokuskan window Chrome.
 *   2. Ctrl+A, Ctrl+C untuk membaca teks halaman aktif.
 *   3. Kalau semua Sold Out / Habis Terjual: berhenti.
 *   4. Kalau ada Full Book / Full Booked / sejenisnya: reload terus.
 *   5. Kalau Full Booked yang dipantau hilang: berhenti agar bisa dicek/beli.
 *
 * Catatan:
 *   Script ini memakai Windows SendKeys dan clipboard.
 *   Jangan pindah fokus window saat script berjalan.
 *
 * Usage:
 *   node watch_clipboard_reload.js
 */

"use strict";

const { execFileSync } = require("child_process");

const INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS || 750);
const COPY_WAIT_MS = Number(process.env.COPY_WAIT_MS || 250);
const AFTER_RELOAD_WAIT_MS = Number(process.env.AFTER_RELOAD_WAIT_MS || 1200);

// Isi kategori yang ingin dipantau. Kosong = pantau semua.
// Contoh: ["VIP", "CAT 6"]
const WATCH_CATEGORIES = ["VIP", "CAT 6"];

function timestamp() {
    return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function runPowerShell(script) {
    return execFileSync("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ], {
        encoding: "utf8",
        windowsHide: true,
        timeout: 10000,
    });
}

function sendKeys(keys) {
    const escaped = keys.replace(/'/g, "''");
    runPowerShell(`
        $wshell = New-Object -ComObject WScript.Shell
        $wshell.AppActivate('Google Chrome') | Out-Null
        Start-Sleep -Milliseconds 100
        $wshell.SendKeys('${escaped}')
    `);
}

function readActivePageText() {
    return runPowerShell(`
        $wshell = New-Object -ComObject WScript.Shell
        $wshell.AppActivate('Google Chrome') | Out-Null
        Start-Sleep -Milliseconds 120
        $wshell.SendKeys('^a')
        Start-Sleep -Milliseconds ${COPY_WAIT_MS}
        $wshell.SendKeys('^c')
        Start-Sleep -Milliseconds ${COPY_WAIT_MS}
        Get-Clipboard -Raw
    `);
}

function countMatches(text, regex) {
    return (text.match(regex) || []).length;
}

// Ambil ~300 karakter setelah nama kategori ditemukan di teks
function sliceAfterCategory(normalized, category) {
    const idx = normalized.indexOf(category.toLowerCase());
    if (idx === -1) return null;
    return normalized.slice(idx, idx + 300);
}

function getPageState(text) {
    const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();

    let scope = normalized;

    if (WATCH_CATEGORIES.length > 0) {
        const slices = WATCH_CATEGORIES
            .map(cat => sliceAfterCategory(normalized, cat))
            .filter(Boolean);

        if (slices.length === 0) {
            // Kategori yang dipantau belum muncul di halaman
            return {
                fullBookedCount: 0, soldOutCount: 0, availableCount: 0, quantityCount: 0,
                hasFullBooked: false, hasSoldOut: false, hasAvailable: false, hasQuantity: false,
                textLength: text.length, categoriesFound: false,
            };
        }

        scope = slices.join(" ");
    }

    const fullBookedCount = countMatches(scope, /full\s*book(?:ed)?|fully\s*book(?:ed)?|penuh/g);
    const soldOutCount    = countMatches(scope, /sold\s*out|habis\s*terjual|terjual\s*habis/g);
    const quantityCount   = countMatches(scope, /quantity|qty|jumlah|\bsubtotal\s*\(\s*[1-9]\d*\s*ticket\s*\)/g);
    const availableCount  = countMatches(scope, /\bbeli\b|\bpesan\b|\bbuy\b|\bcheckout\b/g);

    return {
        fullBookedCount,
        soldOutCount,
        availableCount,
        quantityCount,
        hasFullBooked: fullBookedCount > 0,
        hasSoldOut: soldOutCount > 0,
        hasAvailable: availableCount > 0,
        hasQuantity: quantityCount > 0,
        textLength: text.length,
        categoriesFound: WATCH_CATEGORIES.length === 0 || true,
    };
}

function printState(attempt, state) {
    console.log(
        `[#${attempt}] ${timestamp()} ` +
        `fullBooked=${state.fullBookedCount} ` +
        `soldOut=${state.soldOutCount} ` +
        `availableWords=${state.availableCount} ` +
        `quantity=${state.quantityCount} ` +
        `text=${state.textLength}`
    );
}

function stop(message, hr) {
    console.log(`\n${hr}`);
    console.log(message);
    console.log(hr + "\n");
}

(async () => {
    const hr = "-".repeat(64);
    console.log(`\n${hr}`);
    console.log("Loket Active Chrome Window Watcher");
    console.log(hr);
    console.log(`Interval   : ${INTERVAL_MS} ms`);
    console.log(`Mode       : baca tab Chrome aktif via Ctrl+A/Ctrl+C, reload via Ctrl+R`);
    console.log(`Kategori   : ${WATCH_CATEGORIES.length > 0 ? WATCH_CATEGORIES.join(", ") : "semua"}`);
    console.log(hr + "\n");

    let attempt = 0;
    let wasMonitoringFullBooked = false;

    while (true) {
        attempt++;

        const text = readActivePageText();
        const state = getPageState(text);
        printState(attempt, state);

        // Kategori yang dipantau belum muncul di halaman, tunggu dulu
        if (state.categoriesFound === false) {
            console.log(`  Menunggu kategori [${WATCH_CATEGORIES.join(", ")}] muncul di halaman...`);
            await sleep(INTERVAL_MS);
            continue;
        }

        // Aturan 2: selama ada Full Book / Full Booked / sejenisnya, reload terus.
        if (state.hasFullBooked) {
            wasMonitoringFullBooked = true;
            console.log("  Full Book / Full Booked terdeteksi, reload tab aktif...");
            sendKeys("^r");
            await sleep(AFTER_RELOAD_WAIT_MS + INTERVAL_MS);
            continue;
        }

        // Aturan 3: sebelumnya Full Booked, sekarang sudah hilang.
        // Bisa berubah jadi input quantity, tersedia, atau status lain; stop untuk aksi manual.
        if (wasMonitoringFullBooked) {
            stop("Full Book / Full Booked tadi sudah hilang. Cek tab Chrome sekarang.", hr);
            break;
        }

        // Aturan 3 juga: kalau langsung terlihat quantity/input pembelian, stop.
        if (state.hasQuantity) {
            stop("Input/teks quantity terdeteksi. Cek tab Chrome sekarang.", hr);
            break;
        }

        // Aturan 1: tidak ada Full Booked dan yang terlihat Sold Out, berarti tidak perlu reload.
        if (state.hasSoldOut) {
            stop("Sold Out / Habis Terjual semua, tidak ada Full Booked. Script berhenti.", hr);
            break;
        }

        // Aturan 3: bukan Sold Out dan bukan Full Booked, jadi ada perubahan yang perlu dicek.
        if (state.hasAvailable) {
            stop("Status bukan Sold Out dan bukan Full Booked. Cek tab Chrome sekarang.", hr);
            break;
        }

        stop("Tidak menemukan Sold Out atau Full Booked. Script berhenti, cek tab Chrome sekarang.", hr);
        break;
    }
})().catch(error => {
    console.error("\nGagal membaca/reload tab Chrome aktif.");
    console.error(error.message);
    process.exit(1);
});
