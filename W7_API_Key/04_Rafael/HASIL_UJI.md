# Hasil verifikasi BookData API
Tanggal: 26 Oktober 2026 (WIB)
Runtime: Node.js v24.22.1, MariaDB 10.11.14, mysql2 + Sequelize dialect mysql.

1. node:test: 22 lulus, 0 gagal, 0 skip.
   Angka 22 mencakup 1 test induk dan 21 subtest perilaku.
2. Newman W8: 18 request dan 21 assertion lulus, 0 gagal.
3. Newman Auth W7: 13 request dan 15 assertion lulus, 0 gagal.
   Assertion register W7 disesuaikan agar raw api_key tidak muncul.
4. db:upgrade: skema W7 asli berhasil di-upgrade dua kali.
   Lima buku tetap ada; UUID berubah menjadi SHA-256, tanpa double hash.
5. Instalasi database baru: schema + seed berhasil dijalankan.
6. Kode JavaScript: pemeriksaan sintaks berhasil.

## Kasus integrasi
2. database menyimpan SHA-256, bukan raw key
3. generate memerlukan JWT
4. generate kedua menghasilkan 409
5. dua generate bersamaan hanya menerbitkan satu key
6. key hilang / salah dan JWT saja tidak memberi akses partner
7. Basic mendapat ringkasan dari buku W7 dan header sisa kuota
8. Basic ditolak analitik tanpa menghabiskan kuota
9. visitor tidak dapat upgrade paket sendiri
10. admin menolak paket / id / body yang salah
11. admin menerima 404 jika target tidak ada
12. admin mengaktifkan Premium, key yang sama langsung mendapat analitik
13. me menampilkan penggunaan tanpa raw key atau hash
14. regenerate mencabut key lama tanpa menghapus pemakaian
15. downgrade segera menolak analitik
16. 11 request Basic bersamaan menerima tepat 10 slot
17. kuota harian 100 menolak request berikutnya walaupun menit masih kosong
18. Premium meloloskan lebih dari 10 request per menit
19. log merekam HTTP status sesudah respons tanpa menyimpan key
20. UUID lama yang sudah di-hash masih dapat dipakai
21. endpoint buku W7 tetap tersedia

## Mengulang pengujian

Jalankan dari `Proyek_Lengkap`:
```bash
npm ci
npm run setup:env
# Sesuaikan koneksi MySQL pada .env
npm run test:prepare
npm test
```

test:prepare melakukan reset seed khusus database `*_test`, bukan database operasional.
Untuk Postman, impor koleksi W8 dan environment bookdata-local lalu jalankan Runner berurutan.

## Batas verifikasi
- Runtime database yang diuji langsung adalah MariaDB 10.11, bukan server MySQL 8 langsung.
- Endpoint pihak ketiga W7 dan pengiriman webhook tidak termasuk pengujian ini.
- Premium merupakan simulasi aktivasi manual admin, belum terintegrasi pembayaran/masa aktif.
- CRUD buku lama tetap publik, sehingga versi praktikum belum menjual akses data eksklusif.
