# Kenneth — database dan model subscription

Bagian ini menyiapkan data yang dipakai checkout, konfirmasi, masa aktif dan kuota. Jalankan aplikasi dari Proyek_Lengkap; folder kode di sini adalah salinan file bagian Kenneth.

## File yang dikerjakan

| File | Fungsi |
|---|---|
| `sql/schema.sql` | Tujuh tabel versi lengkap |
| `sql/subscription_upgrade.sql` | Membuat payments dan subscriptions tanpa seed |
| `sql/install.sql` | CREATE DATABASE, schema dan seed untuk SQLyog |
| `sql/seed.sql` | Data buku dan akun admin demo, mereset data |
| `src/models/Payment.js` | Model invoice dan snapshot harga/durasi |
| `src/models/Subscription.js` | Model satu subscription terkini per akun |
| `src/models/ApiLog.js` | Log dan reservasi kuota |
| `src/models/Pengguna.js` | Relasi pengguna, key hash dan cache paket |
| `src/models/index.js` | Mendaftarkan semua model sebelum associate |
| `scripts/upgrade-api-key.js` | Upgrade W7, hash UUID dan transisi Premium lama |

## Data yang harus dibedakan

`payments` adalah riwayat transaksi. Satu pengguna bisa mempunyai banyak invoice. amount dan billing_days adalah snapshot harga/durasi pada checkout. status berisi pending, paid, cancelled atau expired. checkout_key unik per pengguna untuk mencegah invoice ganda. period_start/period_end merekam periode yang dibeli.

`subscriptions` adalah keadaan langganan terkini. Satu pengguna memiliki maksimal satu baris. Pembayaran kedua memperbarui ends_at pada baris tersebut, sementara riwayat pembeliannya tetap berada pada payments.

`pengguna.api_level` adalah cache, bukan bukti bahwa pelanggan sudah membayar. Service membaca subscription aktif dan waktu database sebelum menerapkan hak akses.

## Instalasi database

Dari Proyek_Lengkap: `npm ci`, `npm run setup:env`, sesuaikan .env. Untuk instalasi baru gunakan `npm run db:migrate`, atau impor sql/install.sql di SQLyog. Nama defaultnya soa_bookdata_w8. Seed mengosongkan data lama.

Untuk database W7/W8 berisi data: backup, arahkan DB_NAME ke database lama, lalu `npm run db:upgrade`. Upgrade tidak menjalankan seed. UUID lama di-hash sekali dan tetap bisa dipakai sebagai key jika nilai aslinya disimpan pelanggan. Premium manual lama mendapat transisi 30 hari sekali dengan source legacy_migration; tidak dicatat sebagai pembayaran.

## Pemeriksaan SQLyog

```sql
SHOW TABLES;
DESCRIBE payments;
DESCRIBE subscriptions;
SHOW INDEX FROM payments;
SELECT invoice_no, pengguna_id, amount, status, period_start, period_end FROM payments;
SELECT pengguna_id, plan, status, starts_at, ends_at, source FROM subscriptions;
```

Setelah checkout harus ada pending dan belum ada Premium aktif. Setelah konfirmasi harus ada paid serta subscription aktif. Konfirmasi ulang tidak menambah ends_at. Untuk demo expiry gunakan sql/demo_expire_subscription.sql dengan ID pelanggan yang benar di database praktikum.

Hasil uji: upgrade skema W7 asli dua kali menjaga lima buku, tidak melakukan double hash, dan tidak memperpanjang grant transisi. sql/install.sql berhasil membuat database dan tujuh tabel.
