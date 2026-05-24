# HAR Analysis — widget.loket.com

> **Scope otomasi:** Hanya sampai halaman order/checkout terbuka. Pengisian form data diri dan pembayaran tetap dilakukan manual.

**Event:** Westlife 25 Years Of Hits The Anniversary World Tour 2027
**Widget URL:** `https://widget.loket.com/widget/ytuxagivpgcfvkxta`
**Captured:** Step 1 (pilih tiket) → Step 2 (data diri), sesi berhenti di sini
**Catatan:** HAR ini capture CAT 1, bukan VIP

---

## IDs Penting

| Key | Value |
|---|---|
| `widgetCode` | `ytuxagivpgcfvkxta` |
| `groupId` | `172063` |
| `ticketId` CAT 1 | `401312` |
| `eventId` | `150578` |

---

## Checkout Flow

### Step 1 — Pilih Tiket

```
POST /widget/ytuxagivpgcfvkxta
Content-Type: application/x-www-form-urlencoded
```

Form fields:
```
max_qty_ticket=6
is_same_ticket=1
csrf_token={uuid}
ticket[172063][401312]={qty}   ← [groupId][ticketId] = jumlah
ticket[172063][401313]=0
ticket[172063][401314]=0
utm_source=
utm_medium=
utm_content=
utm_campaign=
```

Response: `302 → /widget/ytuxagivpgcfvkxta/register`

---

### Step 2 — Data Diri

```
GET /widget/ytuxagivpgcfvkxta/register
```

- Session lock dimulai: **~14 menit** countdown
- CSRF token baru di-embed di HTML halaman ini
- Form fields: firstname, lastname, email, telephone (+62), gender, dob, identity_id, alamat pengiriman
- Hidden: `csrf_token`, `widget_code`, `token`, `groupId`

Form submit:
```
POST /widget/ytuxagivpgcfvkxta/register
```

---

### Step 3 — Konfirmasi (tidak ter-capture)

---

### Step 4 — Checkout / Pembayaran (tidak ter-capture)

Payment methods yang tersedia (dari HTML Step 2):
- Credit/Debit Card
- VA Mandiri, VA BCA, VA BNI, VA BRI
- GoPay
- Indodana
- Cicilan Mandiri/BCA 3 bulan, Mandiri 6 bulan

---

## XHR Endpoints (dari JS)

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/widget/{code}/check_quantity` | Validasi stok saat qty berubah — returns `reset_to_zero` / `error` / `reload` |
| POST | `/widget/calculate` | Hitung ulang total + service fee saat payment method berubah |
| POST | `/widget/installment_info` | Detail cicilan saat opsi cicilan dipilih |
| GET | `/widget/{code}/promos` | Ambil daftar promo/kupon untuk cart |
| POST | `/widget/{code}/apply_coupon` | Pakai kupon (include selected payment ID) |
| POST | `/widget/{code}/remove_coupon` | Hapus kupon |
| POST | `/widget/reset` | Lepas tiket yang di-hold (timer habis / user back) |
| POST | `/token/refresh` | Keepalive setiap **60 detik** — POST `{host, path}` sebagai JSON |
| POST | `/ajax_data/check_invitation_code` | Validasi kode undangan / private sale |
| POST | `/ajax_data/save_billing_info` | Simpan alamat billing kartu kredit |
| GET | `/ajax_data/check_bin_number` | BIN lookup untuk deteksi jenis kartu |
| GET | `/ajax_data/get_suggest_province/{country_id}?term=` | Autocomplete provinsi |
| GET | `/ajax_data/get_suggest_district/{province}?term=` | Autocomplete kota/kabupaten |
| GET | `/ajax_data/get_suggest_region/?term=` | Autocomplete kecamatan |
| POST | `/ajax_data/resend_member_confirmation` | Kirim ulang email konfirmasi |
| GET | `/ajax_data/geolocation` | Auto-detect lokasi user |

---

## Hal Penting

- **CSRF token** wajib ada di semua request yang mengubah state — diambil dari HTML saat page load
- **Session keepalive** via `POST /token/refresh` tiap 60 detik — kalau tidak dikirim, tiket dilepas otomatis
- **ticketId VIP berbeda** — perlu capture HAR ulang khusus VIP untuk dapat ID yang benar
- HAR ini tidak lengkap (Step 3 & 4 tidak ter-capture)
