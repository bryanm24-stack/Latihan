# Alur Postman — pembelian Premium sampai pemakaian API

Jalankan aplikasi dari Proyek_Lengkap dan siapkan database menurut README.md. Impor ulang kedua file di folder postman. Pilih environment **BookData local**, dengan base_url `http://localhost:3001`.

## Demo inti yang perlu dipahami

| Nomor | Tindakan | Dampak pada database/akses |
|---|---|---|
| 01 | Lihat paket | Basic Rp0; Premium Rp99.000/30 hari |
| 02–05 | Register, login, cek Basic, generate key | Akun Basic dan hash key tersimpan |
| 06–07 | Coba ringkasan dan analitik | Ringkasan 200; analitik 403 |
| 10 | Checkout Premium | Invoice pending, hak akses tetap Basic |
| 11 | Ulang checkout yang sama | Invoice sama, tanpa duplikasi |
| 15–18 | Login admin dan konfirmasi simulasi | Invoice paid, Premium aktif 30 hari |
| 19 | Konfirmasi ulang | Tidak menambah masa aktif |
| 20–22 | Lihat subscription dan akses analitik | Premium aktif, key yang sama mendapat 200 |
| 23–25 | Checkout baru dan konfirmasi | Tanggal berakhir bertambah 30 hari |
| 27–29 | Buat lalu batalkan invoice | Cancelled, tidak dapat dikonfirmasi |
| 39–41 | Regenerate dan uji key | Key lama 401, key baru tetap Premium |

Request lain adalah uji penolakan yang sengaja diharapkan. Status 400/401/403/404/409/410 pada request berlabel ditolak bukan kegagalan implementasi jika assertion lulus.

## Header yang dipakai

| Keperluan | Header |
|---|---|
| Akun pelanggan, checkout, riwayat | `Authorization: Bearer {{access_token}}` |
| Konfirmasi dan daftar pending admin | `Authorization: Bearer {{admin_token}}` |
| Ringkasan/analitik partner | `X-API-Key: {{api_key}}` |
| Checkout | Tambahkan `Idempotency-Key: {{checkout_key}}` |

## Body checkout pelanggan

`POST {{base_url}}/api/v1/subscriptions/checkout`, Body → raw → JSON:

```json
{"plan":"premium"}
```

Server menetapkan nominal 99000 dan durasi 30 hari. Mengirim amount, status, roles atau api_level ditolak. Request 10 membuat checkout_key baru setiap Send. Untuk mengulang pembelian yang sama, gunakan request 11, yang mempertahankan key tersebut. Untuk perpanjangan, request 23 membuat renew_key baru.

## Body konfirmasi admin

`PATCH {{base_url}}/api/v1/payments/{{payment_id}}/confirm`:

```json
{"simulation":true}
```

Admin memakai admin_token. Pelanggan tetap memakai access_token sendiri. Header ini tidak saling ditimpa oleh skrip koleksi. payment_id adalah ID invoice, sedangkan user_id adalah ID pelanggan. Tidak ada uang yang dipindahkan.

## Setelah paid

`GET /subscriptions/me` menampilkan api_level, subscription.status, starts_at, ends_at dan server_time. Tanggal memakai UTC. `GET /api-key/me` menambahkan pemakaian dan sisa kuota. Keduanya berbeda dari `/partner/ringkasan`, yang menampilkan data buku.

GET `/partner/analitik` memakai API key asli dari respons generate/regenerate, bukan hash pada SQLyog. Request GET tidak memerlukan Body.

## Demonstrasi kedaluwarsa

Jalankan fixture `sql/demo_expire_subscription.sql` pada database praktikum setelah mengganti user_id 0 dengan user_id demo. Kemudian panggil `/subscriptions/me` dan `/partner/analitik`. Paket efektif menjadi Basic dan analitik ditolak 403. Key tetap valid untuk Basic, selama kuota tersedia. Pengujian otomatis menguji expiry dengan fixture database tanpa menunggu 30 hari.

## Menjalankan Runner

Pilih semua folder dari atas ke bawah, satu iterasi. Ada 46 request dan 55 assertion. Registrasi membuat username acak sehingga koleksi bisa dijalankan ulang. JWT default 15 menit. Bila menunda demo lama, login ulang pelanggan/admin atau gunakan refresh untuk pelanggan yang cookie-nya sesuai. API key tidak mengikuti masa kedaluwarsa JWT.

## Seluruh urutan request

