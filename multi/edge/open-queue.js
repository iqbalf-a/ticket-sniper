/**
 * multi/edge/open-queue.js
 * Buka semua profile Microsoft Edge dengan QUEUE_URL secara bersamaan.
 *
 * Usage:
 *   node multi/edge/open-queue.js              ← buka semua profile
 *   node multi/edge/open-queue.js 1 20         ← hanya profile 1–20
 *
 * Tidak perlu create-profiles — Edge membuat profil sendiri.
 */

"use strict";

const { spawn } = require("child_process");
const fs           = require("fs");
const path         = require("path");
const {
    EDGE_EXE, PROFILES_DIR, PROFILE_COUNT, PROFILE_PREFIX,
    BATCH_SIZE, BATCH_DELAY_MS, OPEN_DELAY_MS, QUEUE_URL,
} = require("./config");

const args = process.argv.slice(2);
const from = args[0] ? parseInt(args[0]) : 1;
const to   = args[1] ? parseInt(args[1]) : PROFILE_COUNT;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const EDGE_FLAGS = [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-hang-monitor",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--disable-features=SigninInterceptBubble,msSmartScreenProtection",
    "--suppress-message-center-popups",
];

function clearEdgeSession(profileDir) {
    const sessionFiles = [
        "Current Session", "Current Tabs",
        "Last Session",    "Last Tabs",
    ];
    const defaultDir = path.join(profileDir, "Default");
    for (const name of sessionFiles) {
        const p = path.join(defaultDir, name);
        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* biarkan jika sedang dipakai */ }
    }
}

function openEdge(profileDir, url) {
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    const firstRunFile = path.join(profileDir, "First Run");
    if (!fs.existsSync(firstRunFile)) fs.writeFileSync(firstRunFile, "");

    clearEdgeSession(profileDir);

    const child = spawn(EDGE_EXE, [
        `--user-data-dir=${profileDir}`,
        ...EDGE_FLAGS,
        url,
    ], { detached: true, stdio: "ignore" });
    child.unref();
}

(async () => {
    const hr = "─".repeat(60);
    console.log(`\n${hr}`);
    console.log("  Multi-Profile Edge Queue Opener");
    console.log(hr);
    console.log(`  Profile : ${from}–${to} (${to - from + 1} instance)`);
    console.log(`  Batch   : ${BATCH_SIZE} per batch, jeda ${BATCH_DELAY_MS}ms`);
    console.log(`  URL     : ${QUEUE_URL.slice(0, 60)}...`);
    console.log(`${hr}\n`);

    let count = 0;
    for (let i = from; i <= to; i++) {
        const name       = `${PROFILE_PREFIX}-${String(i).padStart(3, "0")}`;
        const profileDir = path.join(PROFILES_DIR, name);
        try {
            openEdge(profileDir, QUEUE_URL);
            count++;
            process.stdout.write(`\r  Dibuka: ${count} / ${to - from + 1}  (${name})`);
        } catch (err) {
            console.error(`\n  ⚠️  Gagal buka ${name}: ${err.message}`);
        }
        if (i < to) await sleep(OPEN_DELAY_MS);
        if (count % BATCH_SIZE === 0 && i < to) await sleep(BATCH_DELAY_MS);
    }
    console.log(`\n\n  ✅ Selesai. ${count} Edge dibuka.\n`);
})();
