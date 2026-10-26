# BookData API 2.0 — Subscription dan API Key

Backend Node.js/Express dengan MySQL dan Sequelize. Pelanggan mendapat Basic gratis, melihat harga, checkout Premium, lalu memperoleh akses setelah admin mengonfirmasi pembayaran simulasi.

**Pembayaran adalah simulasi praktikum. Tidak ada transfer/debit uang sungguhan atau payment gateway.** Invoice, status, konfirmasi, subscription, perpanjangan, pembatalan pending, masa aktif dan pembatasan akses benar-benar berjalan di database.

## Paket layanan

| Paket | Harga | Masa aktif | Request/hari | Request/menit | Layanan |
|---|---:|---|---:|---:|---|
| Basic | Rp0 | Tanpa tanggal berakhir | 100 | 10 | Ringkasan |
| Premium | Rp99.000 | 30 hari per pembayaran | 10.000 | 100 | Ringkasan dan analitik |

Periode Premium tepat 30 × 24 jam, bukan bulan kalender. Semua waktu respons memakai UTC. Perpanjangan manual, tanpa auto-renew atau auto-debit. Harga berasal dari `src/config/apiPlans.js`, bukan body pelanggan.

## Menjalankan dari folder Proyek_Lengkap

Prasyarat: Node.js 24, MySQL/MariaDB menyala, dan pengguna database memiliki izin membuat database/tabel untuk instalasi baru.

```bash
npm ci
npm run setup:env
```

Edit `.env` sesuai koneksi lokal:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=isi_password_mysql_kamu
DB_NAME=soa_bookdata_w8
ACCESS_TOKEN_TTL=15m
```

`setup:env` membuat dua JWT secret acak berbeda dan tidak menimpa `.env` lama. Jika sudah ada `.env`, pertahankan secret yang valid dan sesuaikan koneksi. Access token default 15 menit; `30s` tetap bisa dipakai untuk demonstrasi W7.

### Database baru atau reset praktikum

```bash
npm run db:migrate
npm start
```

`db:migrate` membuat database dari DB_NAME, menjalankan schema dan seed. **Seed mengosongkan data lama.** Alamat API default `http://localhost:3001`.

Alternatif SQLyog: impor **[sql/install.sql](sql/install.sql)**. File ini berisi `CREATE DATABASE soa_bookdata_w8`, `USE`, tujuh tabel dan data awal. Samakan DB_NAME dengan nama database tersebut. Pilih salah satu jalur instalasi, kemudian jalankan `npm start`.

### Database W7/W8 lama yang datanya dipertahankan

Buat backup, sesuaikan DB_NAME ke database lama, lalu:

```bash
npm run db:upgrade
npm start
```

Upgrade menambahkan log, payments dan subscriptions, menambah unique index, serta meng-hash UUID lama satu kali. Buku dan data pengguna dipertahankan. Premium manual lama mendapat masa transisi 30 hari dengan `source=legacy_migration`, sekali saja dan tanpa membuat pembayaran palsu. Menjalankan upgrade ulang tidak menambah masa aktif tersebut.

## Alur pembelian

1. Pelanggan register dan login. Akun mulai dari Basic.
2. Pelanggan melihat `GET /api/v1/plans` dan membuat API key.
3. `POST /api/v1/subscriptions/checkout` dengan `{"plan":"premium"}` membuat invoice pending seharga Rp99.000. Header `Idempotency-Key` wajib.
4. Pending belum memberi Premium. Pelanggan dapat membaca detail/riwayat invoice sendiri.
5. Admin login dan mengirim `PATCH /api/v1/payments/:id/confirm` dengan `{"simulation":true}`.
6. Invoice menjadi paid dan subscription aktif 30 hari. API key yang sama langsung dapat mengakses analitik.
7. Pembelian berikutnya menambah 30 hari dari tanggal berakhir yang masih aktif. Jika sudah expired, periode baru dimulai saat konfirmasi.
8. Saat masa aktif habis, request berikutnya menerapkan Basic otomatis. Tidak perlu cron dan tidak perlu login ulang untuk menerapkan paket.

## Postman

Impor ulang **[BookData-W8.postman_collection.json](postman/BookData-W8.postman_collection.json)** dan **[bookdata-local.postman_environment.json](postman/bookdata-local.postman_environment.json)**. Timpa koleksi lama bila perlu. Pilih environment **BookData local**, lalu jalankan semua folder dari atas ke bawah melalui Collection Runner.

Koleksi baru berisi **46 request dan 55 assertion**. Token, key, user_id dan payment_id disimpan otomatis. Akun admin seed untuk demo lokal: `admin` / `Admin123!`.

Panduan langkah manual, body, header dan nomor request tersedia di **[ALUR_POSTMAN.md](ALUR_POSTMAN.md)**.

## Endpoint bisnis dan autentikasi

