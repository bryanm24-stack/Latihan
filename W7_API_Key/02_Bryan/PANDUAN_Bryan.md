# Bryan — Tahap 2: Paket dan pengelolaan API key

**Prasyarat:** tabel/model Kenneth sudah siap. **Target:** pemilik akun mengelola key menggunakan JWT, sedangkan admin menentukan paket.

## File yang menjadi tanggung jawab

| File | Status terhadap W7 |
|---|---|
| `src/config/apiPlans.js` | Baru |
| `src/utils/apiKey.js` | Baru |
| `src/controllers/apiKey.js` | Baru |
| `src/controllers/auth.js` | Diubah |
| `src/routes/apiKey.js` | Baru |

## Model bisnis yang diterapkan

BookData API menyediakan ringkasan inventaris dan analisis stok buku melalui API. Pelanggan yang membutuhkan analitik serta kuota lebih besar menggunakan Premium. Harga di bawah merupakan asumsi tugas praktikum, bukan harga dari dosen atau hasil riset pasar.


| Paket | Harga simulasi | Kuota harian | Batas per menit | Fitur |
|---|---:|---:|---:|---|
| Basic | Rp0 | 100 | 10 | Ringkasan buku |
| Premium | Rp99.000/bulan | 10.000 | 100 | Ringkasan dan analitik |

Batas menggunakan **jendela menit kalender dan hari kalender UTC**. Hari UTC dimulai pukul 07.00 WIB. Kuota melekat pada pengguna, sehingga regenerate key tidak mereset pemakaian. Respons 401/403/429 sebelum reservasi tidak dihitung. Request yang sudah memperoleh slot tetap dihitung, termasuk jika controller kemudian gagal atau koneksi client terputus. Endpoint JWT pengelolaan key tidak memakai kuota partner.


Pendapatan direncanakan dari langganan Premium. Contoh perhitungan: 10 pelanggan × Rp99.000 = Rp990.000 pendapatan kotor per bulan, sebelum biaya hosting, database, dukungan dan pajak. Angka ini skenario, bukan pendapatan aktual. Pengembangan saat ini memakai aktivasi paket manual oleh admin, belum memproses pembayaran, invoice, perpanjangan atau kedaluwarsa otomatis.

## Langkah 1 — Aturan paket

`src/config/apiPlans.js` menjadi sumber tunggal harga, limit dan fitur. Controller `me`, middleware pembatasan, dan pemeriksaan fitur membaca konfigurasi yang sama. Jangan menyalin angka kuota ke banyak controller.

## Langkah 2 — Key acak dan hashing

Kode berikut benar-benar digunakan oleh controller generate/regenerate:

```js
const crypto = require("node:crypto");
// Key baru memiliki 256 bit acak. Database hanya menyimpan SHA-256.
const createApiKey = () =>
  `bd_live_${crypto.randomBytes(32).toString("hex")}`;
const hashApiKey = (rawKey) =>
  crypto.createHash("sha256").update(rawKey).digest("hex");
```

Key baru terdiri dari prefix `bd_live_` dan 32 byte acak (256 bit). Hash SHA-256 menghasilkan 64 karakter hex, sehingga cocok dengan kolom W7. Password tetap memakai bcrypt. Hash SHA-256 dipakai untuk credential acak yang berentropi tinggi ini, bukan mengganti bcrypt untuk password manusia.

## Langkah 3 — Controller penerbitan

`controllers/apiKey.js` mengunci baris pengguna dalam transaksi sebelum memeriksa key yang sudah ada. Ini membuat dua generate bersamaan menghasilkan satu 201 dan satu 409, bukan menerbitkan dua raw key yang saling menimpa. Controller menyimpan `hashApiKey(rawKey)` dan mengirim raw key hanya pada respons penerbitan dengan `Cache-Control: no-store`.

- Generate pertama: HTTP 201.
- Generate ketika key sudah ada: HTTP 409, gunakan regenerate.
- Regenerate: HTTP 200, mengganti hash yang tersimpan sehingga key lama ditolak pada request selanjutnya. Request yang telah lolos reservasi sebelum rotasi dapat menyelesaikan pekerjaannya.
- `me`: mengembalikan `has_api_key`, paket, pemakaian dan waktu reset. Raw key dan hash tidak dikirim.

`controllers/auth.js` berhenti menyimpan UUID saat register dan secara eksplisit menetapkan `api_key: null`, `api_level: "basic"`. Registrasi tetap visitor sesuai W7.

## Langkah 4 — Router JWT dan role admin

```js
router.use(verifyJWT);
router.post("/generate", asyncHandler(c.generate));
router.post("/regenerate", asyncHandler(c.regenerate));
router.get("/me", asyncHandler(c.me));
router.patch("/level/:id", checkRoles("admin"), asyncHandler(c.setLevel));
module.exports = router;
```

Pengguna tidak bisa memilih target ID pada generate/regenerate karena controller membaca `req.pengguna.id` dari JWT terverifikasi. Perubahan paket memakai ID target dan hanya diperbolehkan untuk JWT admin. Body yang benar:

```json
{"api_level":"premium"}
```

Paket lain, ID bukan angka positif, atau field tambahan ditolak 400. Target tidak ada ditolak 404. Route dipasang oleh Rafael di `/api/v1/api-key`.

## Langkah 5 — Pengujian

1. Register pelanggan, login, lalu kirim JWT ke generate.
2. Periksa raw key pada respons 201 dan `LENGTH(api_key)=64` di database.
3. Ulangi generate, harapkan 409.
4. Gunakan JWT visitor untuk PATCH level sendiri, harapkan 403.
5. Login admin dan PATCH level pelanggan menjadi Premium.
6. Regenerate, uji key lama 401 dan key baru 200.
7. Periksa `me`: pemakaian tetap ada setelah regenerate.

JWT W7 memiliki umur 30 detik. Login ulang bila menjalankan demo manual dengan jeda panjang. Jangan menaruh key/token aktual di slide atau git. Dana memakai util hash dan konfigurasi paket ini dalam middleware.


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
