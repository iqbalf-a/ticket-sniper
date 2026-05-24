/**
 * tiketcom/book.js
 * Browser automation: launch Chrome, inject session, set quantity, click Book.
 *
 * Exported: openAndBook(packagesUrl, { packageHash, sessionCookie, targetQty })
 */

"use strict";

const { execSync } = require("child_process");
const http = require("http");
const os   = require("os");
const path = require("path");

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function waitForDebugPort(port) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + 12000;
        (function attempt() {
            http.get(`http://127.0.0.1:${port}/json/version`, res => {
                res.resume();
                resolve();
            }).on("error", () => {
                if (Date.now() >= deadline) return reject(new Error(`Chrome debug port ${port} tidak ready`));
                setTimeout(attempt, 250);
            });
        })();
    });
}

async function bookOnce(puppeteer, packageUrl, cookies, targetQty) {
    const debugPort  = 9222;
    const userDataDir = path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "ticket-sniper-book");

    console.log(`  → Launching Chrome (port ${debugPort})...`);
    execSync(
        `start "" chrome --remote-debugging-port=${debugPort} --user-data-dir="${userDataDir}" --no-first-run --disable-notifications --start-maximized`,
        { shell: true }
    );

    await waitForDebugPort(debugPort);

    const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${debugPort}` });
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    const wClient = await page.createCDPSession();
    const { windowId } = await wClient.send("Browser.getWindowForTarget");
    await wClient.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "maximized" } });
    await wClient.detach();

    await page.goto("https://www.tiket.com", { waitUntil: "domcontentloaded", timeout: 15000 });
    if (cookies.length) {
        const client = await page.createCDPSession();
        await client.send("Network.setCookies", { cookies });
        await client.detach();
    }

    console.log(`  → Navigating: ${packageUrl}`);
    await page.goto(packageUrl, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForFunction(
        () => Array.from(document.querySelectorAll("button")).some(b => b.textContent.trim() === "Book"),
        { timeout: 15000 }
    );

    for (let i = 1; i < targetQty; i++) {
        const ok = await page.evaluate(() => {
            function click(el) {
                el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            }

            // Strategy 1: aria-label
            const byLabel = document.querySelector(
                '[aria-label*="increase" i],[aria-label*="add" i],[aria-label*="tambah" i],[aria-label*="plus" i]'
            );
            if (byLabel) { click(byLabel); return true; }

            // Strategy 2: button dengan title/desc berisi plus/add
            const allBtns = Array.from(document.querySelectorAll("button"));
            const byTitle = allBtns.find(b => {
                const t = (b.title || b.querySelector("title")?.textContent || "").toLowerCase();
                return t.includes("plus") || t.includes("add") || t.includes("increase") || t.includes("tambah");
            });
            if (byTitle) { click(byTitle); return true; }

            // Strategy 3: text "+"
            const byText = allBtns.find(b => b.textContent.trim() === "+");
            if (byText) { click(byText); return true; }

            // Strategy 4: tombol terakhir dalam container yang mengandung "Pax"
            const paxEl = Array.from(document.querySelectorAll("*"))
                .find(el => el.childElementCount === 0 && el.textContent.trim() === "Pax");
            if (paxEl) {
                let container = paxEl.parentElement;
                for (let d = 0; d < 6 && container; d++) {
                    const btns = Array.from(container.querySelectorAll("button"));
                    if (btns.length >= 2) { click(btns[btns.length - 1]); return true; }
                    container = container.parentElement;
                }
            }

            // Strategy 5: tombol kedua dari akhir sebelum tombol "Book"
            const bookBtn = allBtns.find(b => b.textContent.trim() === "Book");
            if (bookBtn) {
                let section = bookBtn.parentElement;
                for (let d = 0; d < 8 && section; d++) {
                    const btns = Array.from(section.querySelectorAll("button"))
                        .filter(b => b.textContent.trim() !== "Book");
                    if (btns.length >= 2) { click(btns[btns.length - 1]); return true; }
                    section = section.parentElement;
                }
            }

            return false;
        });
        if (!ok) { console.warn("  ⚠️  Tombol + tidak ditemukan"); break; }
        await sleep(500);
    }

    console.log("  → Clicking Book...");
    const booked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Book");
        if (!btn) return false;
        btn.click();
        return true;
    });

    if (!booked) {
        console.warn("  ⚠️  Tombol Book tidak ditemukan — silakan klik manual.");
        return;
    }

    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
    console.log(`  ✅  Browser di: ${page.url()}`);
    await browser.disconnect();
}

async function openAndBook(packagesUrl, { packageHash, sessionCookie, targetQty }) {
    const puppeteer = require("puppeteer-core");

    const packageUrl = `${packagesUrl}#pricetierDetail-${packageHash}`;
    const cookies = sessionCookie.split(";")
        .map(raw => {
            const eq = raw.indexOf("=");
            if (eq === -1) return null;
            return { name: raw.slice(0, eq).trim(), value: raw.slice(eq + 1).trim(), domain: ".tiket.com", path: "/" };
        })
        .filter(c => c?.name);

    await bookOnce(puppeteer, packageUrl, cookies, targetQty);
}

module.exports = { openAndBook };
