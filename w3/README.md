# SOA Minggu 3 — REST Service dengan MySQL

Starter praktikum Mata Kuliah Arsitektur Berbasis Layanan (SOA)
S1 Sistem Informasi Bisnis — ISTTS

Lanjutan dari Minggu 2: endpoint-nya **tidak berubah**, tapi datanya
sekarang di MySQL, bukan array di memori. Kalau ini pertama kalinya
kalian menyiapkan project ini, baca **[PANDUAN.md §1](PANDUAN.md#1-menjalankan-project)**
— langkah demi langkah mulai dari install MySQL sampai server menyala.

## Menjalankan

```bash
npm install
cp .env.example .env        # lalu sesuaikan kredensial MySQL di dalamnya
npm run db:migrate          # buat database, tabel, dan isi data awal
npm run dev
```

Buka http://localhost:3001

## Menguji

Impor `postman/SOA-Minggu2.postman_collection.json` dan
`postman/local.postman_environment.json` ke Postman, pilih environment `local`,
lalu jalankan Runner.

**28 request, 49 assertion, semuanya harus hijau.**

Lewat terminal:

```bash
npx newman run postman/SOA-Minggu2.postman_collection.json \
  -e postman/local.postman_environment.json
```

## Daftar endpoint

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/contoh` | req.query + jebakan tipe string |
| POST | `/api/v1/contoh` | req.body |
| GET | `/api/v1/contoh/array-function` | review map/find/filter/reduce |
| GET | `/api/v1/contoh/:nama/umur/:umur/jk/:jk?` | req.params, parameter opsional |
| PUT, POST | `/api/v1/contoh/gabungan/:id` | ketiga sumber input sekaligus |
| GET | `/api/v1/buku` | keyword, kategori, sort, order, limit, offset |
| POST | `/api/v1/buku` | 201 + header Location |
| GET | `/api/v1/buku/statistik` | agregat — perhatikan urutan route |
| GET | `/api/v1/buku/:bukuId` | 404 kalau tidak ada |
| PUT | `/api/v1/buku/:bukuId` | ganti seluruhnya |
| PATCH | `/api/v1/buku/:bukuId` | ubah sebagian |
| DELETE | `/api/v1/buku/:bukuId` | hapus |
| GET | `/api/v1/buku/:bukuId/karakter/:karakterId?` | nested resource |

Method lain pada path di atas menghasilkan **405** beserta header `Allow`.

## Panduan lengkap

Baca **[PANDUAN.md](PANDUAN.md)** — konsep REST/Express, migrasi ke MySQL
(install, `npm run db:migrate`, pool koneksi, repository pattern, prepared
statement/SQL Injection, dst), dan Latihan 1–8.

## Tugas yang dikumpulkan

**[TUGAS-RENTAL.md](TUGAS-RENTAL.md)** — studi kasus CV Wira Jaya Rental:
klien minta backend REST API buat bisnis rental kendaraan mereka. Resource
dan aturan bisnis baru, di luar `buku`/`penulis`, untuk membuktikan kalian
paham POLA-nya (bukan cuma hafal kodenya).

## Catatan versi

- Node 24 LTS
- Express 4 — sengaja, agar cocok dengan materi referensi.
  Express 5 mengubah sintaks parameter opsional `:jk?`.
- MySQL lewat `mysql2/promise`, tanpa ORM. Minggu 4 menambahkan
  Sequelize di atas skema yang sama. Endpoint tidak akan berubah.
