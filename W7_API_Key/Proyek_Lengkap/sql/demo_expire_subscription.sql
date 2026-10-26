-- HANYA DATABASE PRAKTIKUM: simulasi lewat masa aktif tanpa menunggu 30 hari.
-- Ganti 0 dengan user_id pelanggan dari environment Postman. Nilai 0 tidak mengubah akun.
SET @demo_pengguna_id = 0;
UPDATE subscriptions
SET ends_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND)
WHERE pengguna_id = @demo_pengguna_id;
-- Setelah ini panggil GET /api/v1/subscriptions/me, lalu GET /api/v1/partner/analitik.
-- Sistem menghitung Basic dan mengubah cache api_level otomatis saat request.
