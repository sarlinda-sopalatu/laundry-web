# 🎬 Panduan Demo — Laundry Kilat Web

Panduan singkat untuk mempresentasikan website dari awal sampai akhir. Semua nilai di
bawah sudah dihitung agar hasilnya bisa langsung dicocokkan.

---

## 1. Sebelum Demo

1. Jalankan website:
   - klik dua kali **`start-website.bat`**, atau
   - buka **`index.html`** langsung di Chrome/Edge.
2. Pastikan pop-up **diizinkan** untuk situs ini (dibutuhkan saat cetak/PDF).
3. Untuk memulai dari kondisi kosong, buka DevTools (F12) → Console:

   ```js
   localStorage.removeItem('laundrykilat.customers.v1');
   localStorage.removeItem('laundrykilat.orders.v1');
   location.reload();
   ```

4. Siapkan satu foto di perangkat untuk menguji Quality Control.
5. Untuk mencoba WhatsApp, siapkan koneksi internet.

---

## 2. Skenario Utama — Pelanggan Baru, Kiloan, DP

### Langkah 1 — Beranda
- Tunjukkan kartu **Total Pesanan** dan **Pendapatan Hari Ini**.
- Klik **＋ Transaksi Baru**.

### Langkah 2 — Pelanggan
Isi:

| Field | Nilai |
|-------|-------|
| Nama | `Budi Santoso` |
| WhatsApp | `081234567890` |
| Alamat | `Jl. Merdeka No. 5, Bandung` |
| Antar-jemput | aktif |

Klik **Simpan & Pilih Layanan**.

### Langkah 3 — Layanan
- Pilih **Kiloan** (Rp 7.000/kg).
- Pilih **Kilat** (1 hari, ×1,25).
- Klik **Lanjut ke Kuantitas**.

### Langkah 4 — Kuantitas
- Berat: `5` kg.
- Verifikasi pcs: `12`.
- Estimasi muncul: **Rp 43.750** (7.000 × 5 × 1,25).
- Klik **Lanjut ke Quality Control**.

### Langkah 5 — Quality Control
- Klik **Galeri** (atau **Ambil Foto** di ponsel), pilih foto.
- Klik catatan cepat: **Jangan pakai pemutih** dan **Noda membandel di kerah**.
- Tambah catatan: `Noda kopi di bagian kerah`.
- Klik **Lanjut ke Kalkulasi**.

> Di layar ini tunjukkan bahwa foto dikompres otomatis dan pratinjau muncul.

### Langkah 6 — Kalkulasi & Pembayaran
1. Total awal: **Rp 43.750**.
2. Coba voucher `HEMAT10` → muncul peringatan minimum belanja Rp 50.000.
3. Ganti ke `LAUNDRY5K` → total menjadi **Rp 38.750**.
   (`43.750 − 5.000`)
4. Pilih status **DP/Uang Muka**.
5. Isi DP: `20000` → sisa tagihan **Rp 18.750**.
6. Pilih metode **Transfer Bank**.
7. Klik **Lanjut ke Penjadwalan**.

### Langkah 7 — Penjadwalan
- Tanggal masuk: hari ini.
- Estimasi: **besok, pukul 14:00** (Kilat = +1 hari).
- Tunjukkan kartu **Layanan Antar-Jemput** berisi alamat Budi.
- Klik **Simpan & Buat Nota**.

### Langkah 8 — Nota
Yang harus terlihat:

- Nomor resi format `LDY-YYMMDD-0001` (contoh `LDY-261112-0001`).
- Total **Rp 38.750**.
- Sisa tagihan **Rp 18.750**.
- Status pembayaran **DP/Uang Muka**, metode **Transfer Bank**.
- Catatan QC dan estimasi selesai.

Tunjukkan tombol:

- **Cetak Nota** → jendela print struk 80 mm.
- **Simpan / Bagikan PDF** → dialog cetak → pilih **Simpan sebagai PDF**.
- **Kirim via WhatsApp** → tab `wa.me` dengan teks nota (butuh internet).
- **Buat Label Cucian** → label QR 58×40 mm.

