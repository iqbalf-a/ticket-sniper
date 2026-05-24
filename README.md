# ticket-sniper

Tool kecil untuk memantau tiket Loket. Project ini punya 1 script pencari link dan 2 metode watcher untuk kondisi tiket sudah masuk halaman widget.

## Prasyarat

- Node.js v18 atau lebih baru
- Google Chrome
- Tampermonkey untuk metode utama watcher

Install dependency hanya diperlukan kalau masih memakai `watch_ticket.js` legacy:

```bash
npm install
```

## File Utama

| File | Fungsi |
|---|---|
| `get_ticket_link.js` | Polling halaman event sampai tombol tanggal hari ini aktif, lalu membuka link di beberapa profile Chrome. |
| `get_ticket_link_join_queue.js` | Versi tambahan: setelah link ketemu, buka Chrome dan pantau tab aktif sampai teks `Join Queue` muncul setelah verifikasi manual. |
| `tampermonkey_loket_watcher.js` | Userscript Tampermonkey. Metode utama untuk reload langsung dari tab Loket. |
| `watch_clipboard_reload.js` | Metode backup. Membaca tab Chrome aktif via Ctrl+A/Ctrl+C dan reload via Ctrl+R. |
| `watch_ticket.js` | Legacy Puppeteer watcher. Disimpan sebagai backup lama. |

## 1. Cari Link Tiket

Dipakai saat halaman event belum membuka tombol tanggal hari ini.

```bash
node get_ticket_link.js
```

Mode file lokal untuk testing:

```bash
node get_ticket_link.js page.html
```

Versi dengan helper Join Queue:

```bash
node get_ticket_link_join_queue.js
```

Catatan: script ini tidak menyelesaikan verifikasi robot/CAPTCHA. Selesaikan verifikasi manual di browser. Setelah teks `Join Queue` muncul di tab Chrome aktif, script akan memberi notifikasi agar tombol diklik manual.

Konfigurasi penting ada di bagian atas `get_ticket_link.js`:

```js
const PAGE_URL = "https://dyandraglobalstore-04.com/#layout";
const INTERVAL_MS = 100;
const RETRY_ON_ERROR = 5000;

const CHROME_PROFILES = [
    "Default",
    "Profile 1",
    "Profile 2",
    "Profile 4",
];
```

## 2. Watcher Utama: Tampermonkey

File:

```text
tampermonkey_loket_watcher.js
```

Cara pakai:

1. Install Tampermonkey di Chrome.
2. Buka Tampermonkey, pilih `Create a new script`.
3. Paste isi `tampermonkey_loket_watcher.js`.
4. Save.
5. Buka halaman widget Loket.

Logic watcher:

- Saat pertama jalan, script akan meminta target tiket.
- Contoh target: `cat 1`, `cat 1, cat 2`, `duality package`.
- Kosongkan atau isi `all` untuk memantau semua card tiket.
- Ada `Full Book`, `Full Booked`, `Fully Booked`, atau `Penuh` pada target: reload terus.
- Full Booked target yang sebelumnya ada lalu hilang: stop, ubah title, tampilkan alert.
- Ada quantity atau tombol beli/pesan/checkout pada target: stop.
- Semua target `Sold Out`, `Habis Terjual`, atau `Terjual Habis`: stop.

Untuk mengganti target, buka DevTools Console di halaman Loket lalu jalankan:

```js
ticketSniperSetTargets()
```

Halaman akan reload dan script akan meminta target baru.

Jika script tidak jalan, buka `chrome://extensions/`, masuk ke detail Tampermonkey, lalu aktifkan `Allow User Scripts`.

## 3. Watcher Backup: Clipboard Reload

File:

```text
watch_clipboard_reload.js
```

Cara pakai:

1. Buka Chrome biasa.
2. Buka dan fokuskan tab Loket.
3. Jalankan:

```bash
node watch_clipboard_reload.js
```

Script akan:

- Fokus ke Chrome.
- Tekan Ctrl+A dan Ctrl+C untuk membaca teks halaman.
- Reload tab aktif dengan Ctrl+R kalau ada Full Booked.
- Stop kalau Sold Out, quantity muncul, atau status Full Booked berubah.

Catatan:

- Jangan pindah tab/window saat script berjalan.
- Clipboard akan ketimpa isi halaman.

Konfigurasi opsional:

```powershell
$env:WATCH_INTERVAL_MS=1000
$env:COPY_WAIT_MS=300
$env:AFTER_RELOAD_WAIT_MS=1500
node watch_clipboard_reload.js
```

## 4. Legacy: Puppeteer Watcher

`watch_ticket.js` adalah versi lama berbasis Puppeteer. File ini masih disimpan sebagai backup.

```bash
node watch_ticket.js
```

Jika memakai file ini, jalankan `npm install` terlebih dahulu.

## Troubleshooting

### Tampermonkey tidak muncul log

Pastikan:

- Script sudah enabled.
- Match URL mencakup halaman `https://widget.loket.com/...`.
- `Allow User Scripts` aktif di detail extension Tampermonkey.

### Clipboard watcher tidak reload

Pastikan:

- Tab Loket sedang aktif.
- Window Chrome tidak kehilangan fokus.
- Jangan klik aplikasi lain saat script berjalan.

### `get_ticket_link.js` fetch gagal

Coba simpan halaman manual sebagai `page.html`, lalu jalankan:

```bash
node get_ticket_link.js page.html
```
