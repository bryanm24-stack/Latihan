# Rafael — integrasi route, Postman dan pengujian

Jalankan Proyek_Lengkap sebagai aplikasi gabungan. Folder kode anggota adalah salinan sesuai bagian, bukan empat server terpisah.

## File utama

| File | Peran |
|---|---|
| app.js | Memasang router plans, subscriptions, payments dan partner; melindungi buku dengan JWT admin |
| src/routes/billing.js | Route publik katalog, JWT pelanggan, dan konfirmasi admin |
| src/routes/partner.js | Urutan key, fitur, kuota dan controller |
| src/controllers/partner.js | Data ringkasan dan analitik dari tabel buku |
| src/routes/index.js | Ekspor router gabungan |
| postman/BookData-W8.postman_collection.json | Demo 46 request dan 55 assertion |
| tests/api-key.integration.test.js | Integrasi HTTP + database nyata |

## Menjalankan

```bash
npm ci
npm run setup:env
# Sesuaikan .env dan nyalakan MySQL
npm run db:migrate
npm start
```

db:migrate menghapus data melalui seed. Untuk data W7/W8 yang dipertahankan, backup dan gunakan db:upgrade. Alternatif instalasi baru SQLyog adalah sql/install.sql. JWT akses default 15 menit agar demo checkout tidak terputus dalam 30 detik.

## Postman

Impor ulang koleksi W8 dan environment bookdata-local dari versi ini. Pilih BookData local dan jalankan seluruh folder berurutan melalui Runner. Ada 46 request, 55 assertion. Skrip menyimpan access_token pelanggan, admin_token, api_key, user_id, payment_id dan key idempotensi. Tutorial manual ada pada ALUR_POSTMAN.md.

Pelanggan checkout memakai {"plan":"premium"}; admin konfirmasi memakai {"simulation":true}. Pending tetap Basic. Paid mengaktifkan 30 hari. Renewal menambah periode yang masih tersisa. API key tidak berganti akibat upgrade.

## Makna layanan data

ringkasan memakai COUNT, SUM dan AVG untuk seluruh buku. Seed bawaan menghasilkan 5 judul, 49 stok, rata-rata harga 98200. Basic dan Premium boleh mengaksesnya.

analitik mengelompokkan judul/stok berdasarkan kategori dan mencari stok kurang dari atau sama dengan 5. Seed menghasilkan Laskar Pelangi stok 0 dan Bumi Manusia stok 4. Hanya Premium aktif yang boleh mengaksesnya.

CRUD /buku sekarang JWT admin. Jalur langsung /api-key/level/:id dinonaktifkan agar pelanggan tidak memperoleh akses tanpa invoice. Koleksi W7 lama dipindah ke docs/asli sebagai arsip, bukan koleksi pengujian versi 2.0.

## Pengujian dan batas hasil

```bash
npm run test:prepare
npm test
```

TEST_DB_NAME harus berakhiran _test. Perintah prepare mereset database test, bukan database utama. Suite mencatat 43 tes lulus (42 kasus perilaku dan satu induk). Newman W8 mencatat 46 request dan 55 assertion lulus. Upgrade W7 diuji dua kali tanpa mereset buku atau memperpanjang transisi Premium. sql/install.sql diuji membuat tujuh tabel.

Detail hasil pada HASIL_UJI.md. Runtime yang diuji Node.js 24 dan MariaDB 10.11, melalui mysql2/Sequelize dialect mysql. MySQL 8 langsung dan webhook pihak ketiga tidak diuji. Pembayaran simulasi tidak menagih uang. Integrasi gateway, refund dan penagihan otomatis belum ada.