| Method | Endpoint setelah `/api/v1` | Kredensial dan tujuan |
|---|---|---|
| GET | `/plans` | Publik, daftar harga/fitur/durasi |
| POST | `/auth/register` | Publik, akun Basic baru |
| POST | `/auth/login` | Publik, mendapatkan access token |
| POST | `/auth/refresh` | Cookie refresh, token akses baru |
| POST | `/auth/logout` | Menghapus cookie refresh di client |
| GET | `/pengguna/profil` | JWT, identitas dari token |
| POST | `/api-key/generate` | JWT pelanggan, key pertama |
| POST | `/api-key/regenerate` | JWT pelanggan, rotasi key |
| GET | `/api-key/me` | JWT pelanggan, paket dan kuota efektif |
| POST | `/subscriptions/checkout` | JWT pelanggan dan Idempotency-Key, invoice Premium |
| GET | `/subscriptions/me` | JWT pelanggan, status dan masa aktif |
| GET | `/payments` | JWT pelanggan, riwayat invoice sendiri |
| GET | `/payments/:id` | JWT pemilik atau admin, detail invoice |
| GET | `/payments/admin/pending` | JWT admin, daftar pending |
| PATCH | `/payments/:id/confirm` | JWT admin dan `simulation:true` |
| PATCH | `/payments/:id/cancel` | JWT pemilik, membatalkan pending |
| GET | `/partner/ringkasan` | X-API-Key Basic/Premium |
| GET | `/partner/analitik` | X-API-Key dengan subscription Premium aktif |
| GET/POST/PUT/PATCH/DELETE | `/buku` dan subroute buku | JWT admin, mengikuti metode route buku |
| PATCH | `/api-key/level/:id` | Jalur lama: admin menerima 410, pelanggan 403 |

`GET /payments` dan `/payments/admin/pending` menerima `page` (default 1) serta `limit` (default 20, maksimal 100).

JWT dipakai untuk pengelolaan akun dan pembelian. Header `X-API-Key` dipakai untuk layanan partner. Role `admin` adalah pengelola; `premium` adalah paket pelanggan. Mengirim JWT saja ke partner tidak cukup.

## Perilaku transaksi dan batas akses

- Invoice pending berlaku 24 jam. Konfirmasi invoice expired/cancelled ditolak 409.
- Checkout dengan Idempotency-Key yang sama mengembalikan invoice yang sama. Untuk pembelian/perpanjangan baru, gunakan key baru.
- Konfirmasi invoice paid mengembalikan hasil tanpa menambah periode lagi. Konfirmasi bersamaan mengunci akun sehingga tidak memberi masa aktif ganda.
- Pelanggan tidak boleh mengirim harga, status paid, atau api_level pada checkout. Input tambahan ditolak 400.
- Invoice pengguna lain tidak dapat dibaca atau dibatalkan pelanggan; responsnya 404. Admin boleh melihat invoice untuk konfirmasi.
- Pembatalan hanya untuk invoice pending. Paid tidak mempunyai alur refund pada simulasi ini.
- `api_level` adalah cache. `subscriptions` dan waktu database menentukan paket efektif pada setiap akses. Mengubah cache saja tidak memberi Premium.
- Kuota melekat pada akun, bukan key. Generate ulang, pembayaran, dan perpanjangan tidak mereset pemakaian pada hari/menit yang sama. Setelah expired, pemakaian hari itu bisa sudah melebihi kuota Basic.
- CRUD buku sekarang khusus JWT admin agar pelanggan tidak melewati paket melalui data sumber yang sebelumnya publik.
- Jalur lama PATCH level dinonaktifkan (410 untuk admin). Gunakan checkout dan konfirmasi.

## Menguji expiry tanpa menunggu 30 hari

Di database praktikum, buka [sql/demo_expire_subscription.sql](sql/demo_expire_subscription.sql), ganti `@demo_pengguna_id = 0` dengan user_id pelanggan demo, lalu jalankan. Panggil `/subscriptions/me`, kemudian `/partner/analitik`. Hasilnya Basic/expired dan 403. Ini fixture SQL untuk praktikum, bukan endpoint pengubah waktu di API.

## Pengujian otomatis

Gunakan database khusus dengan nama berakhiran `_test`:

```bash
npm run test:prepare
npm test
```

`TEST_DB_NAME` berada di `.env`. `test:prepare` mereset database test. Hasil verifikasi tersedia di [HASIL_UJI.md](HASIL_UJI.md). Runtime yang diuji langsung: Node.js 24 dan MariaDB 10.11 melalui dialect MySQL. Server MySQL 8 langsung belum diuji di lingkungan penyusun.

## Panduan dan presentasi

- [Kenneth — database dan model](../01_Kenneth/PANDUAN_Kenneth.md)
- [Bryan — checkout dan billing](../02_Bryan/PANDUAN_Bryan.md)
- [Dana — subscription efektif dan kuota](../03_Dana/PANDUAN_Dana.md)
- [Rafael — route, Postman dan pengujian](../04_Rafael/PANDUAN_Rafael.md)
- [PPT 12 slide](../Presentasi/BookData_API_Key_Sederhana.pptx)

`docs/asli` adalah arsip starter W7. Koleksi lama di sana merepresentasikan endpoint sebelum proteksi dan subscription 2.0. Gunakan koleksi aktif pada folder `postman` untuk versi ini. Endpoint contoh/Axios W7 dipertahankan, tetapi pengiriman webhook pihak ketiga tidak termasuk pengujian.

Logout W7 masih menghapus cookie client; refresh token belum memiliki pencabutan server. Integrasi pembayaran sungguhan, rekonsiliasi, refund dan penagihan otomatis berada di luar simulasi praktikum ini.
