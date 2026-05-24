/**
 * get_ticket_link_join_queue.js
 * Poll halaman event sampai tombol tanggal hari ini aktif.
 * Setelah link ditemukan, buka Chrome profile dan bantu pantau tab aktif
 * sampai teks "Join Queue" muncul.
 *
 * Catatan:
 * - Script ini tidak menyelesaikan verifikasi robot/CAPTCHA.
 * - Selesaikan verifikasi manual di browser.
 * - Jika tombol Join Queue muncul, script hanya memberi notifikasi.
 *
 * Usage:
 *   node get_ticket_link_join_queue.js
 *   node get_ticket_link_join_queue.js page.html
 *   node get_ticket_link_join_queue.js https://example.com/#layout
 */

"use strict";

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");

const PAGE_URL = "https://dyandraglobalstore-04.com/#layout";
const ARG = process.argv[2] || "";

const INTERVAL_MS = 100;
const RETRY_ON_ERROR = 5000;

const WATCH_JOIN_QUEUE = process.env.WATCH_JOIN_QUEUE !== "0";
const JOIN_QUEUE_CHECK_MS = Number(process.env.JOIN_QUEUE_CHECK_MS || 1000);
const COPY_WAIT_MS = Number(process.env.COPY_WAIT_MS || 250);

const BULAN_ID = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
    5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
    9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

const CHROME_PROFILES = [
    "Default",
    "Profile 1",
    "Profile 2",
    "Profile 4",
];

function todayLabel() {
    const d = new Date();
    return `${d.getDate()} ${BULAN_ID[d.getMonth() + 1]} ${d.getFullYear()}`;
}

function timestamp() {
    return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchHTML(url, hops = 0) {
    if (hops > 5) return Promise.reject(new Error("Too many redirects"));

    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
                "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
            },
            timeout: 15000,
        }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchHTML(res.headers.location, hops + 1).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));

            let body = "";
            res.setEncoding("utf8");
            res.on("data", chunk => body += chunk);
            res.on("end", () => resolve(body));
        });

        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Timeout"));
        });
    });
}

function extractContentJSON(html) {
    const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRe.exec(html)) !== null) {
        const src = match[1];
        if (!src.includes("const content")) continue;

        const eqIdx = src.indexOf("=", src.indexOf("const content")) + 1;
        const braceIdx = src.indexOf("{", eqIdx);
        if (braceIdx === -1) continue;

        let depth = 0;
        let i = braceIdx;
        for (; i < src.length; i++) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") {
                depth--;
                if (depth === 0) break;
            }
        }

        try {
            return JSON.parse(src.slice(braceIdx, i + 1));
        } catch (error) {
            throw new Error(`JSON parse gagal: ${error.message}`);
        }
    }

    throw new Error("Objek 'content' tidak ditemukan.");
}

function findButtons(obj, out = []) {
    if (Array.isArray(obj)) {
        obj.forEach(value => findButtons(value, out));
    } else if (obj && typeof obj === "object") {
        if (obj.type === "button") out.push(obj);
        Object.values(obj).forEach(value => findButtons(value, out));
    }

    return out;
}

