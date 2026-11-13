# 🧺 Laundry Kilat — Website

Website kasir laundry **9 layar** yang merupakan konversi detail dari aplikasi React Native
`laundry-new`. Dibangun **hanya dengan HTML, CSS, dan JavaScript murni** — tanpa React,
tanpa framework, tanpa proses build.

Tampilan tetap setia pada desain aslinya: warna, tipografi, kartu, alur transaksi, aturan
harga, voucher, format nota, dan label QR. Di desktop website tampil sebagai *phone frame*
di samping panel brand; di ponsel tampil penuh satu layar.

---

## ✨ Fitur

| # | Layar | Fitur |
|---|-------|-------|
| 1 | **Beranda** | Total pesanan, pendapatan hari ini, daftar pesanan terbaru, status, buka nota lama |
| 2 | **Pelanggan** | Cari pelanggan lama (nama/WhatsApp), tambah pelanggan, pelanggan walk-in |
| 3 | **Layanan** | 5 tipe layanan, 3 paket kecepatan, katalog 8 barang satuan/dry clean |
| 4 | **Kuantitas** | Berat manual (kg), jumlah pcs, verifikasi pcs, estimasi harga otomatis |
| 5 | **Quality Control** | Foto kondisi (kamera/galeri) + kompresi, catatan cepat, catatan bebas |
| 6 | **Kalkulasi** | Rincian harga, voucher, diskon manual, status bayar, DP, metode pembayaran |
| 7 | **Penjadwalan** | Tanggal masuk, estimasi selesai otomatis (Reguler/Kilat/Express), antar-jemput |
| 8 | **Nota** | Nomor resi, rincian lengkap, sisa tagihan, cetak, PDF, WhatsApp, ubah status |
| 9 | **Label QR** | QR berisi nomor resi, pratinjau label 58×40 mm, cetak/PDF |

**Status pesanan:** `Diproses` → `Selesai` → `Diambil` (diubah dari nota lama).
**Status pembayaran:** `Belum Bayar`, `DP/Uang Muka`, `Lunas`.

---

## 🚀 Menjalankan

### Cara 1 — langsung (paling mudah)

Klik dua kali **`index.html`**, atau buka dengan Chrome/Edge/Safari.

Semua fitur berjalan tanpa server. Data tersimpan di `localStorage` browser.

### Cara 2 — server lokal (disarankan untuk demo & pengujian)

**Windows:** klik dua kali **`start-website.bat`**.
Browser akan terbuka otomatis di `http://localhost:8090`.

Atau lewat terminal:

```bash
node serve.js
```

lalu buka `http://localhost:8090`.

`serve.js` hanya memakai modul bawaan Node (tanpa `npm install`).

### Cara 3 — server statis lain

```bash
python -m http.server 8090
# atau
npx serve .
```

Menggunakan server membuat perilaku `localStorage`, kamera, dan pop-up cetak lebih
konsisten di semua browser.

---

## 📁 Struktur Proyek

```
laundry-web/
├── index.html                 # 9 layar + header, dialog, toast
├── css/
│   └── style.css              # design system, layout HP, responsif
├── js/
│   ├── catalog.js             # layanan, paket, barang, voucher, calculatePrice
│   ├── storage.js             # pengganti SQLite (localStorage)
│   ├── app.js                 # navigasi, seluruh logika layar, cetak, QR
│   └── vendor/
│       └── qrcode.min.js      # generator QR offline (qrcodejs, MIT)
├── docs/
│   ├── DESIGN.md              # design system & spesifikasi UI asli
│   └── PANDUAN_DEMO.md        # skenario demo langkah demi langkah
├── serve.js                   # server statis opsional
├── start-website.bat          # shortcut server + buka browser (Windows)
└── README.md
```

---

## 🔁 Pemetaan React Native → Web

| React Native (`laundry-new`) | Versi web |
|------------------------------|-----------|
| `@react-navigation/native-stack` | Navigasi sendiri (`navigate`, `goBack`, riwayat) di `app.js` |
| `OrderContext` + `useState` | Objek `App.order` + state per layar |
| `expo-sqlite` (`Database.js`) | `localStorage` dengan struktur data yang sama (`storage.js`) |
| `expo-image-picker` | `<input type="file" accept="image/*" capture="environment">` |
| Kompresi/pemrosesan foto | `<canvas>` → JPEG maksimal 1000 px, kualitas 0,68 |
| `expo-print` | `window.open()` + CSS `@page` + dialog cetak browser |
| `expo-sharing` (PDF) | Dialog cetak → **Simpan sebagai PDF** |
| `Linking.openURL('whatsapp://…')` | `https://wa.me/…` (butuh internet) |
| `react-native-qrcode-svg` | `qrcodejs` lokal, QR dibuat offline |
| `StyleSheet.create` | CSS variables + kelas |
| `SafeAreaView` / `StatusBar` | `env(safe-area-inset-*)` dan hero full-bleed |
| `Alert.alert` | Dialog kustom + toast |
| Timbangan Bluetooth | Input manual (sesuai batasan versi web) |

Struktur data pesanan dan pelanggan tetap sama (snake_case), sehingga aturan bisnis di
`catalog.js` dapat dibandingkan langsung dengan versi RN.

---

## 💾 Data & Reset

Data disimpan per browser, bukan di server:

| Key | Isi |
|-----|-----|
| `laundrykilat.customers.v1` | Array pelanggan |
| `laundrykilat.orders.v1` | Array pesanan (termasuk foto base64) |

**Reset data / mulai demo dari nol** — buka DevTools (F12) → Console:

```js
localStorage.removeItem('laundrykilat.customers.v1');
localStorage.removeItem('laundrykilat.orders.v1');
location.reload();
```

