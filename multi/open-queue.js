/**
 * multi/open-queue.js
 * Buka semua profile Firefox dengan QUEUE_URL secara bersamaan.
 *
 * Usage:
 *   node multi/open-queue.js              ← buka semua profile
 *   node multi/open-queue.js 1 20         ← hanya profile 1–20
 *
 * Setiap Firefox dibuka dengan -no-remote sehingga bisa jalan
 * bersamaan meski profile berbeda. Masing-masing dapat posisi
 * antrean sendiri di Queue-IT.
 */

"use strict";

const { execSync }  = require("child_process");
const path          = require("path");
const { FIREFOX_EXE, PROFILES_DIR, PROFILE_COUNT, PROFILE_PREFIX, BATCH_SIZE, BATCH_DELAY_MS, QUEUE_URL } = require("./config");

const args  = process.argv.slice(2);
const from  = args[0] ? parseInt(args[0]) : 1;
const to    = args[1] ? parseInt(args[1]) : PROFILE_COUNT;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function openFirefox(profileDir, url) {
    const cmd = `start "" "${FIREFOX_EXE}" -profile "${profileDir}" -no-remote "${url}"`;
    execSync(cmd, { shell: true });
}

(async () => {
    const hr = "─".repeat(60);
    console.log(`\n${hr}`);
    console.log("  Multi-Profile Firefox Queue Opener");
    console.log(hr);
    console.log(`  Profile : ${from}–${to} (${to - from + 1} instance)`);
    console.log(`  Batch   : ${BATCH_SIZE} per batch, jeda ${BATCH_DELAY_MS}ms`);
    console.log(`  URL     : ${QUEUE_URL.slice(0, 70)}...`);
    console.log(`${hr}\n`);

    let count = 0;

    for (let i = from; i <= to; i++) {
        const name       = `${PROFILE_PREFIX}-${String(i).padStart(3, "0")}`;
        const profileDir = path.join(PROFILES_DIR, name);

        try {
            openFirefox(profileDir, QUEUE_URL);
            count++;
            process.stdout.write(`\r  Dibuka: ${count} / ${to - from + 1}  (${name})`);
        } catch (err) {
            console.error(`\n  ⚠️  Gagal buka ${name}: ${err.message}`);
        }

        // Jeda antar batch agar tidak freeze
        if (count % BATCH_SIZE === 0) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    console.log(`\n\n  ✅ Selesai. ${count} Firefox dibuka.\n`);
})();
