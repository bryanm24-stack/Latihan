# BookData API — W7 dan Business Model API Key

Jalankan aplikasi dari folder **Proyek_Lengkap**. Folder anggota berisi salinan kode sesuai bagian masing-masing.

## Empat panduan anggota

| Urutan | Anggota | Panduan |
|---|---|---|
| 1 | Kenneth | [PANDUAN_Kenneth.md](01_Kenneth/PANDUAN_Kenneth.md) |
| 2 | Bryan | [PANDUAN_Bryan.md](02_Bryan/PANDUAN_Bryan.md) |
| 3 | Dana | [PANDUAN_Dana.md](03_Dana/PANDUAN_Dana.md) |
| 4 | Rafael | [PANDUAN_Rafael.md](04_Rafael/PANDUAN_Rafael.md) |

Setiap folder anggota memuat `kode/` dengan path asli W7 dan `PERUBAHAN.diff` sebagai pembanding starter.

## Menjalankan aplikasi

1. Buka terminal pada `Proyek_Lengkap`.
2. Jalankan `npm ci` dan `npm run setup:env`.
3. Sesuaikan koneksi MySQL pada `.env`.
4. Untuk database baru atau reset data praktikum, jalankan `npm run db:migrate`. Perintah ini menjalankan seed yang menghapus data lama.
5. Untuk mempertahankan data W7 yang sudah ada, buat backup lalu gunakan `npm run db:upgrade`.
6. Jalankan `npm start`.

Lihat petunjuk lengkap pada [README.md](Proyek_Lengkap/README.md).

## Postman dan pengujian

Impor koleksi [BookData-W8](Proyek_Lengkap/postman/BookData-W8.postman_collection.json) dan [environment bookdata-local](Proyek_Lengkap/postman/bookdata-local.postman_environment.json). Jalankan 18 request secara berurutan melalui Collection Runner.

Untuk pengujian pada database khusus test, jalankan `npm run test:prepare`, kemudian `npm test`. Lihat [HASIL_UJI.md](HASIL_UJI.md) untuk catatan verifikasi.

## Presentasi

[BookData_API_Key_Final.pptx](Presentasi/BookData_API_Key_Final.pptx) berisi 12 slide dengan cuplikan JavaScript dan penjelasan fungsi. Kenneth membawakan slide 1–3, Bryan 4–6, Dana 7–9, dan Rafael 10–12.

## Catatan implementasi

`node_modules` dan `.env` berisi secret tidak disertakan. `setup:env` membuat secret lokal otomatis. Dokumen W7 asli tersedia sebagai Markdown di [docs/asli](Proyek_Lengkap/docs/asli/README.md).

Premium Rp99.000/bulan merupakan simulasi aktivasi admin. Payment gateway dan masa aktif otomatis belum tersedia. Endpoint buku W7 lama tetap publik. Pembahasan batas produksi terdapat pada panduan Rafael.
