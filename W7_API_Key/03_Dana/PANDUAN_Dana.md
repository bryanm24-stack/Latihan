# Dana — hak akses subscription dan kuota

Paket efektif harus dihitung dari subscription dan waktu database pada setiap akses. Cache api_level atau claim JWT tidak boleh menjadi satu-satunya sumber hak Premium.

## Bagian kode

| Bagian | Lokasi dan fungsi |
|---|---|
| `databaseNow` | services/clock.js: waktu UTC dari database |
| `effectiveSubscription` | services/billing.js: cek starts_at, ends_at dan status; sinkronkan cache |
| `subscriptionMe` | services/billing.js: lock akun dan membaca paket efektif |
| `verifyApiKey` | middlewares/verifyApiKey.js: key hash, pemilik dan paket efektif |
| `checkApiLevel` | middlewares/checkApiLevel.js: hak ringkasan/analitik |
| `reserveUsage` | services/apiUsage.js: cek ulang key, expiry, fitur dan kuota dalam transaksi |
| `limitApiUsage` | middlewares/limitApiUsage.js: HTTP 429, header kuota dan status log |

## Urutan request partner

1. verifyApiKey membaca X-API-Key, memeriksa format, menghitung SHA-256 dan mencari pemilik.
2. subscriptionMe memeriksa subscription pelanggan menggunakan jam database. Subscription expired menghasilkan Basic dan cache api_level ikut menjadi basic.
3. checkApiLevel menolak fitur di luar paket dengan 403. Analitik hanya untuk Premium aktif.
4. limitApiUsage memanggil reserveUsage. Service mengunci akun lalu memeriksa ulang key, masa aktif dan fitur. Ini menangani key yang diganti atau subscription yang berakhir di antara middleware.
5. Hitung log per hari/menit kalender UTC. Jika tersedia, catat reservasi slot sebelum controller berjalan; jika habis, kembalikan 429.
6. Controller mengirim data. Middleware memperbarui status log setelah respons selesai atau koneksi terputus.

## Mengapa lock diperlukan

COUNT lalu INSERT tanpa lock dapat meloloskan beberapa request pada slot terakhir. Transaksi READ COMMITTED dengan lock baris pengguna mengurutkan proses untuk akun yang sama. Pengecekan dan insert reservasi berjalan dalam transaksi yang sama. Semua operasi billing juga mengunci pengguna sebelum invoice agar urutannya konsisten.

## Aturan yang perlu dijelaskan

- Basic: 100/hari dan 10/menit. Premium: 10000/hari dan 100/menit.
- Penolakan key, fitur dan kuota sebelum reservasi tidak dihitung sebagai penggunaan.
- Slot yang sudah diterima tetap dihitung walaupun controller kemudian gagal.
- Kuota melekat ke pengguna. Rotasi key, pembayaran dan renewal tidak mereset hitungan.
- Ketika subscription expired, batas Basic berlaku. Jika pemakaian hari itu sudah melampaui Basic, ringkasan dapat ditolak 429 sampai periodenya reset.
- Expiry diperiksa saat request; tidak bergantung pada cron atau perubahan tanggal komputer pelanggan.

## Pengujian

Suite npm test menguji expiry, cache api_level palsu, cek ulang di reserveUsage, tepat 10 dari 11 request Basic bersamaan, kuota harian 100, serta Premium yang memakai lebih dari 10 request/menit. Kasus expiry memakai fixture database khusus test, bukan endpoint backdoor.

Untuk demonstrasi di SQLyog gunakan sql/demo_expire_subscription.sql hanya pada database praktikum. Setelah ends_at dibuat lewat, panggil subscriptions/me dan analitik. Key tetap valid; yang berubah adalah izin paket.