function openInBrowser(url) {
    if (process.platform === "win32") {
        for (const profile of CHROME_PROFILES) {
            try {
                execSync(`start chrome --profile-directory="${profile}" "${url}"`);
                console.log(`  Opened: ${profile}`);
            } catch (error) {
                console.warn(`  Gagal buka ${profile}: ${error.message}`);
            }
        }
        return true;
    }

    if (process.platform === "darwin") {
        for (const profile of CHROME_PROFILES) {
            try {
                execSync(`open -na "Google Chrome" --args --profile-directory="${profile}" "${url}"`);
                console.log(`  Opened: ${profile}`);
            } catch (error) {
                console.warn(`  Gagal buka ${profile}: ${error.message}`);
            }
        }
        return true;
    }

    return false;
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

function readActiveChromeText() {
    if (process.platform !== "win32") return "";

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

function notifyJoinQueue() {
    if (process.platform !== "win32") return;

    try {
        runPowerShell(`
            [console]::beep(1200, 500)
            Add-Type -AssemblyName PresentationFramework
            [System.Windows.MessageBox]::Show('Tombol Join Queue terdeteksi. Selesaikan manual di Chrome.', 'Ticket Sniper') | Out-Null
        `);
    } catch {
        // Notification is best-effort only.
    }
}

async function watchJoinQueueOnActiveChrome() {
    if (!WATCH_JOIN_QUEUE || process.platform !== "win32") return;

    console.log("");
    console.log("  Mode Join Queue watcher aktif.");
    console.log("  Selesaikan verifikasi robot manual di browser.");
    console.log("  Jangan pindah fokus dari window Chrome yang ingin dipantau.");
    console.log("");

    let attempt = 0;
    while (true) {
        attempt++;

        let text = "";
        try {
            text = readActiveChromeText().replace(/\s+/g, " ").trim().toLowerCase();
        } catch (error) {
            console.log(`  [#${attempt}] ${timestamp()} gagal baca tab aktif: ${error.message}`);
            await sleep(JOIN_QUEUE_CHECK_MS);
            continue;
        }

        const hasJoinQueue = /join\s*(the\s*)?queue|gabung\s*(ke\s*)?antrean|masuk\s*(ke\s*)?antrean/.test(text);
        const hasRobot = /robot|captcha|verify|verification|verifikasi/.test(text);

        if (hasJoinQueue) {
            console.log("");
            console.log("  JOIN QUEUE TERDETEKSI.");
            console.log("  Klik tombol Join Queue manual di browser.");
            notifyJoinQueue();
            return;
        }

        const status = hasRobot ? "menunggu verifikasi manual" : "menunggu Join Queue";
        process.stdout.write(`\r  [#${attempt}] ${timestamp()} ${status}...`);
        await sleep(JOIN_QUEUE_CHECK_MS);
    }
}

function clearLine() {
    process.stdout.write("\r\x1b[K");
}

function printSpinner(attempt, label) {
    const frames = ["|", "/", "-", "\\"];
    const frame = frames[attempt % frames.length];
    process.stdout.write(`\r  ${frame} [#${attempt}] ${timestamp()} menunggu button "${label}" aktif...`);
}

async function poll(source, isLocal) {
    const label = todayLabel();
    const hr = "-".repeat(64);

    console.log("\n" + hr);
    console.log("Loket Ticket Link Finder + Join Queue Watcher");
    console.log(hr);
    console.log(`Target label : "${label}"`);
    console.log(`Interval     : ${INTERVAL_MS} ms`);
    console.log(`Sumber       : ${isLocal ? path.resolve(source) : source}`);
    console.log(hr + "\n");

    let attempt = 0;

    while (true) {
        attempt++;

        let html = "";
        try {
            html = isLocal ? fs.readFileSync(source, "utf8") : await fetchHTML(source);
        } catch (error) {
            clearLine();
            console.log(`  [#${attempt}] ${timestamp()} fetch error: ${error.message}, retry ${RETRY_ON_ERROR / 1000}s`);
            await sleep(RETRY_ON_ERROR);
            continue;
        }

        let buttons = [];
        try {
            buttons = findButtons(extractContentJSON(html));
        } catch (error) {
            clearLine();
            console.log(`  [#${attempt}] ${timestamp()} parse error: ${error.message}`);
            await sleep(INTERVAL_MS);
            continue;
        }

        const todayBtns = buttons.filter(button => button.label && button.label.trim() === label);
        const activeBtn = todayBtns.find(button => !button.disabled);

        if (activeBtn && activeBtn.link) {
            clearLine();
            console.log("\n" + hr);
            console.log(`BUTTON AKTIF DITEMUKAN. Attempt #${attempt}`);
            console.log(hr);
            console.log(`Label : ${activeBtn.label}`);
            console.log(`Link  : ${activeBtn.link}`);
            console.log(hr + "\n");

            const opened = openInBrowser(activeBtn.link);
            if (!opened) {
                console.log("Browser tidak bisa dibuka otomatis. Buka link di atas manual.");
            }

            await watchJoinQueueOnActiveChrome();
            process.exit(0);
        }

        printSpinner(attempt, label);
        await sleep(INTERVAL_MS);
    }
}

(async () => {
    const isLocal = ARG && !ARG.startsWith("http") && fs.existsSync(ARG);
    const source = isLocal ? ARG : (ARG.startsWith("http") ? ARG : PAGE_URL);

    if (isLocal) return poll(source, true);

    console.log(`\nMengecek koneksi ke ${source}...`);
    try {
        await fetchHTML(source);
        console.log("Koneksi OK, mulai polling...");
        return poll(source, false);
    } catch (error) {
        const fallback = path.join(process.cwd(), "page.html");
        if (fs.existsSync(fallback)) {
            console.warn(`Fetch gagal (${error.message}), fallback ke page.html`);
            return poll(fallback, true);
        }

        console.error([
            `Fetch gagal: ${error.message}`,
            "",
            "Mode lokal:",
            "  1. Simpan halaman sebagai page.html",
            "  2. Letakkan di folder yang sama",
            "  3. node get_ticket_link_join_queue.js page.html",
            "",
        ].join("\n"));
        process.exit(1);
    }
})().catch(error => {
    console.error(`Gagal: ${error.message}`);
    process.exit(1);
});
