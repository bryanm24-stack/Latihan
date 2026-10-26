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
