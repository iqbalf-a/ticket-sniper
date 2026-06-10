"use strict";

const { execFile } = require("child_process");
const { randomUUID } = require("crypto");

// ── Config ───────────────────────────────────────────────────────
const EVENT_ID    = "btsweverseday1";
const TARGET_URL  = "https://www.tiket.com/id-id/to-do/bts-jakarta-day1";
const LABEL       = "BTS Jakarta Day 1";
const TOTAL       = 30;    // total UUID yang dicoba
const CONCURRENCY = 5;     // request paralel sekaligus
const FAST_MS     = 1000;  // threshold "cepat"

function buildUrl(q) {
    const p = new URLSearchParams({ c: "tiket", e: EVENT_ID, q, t: TARGET_URL, cid: "en-US", l: LABEL });
    return `https://queue.tiket.com/?${p}`;
}

function hit(q) {
    return new Promise(resolve => {
        const url = buildUrl(q);
        execFile("curl", [
            "-s", "-o", "NUL",
            "--max-time", "10",
            "--location",
            "-w", "%{http_code}|||%{time_total}|||%{url_effective}",
            "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
            "-H", "Accept: text/html,application/xhtml+xml,*/*",
            url,
        ], { encoding: "utf8", timeout: 15000 }, (err, stdout) => {
            if (err && !stdout) {
                resolve({ q, code: 0, ms: 0, finalUrl: url, error: err.message });
                return;
            }
            const [codeStr, timeStr, finalUrl] = (stdout || "").split("|||");
            resolve({
                q,
                code:     parseInt(codeStr) || 0,
                ms:       Math.round(parseFloat(timeStr || "0") * 1000),
                finalUrl: (finalUrl || url).trim(),
                error:    null,
            });
        });
    });
}

(async () => {
    const hr = "─".repeat(72);
    console.log(`\n${hr}`);
    console.log(`  Queue Tester — ${EVENT_ID}`);
    console.log(hr);
    console.log(`  Total    : ${TOTAL} requests`);
    console.log(`  Paralel  : ${CONCURRENCY}`);
    console.log(`  Threshold: ${FAST_MS}ms`);
    console.log(`${hr}\n`);
    console.log(`  ${"q (uuid)".padEnd(38)} ${"code".padEnd(6)} ${"ms".padStart(7)}`);
    console.log(`  ${"-".repeat(55)}`);

    const fast = [];

    for (let i = 0; i < TOTAL; i += CONCURRENCY) {
        const batch = Array.from({ length: Math.min(CONCURRENCY, TOTAL - i) }, () => randomUUID());
        const results = await Promise.all(batch.map(q => hit(q)));

        for (const r of results) {
            const marker = r.ms > 0 && r.ms < FAST_MS ? "  ⚡" : "";
            const msStr  = r.ms > 0 ? `${r.ms}ms` : "ERR";
            console.log(`  ${r.q}  ${String(r.code).padEnd(6)} ${msStr.padStart(7)}${marker}`);
            if (r.ms > 0 && r.ms < FAST_MS) fast.push(r);
        }
    }

    console.log(`\n${hr}`);
    if (fast.length > 0) {
        console.log(`  ⚡ ${fast.length} response di bawah ${FAST_MS}ms:\n`);
        fast.forEach(r => {
            console.log(`  q=${r.q}`);
            console.log(`    ${r.ms}ms  code=${r.code}`);
            console.log(`    ${r.finalUrl}`);
        });
    } else {
        console.log(`  Tidak ada response di bawah ${FAST_MS}ms.`);
    }
    console.log(`${hr}\n`);
})();
