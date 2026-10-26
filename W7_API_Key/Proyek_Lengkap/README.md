# BookData API — Business Model API Key

Pengembangan starter W7 dengan pengelolaan API key, paket Basic/Premium, pembatasan penggunaan, dan layanan partner.

## Instalasi dan konfigurasi

Jalankan perintah berikut dari folder `Proyek_Lengkap`:

```bash
npm ci
npm run setup:env
```

Sesuaikan koneksi MySQL pada `.env`. `setup:env` membuat dua JWT secret lokal yang berbeda dan tidak menimpa `.env` yang sudah ada.

Untuk database praktikum baru atau reset:

```bash
npm run db:migrate
npm start
```

**`db:migrate` menjalankan seed yang menghapus data lama.** Jika data W7 perlu dipertahankan, buat backup dan gunakan `npm run db:upgrade`, kemudian `npm start`.

Alamat lokal default: `http://localhost:3001`.

## Menguji menggunakan Postman

1. Impor [BookData-W8.postman_collection.json](postman/BookData-W8.postman_collection.json).
2. Impor dan pilih [bookdata-local.postman_environment.json](postman/bookdata-local.postman_environment.json).
3. Jalankan request 01–18 secara berurutan melalui Collection Runner.

Skrip koleksi menyimpan token dan API key ke environment. Endpoint pengelolaan key memakai Bearer JWT, sedangkan endpoint partner memakai header `X-API-Key`. JWT W7 berlaku 30 detik. Login ulang atau refresh jika token kedaluwarsa saat pengujian manual.

## Pengujian integrasi

```bash
npm run test:prepare
npm test
```

`test:prepare` melakukan reset seed khusus database `*_test`. Catatan hasil verifikasi tersedia pada [HASIL_UJI.md](HASIL_UJI.md).

## Panduan dan presentasi

| Urutan | Anggota | Panduan |
|---|---|---|
| 1 | Kenneth | [Database dan model](../01_Kenneth/PANDUAN_Kenneth.md) |
| 2 | Bryan | [Paket dan pengelolaan key](../02_Bryan/PANDUAN_Bryan.md) |
| 3 | Dana | [Validasi, fitur dan kuota](../03_Dana/PANDUAN_Dana.md) |
| 4 | Rafael | [Layanan, integrasi dan pengujian](../04_Rafael/PANDUAN_Rafael.md) |

Presentasi: [BookData_API_Key_Final.pptx](../Presentasi/BookData_API_Key_Final.pptx), 12 slide dengan cuplikan JavaScript dan penjelasannya.

Referensi starter W7: [README asli](docs/asli/README.md) dan [PANDUAN asli](docs/asli/PANDUAN.md).

## Batas implementasi

Premium Rp99.000/bulan merupakan simulasi. Admin mengaktifkan paket secara manual. Payment gateway dan masa aktif otomatis belum tersedia. CRUD buku lama tetap publik agar fitur W7 tetap berfungsi.
