-- INSTALASI BARU/RESET PRAKTIKUM: seed menghapus data lama.
CREATE DATABASE IF NOT EXISTS soa_bookdata_w8 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE soa_bookdata_w8;

-- ============================================================
-- SKEMA DATABASE — SOA MINGGU 7
-- ============================================================
--
-- Bandingkan file ini dengan sql/schema.sql versi Minggu 3.
-- Tabelnya SAMA — ORM tidak mengganti skema, dia MEMETAKAN skema yang
-- sudah ada. Yang ditambah hanya tiga kolom tanggal di `buku`:
--
--   createdAt  — kapan baris dibuat        (otomatis oleh Sequelize)
--   updatedAt  — kapan terakhir diubah     (otomatis oleh Sequelize)
--   deletedAt  — kapan dihapus (soft delete), tersedia untuk model paranoid,
--                saat kalian menyalakan `paranoid: true`.
--
-- Jalankan file ini via `npm run db:migrate` (scripts/migrate.js).

CREATE TABLE IF NOT EXISTS buku (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  judul         VARCHAR(150) NOT NULL,
  penulis       VARCHAR(100) NOT NULL,
  tahun_terbit  SMALLINT UNSIGNED NOT NULL,
  harga         INT UNSIGNED NOT NULL,
  stok          INT UNSIGNED NOT NULL DEFAULT 0,
  kategori      ENUM('novel', 'komik', 'non-fiksi', 'referensi') NOT NULL,

  -- Tiga kolom timestamps. Di model (src/models/Buku.js) mereka dipetakan
  -- otomatis karena `timestamps: true` — Sequelize mengisi nilainya
  -- sendiri; controller dan validasi TIDAK menyentuh mereka.
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
  deletedAt     DATETIME NULL DEFAULT NULL,

  -- UNIQUE di sini masih jaring pengaman kedua untuk "judul tidak boleh
  -- kembar" — tidak berubah dari Minggu 3. Lapis pertama tetap cek di
  -- controller, lapis ketiga baru muncul minggu ini: `unique: true` di
  -- definisi model. Tiga lapis, tiga tempat, satu aturan.
  UNIQUE KEY uq_buku_judul (judul)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS karakter (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buku_id   INT UNSIGNED NOT NULL,
  nama      VARCHAR(100) NOT NULL,
  peran     VARCHAR(50) NOT NULL,

  -- Sama seperti Minggu 3: penghapusan berantai adalah pekerjaan MySQL.
  -- Di model, relasi ini dinyatakan sebagai hasMany — baca
  -- src/models/Buku.js bagian `static associate`.
  CONSTRAINT fk_karakter_buku
    FOREIGN KEY (buku_id) REFERENCES buku(id)
    ON DELETE CASCADE,

  INDEX idx_karakter_buku_id (buku_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabel `penulis` dipertahankan dari schema praktikum sebelumnya.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS penulis (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(100) NOT NULL,
  negara        VARCHAR(100) NOT NULL,
  tahun_lahir   SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- MINGGU 7: tabel pengguna untuk AUTH.
--
--   pengguna_password  -> BCrypt HASH, BUKAN password asli. Kolomnya
--                         VARCHAR(255) karena hash bcrypt panjangnya
--                         ~60 karakter dan formatnya bisa berubah
--                         ($2a$/$2b$/$2y$...). Tidak ada yang bisa
--                         mengembalikan hash menjadi password -- itu
--                         justru tujuannya. Lihat src/controllers/auth.js.
--   roles              -> "visitor" untuk yang mendaftar sendiri.
--                         Bisa berisi beberapa: "admin" atau
--                         "visitor,editor" (dipecah checkRoles).
--   api_key, api_level -> dua kolom untuk MINGGU 8 (business model):
--                         api_key = identitas APLIKASI developer,
--                         api_level = tier rate limit ("basic"/"premium").
--                         Dibuat dari sekarang agar skema tidak
--                         berubah lagi minggu depan.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pengguna (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pengguna_nama     VARCHAR(30) NOT NULL,
  pengguna_jk       ENUM('L', 'P') NULL,
  pengguna_password VARCHAR(255) NOT NULL,
  pengguna_email    VARCHAR(100) NULL,
  roles             VARCHAR(50) NOT NULL DEFAULT 'visitor',
  api_key           VARCHAR(64) NULL,
  api_level         VARCHAR(50) NOT NULL DEFAULT 'basic',

  -- timestamps: Sequelize mengisi keduanya otomatis (timestamps: true).
  createdAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_pengguna_nama (pengguna_nama),
  UNIQUE KEY uq_pengguna_api_key (api_key)
) ENGINE=InnoDB;


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

-- KENNETH: tabel pembelian simulasi dan satu subscription terkini per akun.
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(50) NOT NULL,
  pengguna_id INT UNSIGNED NOT NULL,
  plan VARCHAR(50) NOT NULL,
  amount INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  billing_days SMALLINT UNSIGNED NOT NULL,
  checkout_key VARCHAR(100) NOT NULL,
  status ENUM('pending','paid','cancelled','expired') NOT NULL DEFAULT 'pending',
  expires_at DATETIME(3) NOT NULL,
  paid_at DATETIME(3) NULL,
  confirmed_by INT UNSIGNED NULL,
  period_start DATETIME(3) NULL,
  period_end DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_payment_invoice (invoice_no),
  UNIQUE KEY uq_payment_checkout (pengguna_id, checkout_key),
  INDEX idx_payment_owner (pengguna_id, id),
  INDEX idx_payment_pending (status, expires_at),
  CONSTRAINT fk_payment_owner FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_admin FOREIGN KEY (confirmed_by) REFERENCES pengguna(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pengguna_id INT UNSIGNED NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'premium',
  status ENUM('active','expired') NOT NULL DEFAULT 'active',
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  source ENUM('payment','legacy_migration') NOT NULL DEFAULT 'payment',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_subscription_owner (pengguna_id),
  INDEX idx_subscription_expiry (status, ends_at),
  CONSTRAINT fk_subscription_owner FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- DATA AWAL — SOA MINGGU 7
-- ============================================================
--
-- Data buku, karakter, dan penulis SAMA PERSIS dengan Minggu 3 — sengaja,
-- supaya response GET /api/v1/buku tetap bisa dibandingkan baris demi baris.
-- Akun pengguna demo admin ditambahkan khusus untuk materi auth Minggu 7.
--
-- File ini idempotent: setiap kali dijalankan, tabel dikosongkan lalu
-- diisi ulang. `npm run db:migrate` adalah tombol reset kalian.

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE karakter;
TRUNCATE TABLE buku;
TRUNCATE TABLE penulis;
TRUNCATE TABLE api_log;
TRUNCATE TABLE subscriptions;
TRUNCATE TABLE payments;
TRUNCATE TABLE pengguna;
SET FOREIGN_KEY_CHECKS = 1;

-- createdAt/updatedAt tidak ditulis eksplisit — kolomnya punya
-- DEFAULT CURRENT_TIMESTAMP, dan (mirip Sequelize nanti) isi timestamp
-- bukan urusan data seed, itu urusan mekanisme.
INSERT INTO buku (id, judul, penulis, tahun_terbit, harga, stok, kategori) VALUES
  (1, 'Jojo''s Bizarre Adventure', 'Hirohiko Araki', 1987, 120000, 8, 'komik'),
  (2, 'Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', 1997, 95000, 15, 'novel'),
  (3, 'Laskar Pelangi', 'Andrea Hirata', 2005, 78000, 0, 'novel'),
  (4, 'Bumi Manusia', 'Pramoedya Ananta Toer', 1980, 110000, 4, 'novel'),
  (5, 'Filosofi Teras', 'Henry Manampiring', 2018, 88000, 22, 'non-fiksi');

INSERT INTO karakter (buku_id, nama, peran) VALUES
  (1, 'Jotaro Kujo', 'protagonis'),
  (1, 'Dio Brando', 'antagonis'),
  (1, 'Giorno Giovanna', 'protagonis'),
  (2, 'Harry Potter', 'protagonis'),
  (2, 'Hermione Granger', 'protagonis'),
  (3, 'Ikal', 'protagonis'),
  (4, 'Minke', 'protagonis');
  -- Buku 5 (Filosofi Teras) sengaja tanpa karakter, sama seperti Minggu 2-3.

INSERT INTO penulis (id, nama, negara, tahun_lahir) VALUES
  (1, 'Hirohiko Araki', 'Jepang', 1960),
  (2, 'J.K. Rowling', 'Inggris', 1965),
  (3, 'Andrea Hirata', 'Indonesia', 1967),
  (4, 'Pramoedya Ananta Toer', 'Indonesia', 1925);

-- ------------------------------------------------------------
-- MINGGU 7: akun admin untuk mengetes role-based access.
--
-- Password aslinya: Admin123!
-- Yang tersimpan di bawah ini adalah HASIL BCrypt (cost 10) -- bukan
-- password. Kalau kalian generate bcrypt('Admin123!') sendiri, HASILNYA
-- BEDA tapi tetap valid -- itulah SALT: dua password identik menghasilkan
-- hash yang berbeda. Bandingkan sendiri:
--
--   node -e "console.log(require('bcryptjs').hashSync('Admin123!', 10))"
--
-- Register sendiri di Postman menghasilkan role 'visitor' -- karena
-- ATURAN BISNIS: tidak ada jalur API yang menciptakan admin.
-- Registrasi selalu memberi role visitor; admin hanya disediakan oleh
-- seed development ini.
-- ------------------------------------------------------------
INSERT INTO pengguna (id, pengguna_nama, pengguna_jk, pengguna_password, roles) VALUES
  (1, 'admin', 'L', '$2a$10$isKcE3QfjHwpZep4IB77KOUKktGtIAM5knz6FLxxHACbNfugDh3US', 'admin');
