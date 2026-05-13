// ==UserScript==
// @name         Loket Ticket Watcher
// @namespace    ticket-sniper
// @version      1.0
// @description  Reload Loket saat Full Booked, stop saat Sold Out atau status berubah
// @match        https://widget.loket.com/widget/*
// @match        https://widget.loket.com/*
// @match        https://*.loket.com/*
// @include      /^https:\/\/widget\.loket\.com\/.*$/
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    "use strict";

    console.log("[Ticket Sniper] userscript injected", location.href);

    const INTERVAL_MS = 1500;
    const WAS_FULL_BOOKED_KEY = "ticket_sniper_was_full_booked";
    const RELOAD_COUNT_KEY = "ticket_sniper_reload_count";

    function pageText() {
        return (document.body?.innerText || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function countMatches(text, regex) {
        return (text.match(regex) || []).length;
    }

    function readState() {
        const text = pageText();
        return {
            fullBooked: countMatches(text, /full\s*book(?:ed)?|fully\s*book(?:ed)?|penuh/g),
            soldOut: countMatches(text, /sold\s*out|habis\s*terjual|terjual\s*habis/g),
            quantity: countMatches(text, /quantity|qty|jumlah|\bsubtotal\s*\(\s*[1-9]\d*\s*ticket\s*\)/g),
            available: countMatches(text, /\bbeli\b|\bpesan\b|\bbuy\b|\bcheckout\b/g),
        };
    }

    function wasFullBooked() {
        return sessionStorage.getItem(WAS_FULL_BOOKED_KEY) === "1";
    }

    function setWasFullBooked(value) {
        if (value) {
            sessionStorage.setItem(WAS_FULL_BOOKED_KEY, "1");
        } else {
            sessionStorage.removeItem(WAS_FULL_BOOKED_KEY);
        }
    }

    function getReloadCount() {
        return Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || 0);
    }

    function setReloadCount(value) {
        sessionStorage.setItem(RELOAD_COUNT_KEY, String(value));
    }

    function resetReloadCount() {
        sessionStorage.removeItem(RELOAD_COUNT_KEY);
    }

    function showBadge(message, color = "#111827") {
        const id = "ticket-sniper-badge";
        let badge = document.getElementById(id);

        if (!badge) {
            badge = document.createElement("div");
            badge.id = id;
            badge.style.cssText = [
                "position:fixed",
                "right:16px",
                "bottom:16px",
                "z-index:999999",
                "padding:10px 12px",
                "border-radius:8px",
                `background:${color}`,
                "color:#fff",
                "font:13px/1.4 Arial,sans-serif",
                "box-shadow:0 8px 24px rgba(0,0,0,.25)",
                "max-width:320px",
            ].join(";");
            document.body.appendChild(badge);
        }

        badge.textContent = message;
    }

    function reloadSoon(reason) {
        const count = getReloadCount();

        setReloadCount(count + 1);
        showBadge(`Ticket Sniper: ${reason}. Reload #${count + 1} dalam ${INTERVAL_MS}ms`, "#1f2937");
        console.log("[Ticket Sniper]", "reload", { count: count + 1, reason });

        setTimeout(() => location.reload(), INTERVAL_MS);
    }

    function run() {
        if (!document.body) {
            console.log("[Ticket Sniper] body belum siap, retry...");
            setTimeout(run, 500);
            return;
        }

        const state = readState();
        const hadFullBooked = wasFullBooked();
        console.log("[Ticket Sniper] state", { ...state, hadFullBooked });

        if (state.fullBooked > 0) {
            setWasFullBooked(true);
            reloadSoon(`Full Booked terdeteksi (${state.fullBooked})`);
            return;
        }

        if (hadFullBooked) {
            setWasFullBooked(false);
            resetReloadCount();
            showBadge("Ticket Sniper: Full Booked berubah. Cek tiket sekarang.", "#047857");
            document.title = "CEK TIKET - Full Booked berubah";
            alert("Full Booked berubah. Cek tiket sekarang.");
            console.log("[Ticket Sniper]", "full booked changed", state);
            return;
        }

        if (state.quantity > 0 || state.available > 0) {
            setWasFullBooked(false);
            resetReloadCount();
            showBadge("Ticket Sniper: quantity/available terdeteksi. Cek tiket sekarang.", "#047857");
            document.title = "CEK TIKET - tersedia";
            console.log("[Ticket Sniper]", "available/quantity detected", state);
            return;
        }

        if (state.soldOut > 0) {
            setWasFullBooked(false);
            resetReloadCount();
            showBadge(`Ticket Sniper: Sold Out terdeteksi (${state.soldOut}). Stop.`, "#991b1b");
            document.title = "Sold Out - stopped";
            console.log("[Ticket Sniper]", "sold out stop", state);
            return;
        }

        setWasFullBooked(false);
        resetReloadCount();
        showBadge("Ticket Sniper: tidak menemukan Full Booked/Sold Out. Stop.", "#374151");
        console.log("[Ticket Sniper]", "no matching status stop", state);
    }

    setTimeout(run, 1200);
})();
