# Hasil verifikasi BookData API 2.0

- Runtime: Node.js 24.22.1, MariaDB 10.11.14, mysql2 dan Sequelize dialect mysql.
- node:test: **43 lulus, 0 gagal**, mencakup 42 kasus perilaku dan satu tes induk.
- Newman W8: **46 request, 55 assertion**, 0 gagal.
- Upgrade W7 asli: dijalankan dua kali, lima buku dipertahankan, UUID tidak di-hash ulang, grant transisi Premium tidak diperpanjang dan tidak membuat pembayaran palsu.
- sql/install.sql: CREATE DATABASE, tujuh tabel dan seed berhasil dieksekusi.

## Kasus utama

Harga server dan validasi input; key hash; JWT/role; checkout pending; idempotensi checkout dan konfirmasi; aktivasi 30 hari; renewal; dua invoice dikonfirmasi paralel; invoice pengguna lain; cancel/expired; subscription expired kembali Basic; cache api_level tidak memberi hak; pengecekan ulang setelah lock; proteksi data sumber; rotasi key tanpa reset; kuota paralel 10 dari 11; batas harian; log status dan kompatibilitas UUID lama.

## Mengulang

Dari Proyek_Lengkap, sesuaikan koneksi database dan TEST_DB_NAME yang berakhiran _test, lalu:

```bash
npm ci
npm run setup:env
npm run test:prepare
npm test
```

Prepare mereset database test. Untuk Postman impor ulang koleksi W8 dan environment BookData local, lalu jalankan semua folder berurutan.

## Batas verifikasi

Server MySQL 8 langsung dan panggilan webhook pihak ketiga tidak termasuk uji ini. Pembayaran adalah simulasi admin, tanpa pemindahan uang, gateway, auto-debit, rekonsiliasi maupun refund. Langganan, invoice dan hak akses menggunakan database nyata.
