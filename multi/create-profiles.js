/**
 * multi/create-profiles.js
 * Buat N folder profile Firefox di PROFILES_DIR.
 *
 * Usage:
 *   node multi/create-profiles.js
 *
 * Jalankan sekali saja. Folder profile dibuat kosong —
 * Firefox akan inisialisasi isinya saat pertama kali dibuka.
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const { PROFILES_DIR, PROFILE_COUNT, PROFILE_PREFIX } = require("./config");

if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
    console.log(`Dibuat: ${PROFILES_DIR}`);
}

let created = 0;
let skipped = 0;

for (let i = 1; i <= PROFILE_COUNT; i++) {
    const name = `${PROFILE_PREFIX}-${String(i).padStart(3, "0")}`;
    const dir  = path.join(PROFILES_DIR, name);

    if (fs.existsSync(dir)) {
        skipped++;
    } else {
        fs.mkdirSync(dir, { recursive: true });
        created++;
    }
}

console.log(`\nSelesai.`);
console.log(`  Dibuat : ${created} profile`);
console.log(`  Skip   : ${skipped} sudah ada`);
console.log(`  Total  : ${PROFILE_COUNT} profile di ${PROFILES_DIR}\n`);
