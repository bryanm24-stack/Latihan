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

  UNIQUE KEY uq_pengguna_nama (pengguna_nama)
) ENGINE=InnoDB;
