# Rafael — Tahap 4: Endpoint, integrasi dan demonstrasi

**Prasyarat:** bagian Kenneth, Bryan dan Dana sudah digabung. **Target:** proyek lengkap berjalan, endpoint menghasilkan data buku W7, dan demo menjelaskan kaitan kode dengan model bisnis.

## File yang menjadi tanggung jawab

| File | Status terhadap W7 |
|---|---|
| `src/controllers/partner.js` | Baru |
| `src/routes/partner.js` | Baru |
| `src/routes/index.js` | Diubah |
| `src/databases/connection.js` | Diubah |
| `app.js` | Baru |
| `index.js` | Diubah |
| `.env.example` | Diubah |
| `package.json` | Diubah |
| `package-lock.json` | Diubah |
| `scripts/setup-env.js` | Baru |
| `scripts/create-test-db.js` | Baru |
| `tests/api-key.integration.test.js` | Baru |
| `postman/BookData-W8.postman_collection.json` | Baru |
| `postman/bookdata-local.postman_environment.json` | Baru |
| `postman/SOA-Minggu7.postman_collection.json` | Diubah |

## Langkah 1 — Integrasi aplikasi

`app.js` memasang middleware global, endpoint W7, router API key dan partner. `index.js` memvalidasi JWT secret, memulai listener, lalu memeriksa database. Pemisahan ini memungkinkan test memakai objek app yang sama dengan aplikasi tanpa menyalakan listener dua kali.

`src/routes/index.js` mengekspor `apiKeyRouter` dan `partnerRouter`. Dua pemasangan baru di app:

```js
app.use("/api/v1/api-key", apiKeyRouter);
app.use("/api/v1/partner", partnerRouter);
```

`src/databases/connection.js` menetapkan timezone UTC untuk konsistensi timestamp. SQL logging aktif hanya jika `.env` memiliki `SQL_LOG=true`. `npm run dev` memakai `node --watch`, sehingga tidak membutuhkan nodemon yang belum tercantum sebagai dependency starter W7.

## Langkah 2 — Endpoint data partner

`controllers/partner.js` menjalankan query Sequelize pada tabel buku. Respons merupakan hasil agregasi data aktual, bukan data statis demonstrasi.

- Ringkasan: jumlah judul, total stok, rata-rata harga.
- Analitik: jumlah judul dan stok per kategori serta daftar stok kurang dari atau sama dengan 5.

Contoh respons ringkasan pada seed asli:

```json
{"data":{"total_judul":5,"total_stok":49,"rata_rata_harga":98200}}
```

Angka respons bergantung data database. Cocokkan terhadap hasil query aktual sebelum demo; perubahan CRUD buku akan mengubah agregat. Kode route sebenarnya:

```js
// Cek fitur SEBELUM reservasi. Penolakan 401/403/429 tidak menghabiskan kuota.
router.get("/ringkasan", asyncHandler(verifyApiKey), checkApiLevel("ringkasan"),
  asyncHandler(limitApiUsage), asyncHandler(ringkasan));
router.get("/analitik", asyncHandler(verifyApiKey), checkApiLevel("analitik"),
  asyncHandler(limitApiUsage), asyncHandler(analitik));
```

## Daftar endpoint yang dipakai demo


| Method | Endpoint | Kredensial | Kegunaan |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Publik | Membuat pengguna visitor dengan paket Basic |
| POST | `/api/v1/auth/login` | Username/password | Mendapat JWT 30 detik |
| POST | `/api/v1/auth/refresh` | Refresh cookie | Memperoleh JWT baru |
| POST | `/api/v1/api-key/generate` | Bearer JWT | Menerbitkan satu key aktif |
| POST | `/api/v1/api-key/regenerate` | Bearer JWT | Mengganti dan mencabut key lama |
| GET | `/api/v1/api-key/me` | Bearer JWT | Paket dan ringkasan pemakaian |
| PATCH | `/api/v1/api-key/level/:id` | JWT admin | Simulasi aktivasi/downgrade paket |
| GET | `/api/v1/partner/ringkasan` | X-API-Key | Ringkasan buku Basic/Premium |
| GET | `/api/v1/partner/analitik` | X-API-Key Premium | Kelompok kategori dan stok rendah |


## Langkah 3 — Postman

1. Impor `postman/BookData-W8.postman_collection.json` dan `postman/bookdata-local.postman_environment.json`.
2. Pilih environment BookData local dan pastikan `base_url` sesuai server.
3. Jalankan 18 request lewat Collection Runner **berurutan**. Request pertama membuat nama akun acak; script test menyimpan ID, JWT dan key pada environment.
4. Nomor 02 login pelanggan, nomor 03 generate key. Nomor 07 menunjukkan 403 Basic pada analitik. Nomor 08 membuktikan visitor tidak dapat upgrade.
5. Nomor 09 login admin, nomor 10 aktivasi Premium, nomor 11 analitik berhasil.
6. Nomor 13 regenerate, nomor 14 key lama ditolak, nomor 15 key baru diterima.
7. Nomor 17 downgrade dan nomor 18 kembali menolak analitik.
8. Collection Runner sebaiknya selesai di bawah 30 detik karena JWT W7 singkat. Untuk demo manual yang dijeda, jalankan ulang login pelanggan/admin, lalu lanjutkan request yang dibutuhkan.

