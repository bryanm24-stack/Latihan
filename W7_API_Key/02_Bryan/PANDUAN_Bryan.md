# Bryan — harga, checkout dan konfirmasi subscription

Implementasi bisnis utama berada pada src/config/apiPlans.js, src/controllers/billing.js dan src/services/billing.js. Controller memvalidasi HTTP, sedangkan service menjalankan transaksi database.

## Fungsi yang dipakai

| Bagian | Lokasi dan pekerjaan |
|---|---|
| `API_PLANS` | config/apiPlans.js: Basic gratis, Premium 99000 untuk 30 hari |
| `plans` | controllers/billing.js: katalog publik harga, durasi, fitur dan kuota |
| `checkout` | controllers/billing.js: validasi plan dan Idempotency-Key |
| `checkout` | services/billing.js: harga server, invoice pending dan deduplikasi |
| `confirmPayment` / `changePayment` | services/billing.js: konfirmasi atomik, aktivasi dan renewal |
| `cancelPayment` | services/billing.js: pemilik membatalkan pending |
| `subscriptionMe` | services/billing.js: paket efektif dan masa aktif |
| `createApiKey` / `hashApiKey` | utils/apiKey.js: key acak dan SHA-256 |
| `issue` / `me` | controllers/apiKey.js: kelola key dan informasi kuota |

## Alur pembelian yang berjalan

1. GET /api/v1/plans menampilkan Basic dan Premium.
2. Pelanggan login lalu POST /subscriptions/checkout dengan Body {"plan":"premium"}. Header Authorization memakai JWT pelanggan. Idempotency-Key wajib dan dipertahankan saat mengulang transaksi yang sama.
3. Service mengambil price 99000 dan billingDays 30 dari API_PLANS. Body tidak menerima harga atau status paid. Invoice pending berlaku 24 jam.
4. Admin mengonfirmasi PATCH /payments/:id/confirm dengan JWT admin dan Body {"simulation":true}.
5. Service mengunci akun dan invoice, memeriksa status/deadline, memperbarui invoice menjadi paid serta membuat/memperbarui subscription dalam satu transaksi.
6. Key pelanggan yang sama langsung mendapat Premium. Tidak perlu generate ulang.

## Renewal dan idempotensi

Jika subscription masih aktif, periode yang dibeli dimulai dari ends_at yang lama. Jika sudah expired, periode baru dimulai dari waktu konfirmasi. Satu pembayaran menambah tepat 30 × 24 jam.

Invoice paid yang dikonfirmasi ulang tidak menambah masa aktif. Checkout key yang sama tidak membuat invoice baru. Dua invoice berbeda yang sama-sama sah masing-masing menambah 30 hari, termasuk saat dikonfirmasi bersamaan.

Invoice pending boleh dibatalkan pemilik. Invoice paid tidak dapat dibatalkan atau direfund pada simulasi ini. Invoice cancelled/expired tidak dapat dikonfirmasi. Untuk membeli lagi, gunakan checkout baru dan key idempotensi baru.

## Proteksi jalur lama

PATCH /api-key/level/:id tidak lagi mengaktifkan paket. Pelanggan mendapat 403 dan admin 410. Aktivasi harus melalui invoice sehingga status pembayaran dan masa aktif dapat diperiksa.

## Cara demonstrasi

Gunakan urutan pada Proyek_Lengkap/ALUR_POSTMAN.md. Request 10 membuat pending; 18 mengaktifkan; 19 membuktikan idempotensi; 23–24 memperpanjang; 27–29 membatalkan pending dan menolak konfirmasi cancelled.

Pembayaran tetap simulasi admin, tanpa transfer/debit uang. Transaksi, harga, periode dan hak akses benar-benar tersimpan. source legacy_migration adalah transisi akun lama, bukan invoice paid palsu.