Atau: DevTools → **Application** → **Local Storage** → hapus kedua key.

> Data tidak tersinkron antar-perangkat/browser. Foto disimpan sebagai JPEG base64;
> bila kuota `localStorage` penuh, pesanan tetap disimpan tanpa foto.

---

## 💰 Aturan Bisnis

### Layanan

| Layanan | Tarif | Satuan |
|---------|-------|--------|
| Kiloan | Rp 7.000 | kg |
| Satuan | Rp 15.000 | pcs |
| Cuci Kering (Dry Clean) | Rp 25.000 | pcs |
| Cuci Setrika | Rp 10.000 | kg |
| Setrika Saja | Rp 6.000 | kg |

Untuk **Satuan** dan **Dry Clean**, harga barang pada katalog menggantikan tarif dasar:

| Barang | Harga | Barang | Harga |
|--------|-------|--------|-------|
| Karpet | Rp 50.000 | Helm | Rp 20.000 |
| Selimut | Rp 30.000 | Jas | Rp 40.000 |
| Gaun | Rp 35.000 | Bed Cover | Rp 45.000 |
| Sepatu | Rp 25.000 | Tas | Rp 20.000 |

### Paket Kecepatan

| Paket | Estimasi | Pengali Harga |
|-------|----------|---------------|
| Reguler | 2–3 hari | ×1 |
| Kilat | 1 hari | ×1,25 |
| Express | ±6 jam | ×1,5 |

### Voucher Demo

| Kode | Potongan | Minimal Belanja |
|------|----------|-----------------|
| `HEMAT10` | 10% | Rp 50.000 |
| `LAUNDRY5K` | Rp 5.000 | Rp 30.000 |
| `SETIA15` | 15% | Rp 100.000 |

Rumus: `subtotal = harga × kuantitas × multiplier`, lalu
`total = subtotal − (voucher + diskon manual)`. Diskon dibatasi maksimal sebesar subtotal.

### Nomor Resi

Format `LDY-YYMMDD-XXXX`, contoh `LDY-261112-0001`:

- `YYMMDD` = tanggal transaksi
- `XXXX` = urutan pesanan pada hari itu

### Estimasi Selesai

- **Reguler** = tanggal masuk + 3 hari, pukul 14:00
- **Kilat** = tanggal masuk + 1 hari, pukul 14:00
- **Express** = waktu sekarang + 6 jam

---

## 🖨️ Cetak, PDF, dan WhatsApp

- **Cetak Nota** membuka jendela baru berisi struk 80 mm dan langsung memanggil dialog cetak.
- **Simpan / Bagikan PDF** menggunakan dialog cetak yang sama; pilih
  **Simpan sebagai PDF** sebagai tujuan cetak.
- **WhatsApp** membuka `wa.me` dengan teks nota yang sudah terisi. Pesan tetap dikirim
  manual oleh pengguna dan memerlukan koneksi internet.
- **Label Cucian** dicetak pada ukuran 58 mm × 40 mm lengkap dengan QR.
- Jika pop-up diblokir, izinkan pop-up untuk situs ini lalu klik tombol cetak lagi.

Isi QR adalah nomor resi. QR dapat dipindai dengan aplikasi kamera biasa; tidak diperlukan
aplikasi khusus, dan pembuatannya berjalan offline.

---

## 🧪 Pengujian

Website telah diuji end-to-end dengan Chrome headless (Playwright):

- Alur lengkap pelanggan baru → kiloan → QC + foto → voucher → DP → jadwal → nota
- Voucher ditolak saat minimum belanja belum terpenuhi, dan diterima saat memenuhi
- Perhitungan total, sisa DP, dan pendapatan harian
- Cetak nota, simpan PDF, cetak label 58×40 mm dengan QR
- Penyimpanan nota, riwayat, perubahan status `Diproses → Selesai → Diambil`
- Persistensi setelah reload, termasuk foto yang sudah dikompresi
- Pesanan satuan (Selimut ×2) dengan pembayaran Lunas
- Tampilan desktop dan mobile 390×844
- Tidak ada error console/page

---

## ⚠️ Batasan Versi Web

- Tidak ada backend, login, atau sinkronisasi multi-perangkat.
- Data hanya tersimpan di browser yang dipakai.
- WhatsApp memerlukan internet; aplikasi tidak mengirim pesan otomatis.
- Printer thermal Bluetooth tidak terhubung langsung. Cetak dilakukan lewat dialog
  browser (bisa ke printer biasa, PDF, atau printer yang terpasang di sistem).
- Timbangan Bluetooth belum diintegrasikan; berat diisi manual.
- Ukuran/format cetak mengikuti pengaturan dialog cetak dan printer masing-masing.

---

## 🛠️ Kustomisasi Cepat

- **Warna & radius** → variabel `:root` di `css/style.css`
- **Harga, layanan, paket, voucher** → `js/catalog.js`
- **Aturan tampilan/format nota** → `buildReceiptHtml()` dan `buildTagHtml()` di `js/app.js`
- **Format nomor resi** → `generateOrderNumber()` di `js/storage.js`
- **Key penyimpanan** → bagian atas `js/storage.js`

---

## 📄 Lisensi & Atribusi

- Kode website ini dibuat sebagai konversi dari proyek Laundry Kilat.
- QR generator: [qrcodejs](https://github.com/davidshimjs/qrcodejs) oleh davidshimjs,
  lisensi MIT — disimpan lokal di `js/vendor/qrcode.min.js` agar bekerja offline.

---

Dokumentasi demo praktis: lihat [`docs/PANDUAN_DEMO.md`](docs/PANDUAN_DEMO.md).
