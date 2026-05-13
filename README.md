# ticket-war

Bot otomatisasi pembelian tiket untuk platform **Loket.com**, terdiri dari 2 skrip yang digunakan di kondisi berbeda.

---

## Prasyarat

- [Node.js](https://nodejs.org) v18 atau lebih baru
- Google Chrome terinstall
- Untuk `watch_ticket.js`: install dependensi dulu

```bash
npm install
```

---

## Dua Kondisi, Dua Skrip

| Kondisi | Skrip yang dipakai |
|---|---|
| Tiket **belum dijual** — halaman event belum ada tombol beli hari ini | `get_ticket_link.js` |
| Tiket **sudah dijual tapi Full Booked** — perlu pantau slot yang batal | `watch_ticket.js` |

---

## Skrip 1 — `get_ticket_link.js`

### Kapan dipakai

Dipakai saat tiket **belum mulai dijual**. Halaman event Loket menampilkan tombol per tanggal, tapi tombol hari ini masih `disabled`. Skrip ini akan polling terus sampai tombol hari ini aktif, lalu langsung membuka link tiketnya di semua Chrome profile sekaligus.

### Cara pakai

**Mode live (default):**
```bash
node get_ticket_link.js
```

**Mode file lokal (untuk testing):**
```bash
# 1. Buka halaman event di browser → Ctrl+S → simpan sebagai page.html
# 2. Letakkan page.html di folder yang sama
node get_ticket_link.js page.html
```

### Konfigurasi

Buka `get_ticket_link.js` dan ubah bagian Config di atas:

```js
const PAGE_URL = "https://dyandraglobalstore-05.com"; // URL halaman event

const INTERVAL_MS = 100;    // Interval polling (ms)
const RETRY_ON_ERROR = 5000; // Jeda jika fetch error (ms)

const CHROME_PROFILES = [
    "Default",    // Profile Chrome pertama
    "Profile 1",  // Profile Chrome kedua
    "Profile 2",  // Profile Chrome ketiga
    "Profile 4",  // Profile Chrome keempat
];
```

> Nama profile Chrome bisa dicek di `chrome://version` → kolom **Profile Path** (bagian terakhir setelah backslash).

### Yang terjadi saat berhasil

1. Skrip mencetak link tiket ke terminal
2. Browser Chrome otomatis terbuka di **semua profile** sekaligus dengan link tersebut
3. Skrip berhenti (`process.exit`)

---

## Skrip 2 — `watch_ticket.js`

### Kapan dipakai

Dipakai saat tiket **sudah bisa dibeli tapi statusnya Full Booked**. Skrip ini membuka browser nyata (bukan headless), lalu reload halaman widget terus-menerus sampai ada slot yang terbuka (pesanan dibatalkan orang lain).

### Cara pakai

**Pakai URL default (sudah di-hardcode):**
```bash
node watch_ticket.js
```

**Pakai URL widget custom:**
```bash
node watch_ticket.js https://widget.loket.com/widget/WIDGET_ID
```

**Pakai profile Chrome tertentu:**
```bash
node watch_ticket.js https://widget.loket.com/widget/WIDGET_ID "Profile 1"
```

**Jalankan 2 profil sekaligus** — buka 2 terminal, jalankan masing-masing:
```bash
# Terminal 1
node watch_ticket.js URL "Default"

# Terminal 2
node watch_ticket.js URL "Profile 1"
```

### Konfigurasi

```js
const WIDGET_URL = "...";   // URL widget Loket (bisa di-override via argumen)
const INTERVAL_MS = 0;      // 0 = reload secepat mungkin, atau isi nilai ms untuk jeda
```

### Perhatian sebelum menjalankan

> **Chrome harus ditutup dulu** sebelum menjalankan skrip ini.
> Puppeteer akan launch Chrome sendiri menggunakan profile yang dipilih.
> Jika Chrome sedang terbuka dengan profile yang sama, skrip akan error.

### Kondisi berhenti

| Kondisi | Yang terjadi |
|---|---|
| Ada tiket yang tadinya **Full Booked** → sekarang **tersedia** | Skrip berhenti, window Chrome tetap terbuka → langsung beli |
| Semua tiket **Sold Out** | Skrip berhenti dengan notifikasi |

---

## Alur Penggunaan Lengkap

```
Tiket belum dijual?
└── Jalankan get_ticket_link.js
    └── Browser terbuka otomatis di semua profile dengan link tiket
        └── Semua tiket Full Booked?
            └── Jalankan watch_ticket.js di tiap terminal (1 per profile)
                └── Ada slot terbuka → selesaikan pembelian di window yang sudah terbuka
```

---

## Troubleshooting

**`get_ticket_link.js`: Fetch gagal terus**
- Cek koneksi internet
- Coba simpan halaman manual sebagai `page.html` dan pakai mode lokal

**`watch_ticket.js`: Chrome tidak ditemukan**
- Pastikan Chrome terinstall di path default
- Atau edit variabel `CHROME_PATHS_WIN` di dalam skrip dengan path Chrome yang benar

**`watch_ticket.js`: Error saat launch browser**
- Pastikan semua window Chrome sudah ditutup sebelum menjalankan skrip
- Cek nama profile di `chrome://version`
