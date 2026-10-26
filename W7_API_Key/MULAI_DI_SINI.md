# Mulai di sini — BookData API 2.0

Proyek lengkap sekarang mencakup **harga paket, checkout, invoice, konfirmasi pembayaran simulasi, Premium 30 hari, renewal, cancel pending, expiry dan kuota API**.

1. Buka [Proyek_Lengkap/README.md](Proyek_Lengkap/README.md) untuk instalasi. Jalankan server dari Proyek_Lengkap.
2. Database baru: npm ci, npm run setup:env, edit .env, npm run db:migrate, npm start. Seed menghapus data lama. Jika mempertahankan database W7, backup dan gunakan db:upgrade.
3. Untuk SQLyog, file [sql/install.sql](Proyek_Lengkap/sql/install.sql) sudah memuat CREATE DATABASE dan semua tabel/seed.
4. Impor ulang dua file di Proyek_Lengkap/postman. Ikuti [ALUR_POSTMAN.md](Proyek_Lengkap/ALUR_POSTMAN.md). Koleksi baru berisi 46 request.
5. Buka [PPT 12 slide](Presentasi/BookData_API_Key_Sederhana.pptx), tiga slide per pembicara.

## Empat panduan anggota

- [Kenneth](01_Kenneth/PANDUAN_Kenneth.md): database dan model.
- [Bryan](02_Bryan/PANDUAN_Bryan.md): harga, checkout dan billing.
- [Dana](03_Dana/PANDUAN_Dana.md): masa aktif, fitur dan kuota.
- [Rafael](04_Rafael/PANDUAN_Rafael.md): route, data partner dan pengujian.

Folder kode berisi isi file lengkap sesuai bagian; jangan menjalankannya sebagai empat aplikasi terpisah. Hasil gabungan berada di Proyek_Lengkap. PERUBAHAN.diff membandingkan file anggota terhadap starter W7.

Basic gratis. Premium Rp99.000 untuk tepat 30 hari. Admin mengonfirmasi pembayaran simulasi; tidak ada debit uang sungguhan. Semua status invoice, tanggal, renewal dan akses benar-benar berjalan. Lihat [HASIL_UJI.md](HASIL_UJI.md).
