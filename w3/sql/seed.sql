-- ============================================================
-- DATA AWAL — SOA MINGGU 3
-- ============================================================
--
-- Data ini SAMA PERSIS dengan isi src/data/buku.js dan
-- src/data/penulis.js versi Minggu 2 (array di memori), supaya
-- kalian bisa membandingkan hasil GET /api/v1/buku sebelum dan
-- sesudah migrasi dan melihat: response-nya identik.
--
-- File ini aman dijalankan berulang kali (idempotent). Setiap kali
-- dijalankan, isi tabel dikosongkan dulu lalu diisi ulang dari awal —
-- jadi data latihan kalian yang kacau bisa direset kapan saja dengan
-- `npm run db:migrate`.

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE karakter;
TRUNCATE TABLE buku;
TRUNCATE TABLE penulis;
SET FOREIGN_KEY_CHECKS = 1;


SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE transaksi;
TRUNCATE TABLE kendaraan;
TRUNCATE TABLE pelanggan;

SET FOREIGN_KEY_CHECKS = 1;

-- id sengaja ditulis eksplisit (bukan dibiarkan AUTO_INCREMENT begitu
-- saja) supaya urutannya pasti sama dengan Minggu 2, dan koleksi Postman
-- yang mengetes /api/v1/buku/1 tetap jalan tanpa perubahan.
INSERT INTO buku (id, judul, penulis, tahun_terbit, harga, stok, kategori) VALUES
  (1, 'Jojo''s Bizarre Adventure', 'Hirohiko Araki', 1987, 120000, 8, 'komik'),
  (2, 'Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', 1997, 95000, 15, 'novel'),
  (3, 'Laskar Pelangi', 'Andrea Hirata', 2005, 78000, 0, 'novel'),
  (4, 'Bumi Manusia', 'Pramoedya Ananta Toer', 1980, 110000, 4, 'novel'),
  (5, 'Filosofi Teras', 'Henry Manampiring', 2018, 88000, 22, 'non-fiksi');

-- karakter.id TIDAK ditulis eksplisit: biarkan AUTO_INCREMENT jalan
-- berurutan (1, 2, 3, ...) mengikuti urutan INSERT di bawah. Beda dengan
-- Minggu 2 yang id karakternya terhitung ULANG per buku (1,2,3 lalu
-- 1,2 lagi) — di database, id itu WAJIB unik di seluruh tabel, bukan
-- per grup. Ini konsekuensi normalisasi: buku 1 karakter 2 = "Dio Brando".
INSERT INTO karakter (buku_id, nama, peran) VALUES
  (1, 'Jotaro Kujo', 'protagonis'),
  (1, 'Dio Brando', 'antagonis'),
  (1, 'Giorno Giovanna', 'protagonis'),
  (2, 'Harry Potter', 'protagonis'),
  (2, 'Hermione Granger', 'protagonis'),
  (3, 'Ikal', 'protagonis'),
  (4, 'Minke', 'protagonis');
  -- Buku 5 (Filosofi Teras) sengaja tanpa karakter, sama seperti Minggu 2.

INSERT INTO penulis (id, nama, negara, tahun_lahir) VALUES
  (1, 'Hirohiko Araki', 'Jepang', 1960),
  (2, 'J.K. Rowling', 'Inggris', 1965),
  (3, 'Andrea Hirata', 'Indonesia', 1967),
  (4, 'Pramoedya Ananta Toer', 'Indonesia', 1925);


INSERT INTO kendaraan
  (id, nama, jenis, plat_nomor, tarif_per_hari, status)
VALUES
  (1, 'Honda Beat', 'motor', 'L 1234 AB', 75000, 'tersedia'),
  (2, 'Toyota Avanza', 'mobil', 'L 5678 CD', 350000, 'tersedia'),
  (3, 'Honda Vario', 'motor', 'L 9012 EF', 100000, 'servis');


INSERT INTO pelanggan
  (id, nama, no_ktp, no_hp)
VALUES
  (1, 'Andi Wijaya', '3578010101010001', '081234567890'),
  (2, 'Budi Santoso', '3578010101010002', '081234567891');