"use strict";

module.exports = {
    // Path Firefox executable
    FIREFOX_EXE: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",

    // Folder tempat menyimpan semua profile
    PROFILES_DIR: "D:\\ticket-sniper-profiles",

    // Jumlah profile
    PROFILE_COUNT: 5,

    // Prefix nama profile
    PROFILE_PREFIX: "sniper",

    // Berapa Firefox dibuka per batch (jeda BATCH_DELAY_MS antar batch)
    BATCH_SIZE: 10,
    BATCH_DELAY_MS: 500,

    // URL queue — ganti sesuai event
    QUEUE_URL: "https://queue.tiket.com/?c=tiket&e=btsweverseday1&t=https%3A%2F%2Fwww.tiket.com%2Fid-id%2Fto-do%2Fbts-jakarta-day1&cid=en-US&l=BTS%20Jakarta%20Day%201",
};
