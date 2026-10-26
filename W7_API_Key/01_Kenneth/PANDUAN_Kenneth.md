# Kenneth — Tahap 1: Database dan model

**Target:** menyediakan penyimpanan hash key dan log pemakaian yang dapat dipakai Bryan dan Dana. Kerjakan fondasi ini terlebih dahulu. Semua file di `kode/` sudah berisi implementasi final.

## File yang menjadi tanggung jawab

| File | Status terhadap W7 |
|---|---|
| `sql/schema.sql` | Diubah |
| `sql/seed.sql` | Diubah |
| `sql/api_key_upgrade.sql` | Baru |
| `src/models/ApiLog.js` | Baru |
| `src/models/Pengguna.js` | Diubah |
| `src/models/index.js` | Diubah |
| `scripts/migrate.js` | Diubah |
| `scripts/upgrade-api-key.js` | Baru |

## Langkah 1 — Tabel dan index

Pada `sql/schema.sql`, kolom `pengguna.api_key` yang sudah ada tetap `VARCHAR(64)` dan sekarang menyimpan hash SHA-256. Tambahkan unique index `uq_pengguna_api_key` untuk mencegah satu hash dimiliki dua akun. MySQL tetap memperbolehkan banyak nilai NULL, sehingga akun tanpa key tidak saling berbenturan.

Tabel baru `api_log` memakai foreign key ke `pengguna.id`. Index gabungan `(pengguna_id, createdAt)` membantu pencarian penggunaan satu akun pada rentang waktu tertentu. Engine InnoDB diperlukan agar transaksi dan row lock milik Dana bekerja.

```sql
-- KENNETH: log sekaligus reservasi kuota untuk request yang diterima.
CREATE TABLE IF NOT EXISTS api_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pengguna_id INT UNSIGNED NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  status_code SMALLINT UNSIGNED NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_api_log_pengguna FOREIGN KEY (pengguna_id)
    REFERENCES pengguna(id) ON DELETE CASCADE,
  INDEX idx_api_log_pengguna_waktu (pengguna_id, createdAt)
) ENGINE=InnoDB;
```

## Langkah 2 — Model Sequelize

`src/models/ApiLog.js` memetakan semua kolom di tabel log. `status_code` boleh NULL karena slot kuota dicatat sebelum respons selesai. Dana memperbarui status pada event respons. Relasi `ApiLog.belongsTo(Pengguna)` dan `Pengguna.hasMany(ApiLog)` memakai nama foreign key yang sama, yaitu `pengguna_id`.

Daftarkan `ApiLog` pada `src/models/index.js` sebelum loop `associate()`. Pada `Pengguna.js`, validasi `api_level` menerima Basic/Premium dan defaultScope menyembunyikan `api_key` beserta hash password. Scope menyaring SELECT, sehingga controller register tetap mengambil ulang data sebelum mengirim respons.

## Langkah 3 — Seed dan migrasi

`sql/seed.sql` mengosongkan `api_log` sebelum `pengguna` pada reset database. Admin demo tidak memperoleh UUID mentah lagi. Pengelolaan key dilakukan lewat endpoint Bryan.

- Database baru: `npm run db:migrate` membuat tabel dan mengisi seed, sekaligus menghapus isi tabel yang tercantum pada seed jika sudah ada.
- Database W7 lama: `npm run db:upgrade` menjalankan `scripts/upgrade-api-key.js`. Script membaca `sql/api_key_upgrade.sql`, menambahkan index jika belum ada, dan meng-hash UUID lama satu kali. Key UUID asli yang sudah diketahui pemilik tetap dapat dipakai karena middleware mendukung format lama tersebut.
- Upgrade hanya menyasar format UUID dari starter W7. Simpan backup sebelum DDL karena MySQL tidak membungkus seluruh perubahan skema dalam transaksi tunggal.
- `scripts/migrate.js` juga memvalidasi nama database sebelum memasukkannya ke SQL identifier.

## Langkah 4 — Pemeriksaan di SQLyog

```sql
SHOW TABLES;
SHOW INDEX FROM pengguna;
SHOW INDEX FROM api_log;
SHOW CREATE TABLE api_log;
SELECT id, pengguna_nama, api_level, LENGTH(api_key) AS hash_length
FROM pengguna;
SELECT pengguna_id, endpoint, http_method, status_code, createdAt
FROM api_log ORDER BY id DESC LIMIT 20;
```

Sebelum generate, `hash_length` adalah NULL. Setelah generate, nilainya 64. Jangan menampilkan raw key dalam screenshot presentasi. Uji alur API penuh mengikuti panduan Rafael setelah bagian Bryan/Dana terpasang.

## Hasil yang diserahkan

Skema, seed, model, dan migrasi lengkap tersedia di `kode/`. `PERUBAHAN.diff` membandingkan file tersebut terhadap starter W7. Bryan membutuhkan `Pengguna`, Dana membutuhkan `ApiLog` dan `sequelize`. Hindari membuat model bernama ApiUsage karena implementasi final konsisten memakai **ApiLog**.


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