### Langkah 9 — Label QR
- QR berisi nomor resi.
- Klik **Cetak Label** → dialog cetak ukuran 58×40 mm.
- Klik **Kembali ke Beranda**.

### Langkah 10 — Status Pesanan
1. Di Beranda, klik kartu pesanan Budi.
2. Klik **Tandai Selesai** → status berubah menjadi **Selesai**.
3. Klik **Tandai Sudah Diambil** → status **Diambil**.
4. Klik **Kembali ke Beranda** dan tunjukkan badge status berubah.

> Status juga bertahan setelah halaman di-refresh.

---

## 3. Skenario Kedua — Walk-in, Satuan, Lunas

1. Klik **＋ Transaksi Baru**.
2. Klik **Lewati / Walk-in** (nama menjadi `Pelanggan Walk-in`).
3. Pilih **Satuan** → muncul katalog barang.
4. Pilih **Selimut** (Rp 30.000/pcs).
5. Pilih **Reguler** (×1).
6. Kuantitas: `2` pcs → estimasi **Rp 60.000**.
7. Quality Control: langsung **Lanjut** (foto opsional).
8. Kalkulasi:
   - status **Lunas**,
   - metode **Tunai**,
   - tanpa voucher.
9. Penjadwalan → **Simpan & Buat Nota**.
10. Nota: total **Rp 60.000**, nomor resi urutan berikutnya (`…-0002`).
11. Kembali ke Beranda.

Hasil di Beranda (jika kedua transaksi di hari yang sama):

- Total pesanan: **2**
- Pendapatan hari ini: **Rp 98.750** (`38.750 + 60.000`)

---

## 4. Skenario Tambahan (Opsional)

### Voucher 10%
- Kiloan 8 kg × Kilat = `7.000 × 8 × 1,25` = **Rp 70.000**
- `HEMAT10` → potongan 10% = **Rp 7.000**
- Total: **Rp 63.000**

### Express
- Kiloan 2 kg × Express = `7.000 × 2 × 1,5` = **Rp 21.000**
- Estimasi selesai = waktu sekarang + 6 jam (bisa jatuh di hari yang sama).

### Pencarian pelanggan
- Kembali ke layar Pelanggan pada transaksi baru.
- Ketik `Budi` atau `0812` → pelanggan lama muncul.
- Pilih pelanggan → data otomatis terisi dan lanjut ke Layanan.

---

## 5. Hal yang Bisa Ditekankan Saat Presentasi

1. **Alur satu arah per layar** — kasir tidak perlu berpindah-pindah menu.
2. **Harga otomatis** — paket kecepatan langsung mengubah total.
3. **Validasi nyata** — voucher minimum belanja dan DP tidak boleh ≥ total.
4. **Quality Control terdokumentasi** — foto + catatan tersimpan bersama pesanan.
5. **Nota siap cetak** — struk, PDF, WhatsApp, dan label QR dari satu layar.
6. **Riwayat status** — Diproses → Selesai → Diambil, data tetap tersimpan.
7. **Responsif** — phone frame di desktop, full-screen di ponsel.

---

## 6. Troubleshooting Cepat

| Masalah | Solusi |
|---------|--------|
| Tombol cetak tidak membuka jendela | Izinkan pop-up untuk situs ini, lalu klik lagi |
| PDF tidak muncul | Di dialog cetak, pilih tujuan **Simpan sebagai PDF** |
| Kamera tidak terbuka di laptop | Wajar — browser membuka pemilih file; di ponsel kamera tersedia |
| Data hilang setelah ganti browser | Data `localStorage` terikat pada browser/perangkat |
| WhatsApp tidak terbuka | Periksa koneksi internet dan izin pop-up |
| Ingin mulai dari nol | Hapus dua key `localStorage` (lihat bagian 1) |
| Halaman putih setelah membuka `index.html` | Pastikan folder `css/` dan `js/` ikut tersalin; atau jalankan `start-website.bat` |

---

## 7. Setelah Demo

- Data tetap tersimpan di browser dan bisa dibuka lagi kapan saja.
- Untuk mengosongkan data, jalankan perintah reset di bagian 1.
- Website tidak memerlukan instalasi, akun, atau server backend.