Koleksi W7 tetap ada. Assertion register disesuaikan agar mengharapkan `api_key` tidak muncul karena penerbitan dipindahkan ke generate. Dokumentasi W7 asli di `docs/asli` menjelaskan kondisi sebelum perubahan. Beberapa endpoint lama melakukan request pihak ketiga atau webhook. Pengujian tugas ini berfokus pada API key lokal dan tidak mengaktifkan webhook Discord.

## Langkah 4 — Pengujian otomatis

```bash
npm run test:prepare
npm test
```

Test memakai database terpisah `soa_bookdata_w8_test`, bukan DB_NAME operasional. Boleh ganti dengan `TEST_DB_NAME` yang wajib berakhiran `_test`. `test:prepare` membuat dan me-reset seed pada database uji tersebut, jadi jangan gunakan nama database penting. Koneksi host/user/password mengikuti `.env`. Pengguna MySQL memerlukan hak CREATE DATABASE untuk persiapan ini.

Test menggunakan `node:test`, HTTP pada port acak, Sequelize dan database nyata, tanpa mock kuota. Hasil verifikasi yang disertakan berada di `HASIL_UJI.txt`. Pada lingkungan pembuat, database yang diuji adalah MariaDB 10.11 melalui dialect mysql. MySQL 8 belum diuji langsung di lingkungan pembuat.

## Langkah 5 — Urutan presentasi anggota

| Urutan | Pembicara | Hal yang dijelaskan |
|---|---|---|
| Pembukaan | Bryan | Masalah W7, pelanggan dan paket |
| Implementasi 1 | Kenneth | Tabel, index, model dan migrasi |
| Implementasi 2 | Bryan | Key acak, hashing, generate dan admin |
| Implementasi 3 | Dana | Middleware, fitur dan kuota dengan lock |
| Implementasi 4 | Rafael | Endpoint data, demo Postman dan hasil test |

Urutan **pengerjaan** tetap Kenneth, Bryan, Dana, Rafael. Bryan boleh membuka presentasi untuk menjelaskan konteks bisnis. PPT ada pada folder `Presentasi` di paket utama, berisi cuplikan kode dari file final dan catatan pembicara.

## Batas implementasi yang harus dijelaskan dengan jujur

Endpoint CRUD buku W7 tetap publik demi kompatibilitas materi. Data yang menjadi sumber analitik masih dapat diambil lewat jalur publik tersebut, sehingga versi ini **belum layak dijual sebagai akses data eksklusif**. Sebelum produksi, lindungi atau pisahkan endpoint lama sesuai aturan bisnis. Aktivasi Premium masih manual, belum memiliki payment gateway atau kedaluwarsa otomatis. Sistem juga belum menyediakan banyak key per pengguna dan pencabutan refresh JWT di server. Jangan mengklaim fitur-fitur itu sudah dibuat.


## Cara memakai folder anggota

Folder `kode/` berisi **isi file lengkap**, bukan potongan atau placeholder. Path di bawah `kode/` mengikuti path proyek W7. Folder anggota merupakan bahan pembagian kerja dan review, bukan aplikasi mandiri. Semua dependensi dan hasil integrasi tersedia dalam `../Proyek_Lengkap/`. Salinan file di folder anggota sama persis dengan file final proyek gabungan.

Untuk menjalankan hasil akhir, buka terminal di `Proyek_Lengkap`, bukan di `kode/` anggota:

```bash
npm ci
npm run setup:env
```

Edit `.env` sesuai MySQL lokal. Script membuat dua JWT secret berbeda dan memakai `DB_NAME=soa_bookdata_w8` agar tidak memakai database latihan lama secara tidak sengaja. Default port MySQL pada `.env.example` adalah 3306 dan port HTTP 3001. Gunakan Node.js 24 dan MySQL 8 / MariaDB dengan tabel InnoDB.

Jika database baru dan data boleh di-reset:

```bash
npm run db:migrate
npm start
```

**`db:migrate` menjalankan seed dengan TRUNCATE.** Untuk database W7 berisi data, backup terlebih dahulu, arahkan `.env` ke database tersebut, lalu gunakan `npm run db:upgrade` sebagai pengganti `db:migrate`. Upgrade menambah tabel/index dan mengubah UUID key lama menjadi SHA-256 tanpa menjalankan seed.

JWT lama W7 tetap berlaku 30 detik. Jika endpoint pengelolaan key mengembalikan 403 karena token kedaluwarsa, login ulang atau panggil refresh. Kredensial admin seed: `admin` / `Admin123!` untuk demo lokal.