| Request | Method dan endpoint | HTTP yang diharapkan |
|---|---|---|
| 01 Lihat paket dan harga | `GET /api/v1/plans` | 200 |
| 02 Register pelanggan | `POST /api/v1/auth/register` | 201 |
| 03 Login pelanggan | `POST /api/v1/auth/login` | 200 |
| 04 Subscription awal Basic | `GET /api/v1/subscriptions/me` | 200 |
| 05 Generate API key | `POST /api/v1/api-key/generate` | 201 |
| 06 Basic memakai ringkasan | `GET /api/v1/partner/ringkasan` | 200 |
| 07 Basic ditolak analitik | `GET /api/v1/partner/analitik` | 403 |
| 08 Checkout tanpa JWT ditolak | `POST /api/v1/subscriptions/checkout` | 401 |
| 09 Harga dari pelanggan ditolak | `POST /api/v1/subscriptions/checkout` | 400 |
| 10 Checkout Premium membuat invoice pending | `POST /api/v1/subscriptions/checkout` | 201 |
| 11 Ulang checkout yang sama tanpa invoice ganda | `POST /api/v1/subscriptions/checkout` | 200 |
| 12 Lihat detail invoice pending | `GET /api/v1/payments/{{payment_id}}` | 200 |
| 13 Pending masih ditolak analitik | `GET /api/v1/partner/analitik` | 403 |
| 14 Pelanggan tidak boleh konfirmasi pembayaran | `PATCH /api/v1/payments/{{payment_id}}/confirm` | 403 |
| 15 Login admin simulasi | `POST /api/v1/auth/login` | 200 |
| 16 Admin melihat invoice pending | `GET /api/v1/payments/admin/pending` | 200 |
| 17 Konfirmasi wajib mengakui simulasi | `PATCH /api/v1/payments/{{payment_id}}/confirm` | 400 |
| 18 Konfirmasi pembayaran simulasi | `PATCH /api/v1/payments/{{payment_id}}/confirm` | 200 |
| 19 Konfirmasi ulang tidak memperpanjang | `PATCH /api/v1/payments/{{payment_id}}/confirm` | 200 |
| 20 Pelanggan melihat subscription aktif | `GET /api/v1/subscriptions/me` | 200 |
| 21 Pelanggan melihat paket dan sisa kuota | `GET /api/v1/api-key/me` | 200 |
| 22 Key sama mengakses analitik Premium | `GET /api/v1/partner/analitik` | 200 |
| 23 Checkout kedua untuk perpanjangan | `POST /api/v1/subscriptions/checkout` | 201 |
| 24 Admin konfirmasi perpanjangan | `PATCH /api/v1/payments/{{renew_id}}/confirm` | 200 |
| 25 Lihat subscription setelah perpanjangan | `GET /api/v1/subscriptions/me` | 200 |
| 26 Riwayat invoice pelanggan | `GET /api/v1/payments` | 200 |
| 27 Buat invoice untuk dibatalkan | `POST /api/v1/subscriptions/checkout` | 201 |
| 28 Pelanggan membatalkan invoice pending | `PATCH /api/v1/payments/{{cancel_id}}/cancel` | 200 |
| 29 Admin tidak dapat mengaktifkan invoice cancelled | `PATCH /api/v1/payments/{{cancel_id}}/confirm` | 409 |
| 30 Register pelanggan lain | `POST /api/v1/auth/register` | 201 |
| 31 Login pelanggan lain | `POST /api/v1/auth/login` | 200 |
| 32 Invoice orang lain tidak dapat dibaca | `GET /api/v1/payments/{{payment_id}}` | 404 |
| 33 Invoice orang lain tidak dapat dibatalkan | `PATCH /api/v1/payments/{{payment_id}}/cancel` | 404 |
| 34 Pelanggan tidak dapat mengubah tier langsung | `PATCH /api/v1/api-key/level/{{user_id}}` | 403 |
| 35 Jalur lama upgrade langsung dinonaktifkan | `PATCH /api/v1/api-key/level/{{user_id}}` | 410 |
| 36 Data buku tanpa JWT ditolak | `GET /api/v1/buku` | 401 |
| 37 Data buku dengan JWT pelanggan ditolak | `GET /api/v1/buku` | 403 |
| 38 Admin dapat mengelola sumber data buku | `GET /api/v1/buku` | 200 |
| 39 Regenerate API key pelanggan | `POST /api/v1/api-key/regenerate` | 200 |
| 40 Key lama ditolak | `GET /api/v1/partner/ringkasan` | 401 |
| 41 Key baru tetap Premium | `GET /api/v1/partner/analitik` | 200 |
| 42 Checkout tanpa key idempotensi ditolak | `POST /api/v1/subscriptions/checkout` | 400 |
| 43 Basic gratis tidak memerlukan checkout | `POST /api/v1/subscriptions/checkout` | 400 |
| 44 Paket tidak dikenal ditolak | `POST /api/v1/subscriptions/checkout` | 400 |
| 45 Invoice tidak ditemukan | `GET /api/v1/payments/2147483647` | 404 |
| 46 Invoice paid tidak dapat dibatalkan | `PATCH /api/v1/payments/{{payment_id}}/cancel` | 409 |
