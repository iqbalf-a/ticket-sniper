"use strict";

module.exports = {
    EDGE_EXE:       "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    PROFILES_DIR:   "D:\\ticket-sniper-profiles\\edge",
    PROFILE_COUNT:  20,   // ganti 5 kalau laptop terasa berat
    PROFILE_PREFIX: "sniper",
    BATCH_SIZE:     5,    // buka 5 dulu, jeda, lalu 5 berikutnya
    BATCH_DELAY_MS: 3000, // jeda 3 detik antar batch agar Edge sempat init
    OPEN_DELAY_MS:  500,  // jeda 0.5 detik antar tiap instance
    QUEUE_URL:      "https://www.tiket.com/id-id/to-do/bts-jakarta-3rdshowday",
};
