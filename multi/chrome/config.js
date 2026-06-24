"use strict";

module.exports = {
    CHROME_EXE:    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    CONTEXT_COUNT: 4,

    // URL yang trigger queue — harus /packages karena itu yang di-gate Queue-IT + butuh login
    QUEUE_URL:     "https://www.tiket.com/id-id/to-do/bts-jakarta-3rdshowday/packages",

    // Session cookie akun yang sudah login — diinjek ke browser setelah lolos queue
    // Copy dari DevTools → Network → request tiket.com → Request Headers → Cookie
    SESSION_COOKIE: "",
};
