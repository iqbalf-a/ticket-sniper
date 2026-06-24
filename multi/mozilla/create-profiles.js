/**
 * multi/mozilla/create-profiles.js
 * Buat N folder profile Firefox di PROFILES_DIR.
 *
 * Usage:
 *   node multi/mozilla/create-profiles.js
 *
 * Jalankan sekali saja. Folder profile dibuat kosong —
 * Firefox akan inisialisasi isinya saat pertama kali dibuka.
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const { PROFILES_DIR, PROFILE_COUNT, PROFILE_PREFIX } = require("./config");

const USER_JS = `
user_pref("browser.startup.page", 0);
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("browser.sessionstore.enabled", false);
user_pref("browser.tabs.warnOnClose", false);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.startup.firstrunSkipsHomepage", true);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("browser.newtabpage.enabled", false);
user_pref("dom.min_background_timeout_value", 0);
user_pref("dom.timeout.enable_budget_timer_throttling", false);
user_pref("dom.timeout.background_throttling_max_budget", -1);
user_pref("dom.suspend_inactive.enabled", false);
user_pref("browser.tabs.unloadOnLowMemory", false);
user_pref("dom.ipc.processPriorityManager.enabled", false);
user_pref("dom.visibilityapi.enabled", false);
user_pref("dom.disable_window_move_resize", false);
user_pref("browser.tab-unload-enabled", false);
`.trim();

if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
    console.log(`Dibuat: ${PROFILES_DIR}`);
}

let created = 0;
let updated = 0;
let skipped = 0;

for (let i = 1; i <= PROFILE_COUNT; i++) {
    const name   = `${PROFILE_PREFIX}-${String(i).padStart(3, "0")}`;
    const dir    = path.join(PROFILES_DIR, name);
    const userJs = path.join(dir, "user.js");
    const isNew  = !fs.existsSync(dir);

    if (isNew) {
        fs.mkdirSync(dir, { recursive: true });
        created++;
    }

    const existing = fs.existsSync(userJs) ? fs.readFileSync(userJs, "utf8") : "";
    if (existing !== USER_JS) {
        fs.writeFileSync(userJs, USER_JS, "utf8");
        if (!isNew) updated++;
    } else {
        if (!isNew) skipped++;
    }
}

console.log(`\nSelesai.`);
console.log(`  Dibuat  : ${created} profile baru`);
console.log(`  Updated : ${updated} user.js diperbarui`);
console.log(`  Skip    : ${skipped} sudah up-to-date`);
console.log(`  Total   : ${PROFILE_COUNT} profile di ${PROFILES_DIR}\n`);
