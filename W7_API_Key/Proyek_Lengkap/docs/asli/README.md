> Arsip starter W7 sebelum subscription 2.0. Panduan versi aktif: [README proyek](../../README.md).

# SOA Minggu 7 — Auth & Middleware dengan JWT

Starter praktikum Mata Kuliah Arsitektur Berbasis Layanan (SOA)
S1 Sistem Informasi Bisnis — ISTTS

Minggu ini melanjutkan project semester dengan registrasi, login, access
token JWT, refresh token di cookie `httpOnly`, dan middleware
autentikasi/otorisasi. Tidak ada tugas atau project terpisah. Materi ada di
**[PANDUAN.md](PANDUAN.md)**.

## Menjalankan

```bash
npm install
cp .env.example .env
```

Isi `.env` dengan kredensial MySQL dan **dua secret acak yang berbeda**:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# jalankan dua kali; satu untuk ACCESS_TOKEN_SECRET, satu untuk REFRESH_TOKEN_SECRET
```

```bash
npm run db:migrate
npm run dev
```

Server menolak start bila secret kosong, placeholder, sama, atau kurang
dari 64 karakter. Jangan pernah commit `.env`.

Seed admin untuk pengujian lokal: **`admin` / `Admin123!`**. Ganti atau
hapus kredensial demo sebelum deployment.

## Menguji

Impor `postman/SOA-Minggu7.postman_collection.json` dan
`postman/local.postman_environment.json` ke Postman, pilih environment
`local`, lalu jalankan Runner. Koleksi berisi **51 request dan 87 assertion**;
auth folder mencakup 13 kasus. Access token berlaku **30 detik** (sengaja
singkat untuk demonstrasi); jalankan Login lalu Refresh bila token kedaluwarsa.

```bash
npx newman run postman/SOA-Minggu7.postman_collection.json \
  -e postman/local.postman_environment.json
```

## Endpoint baru

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/v1/auth/register` | registrasi; password di-hash, role selalu `visitor` |
| POST | `/api/v1/auth/login` | verifikasi kredensial; access token + refresh cookie |
| POST | `/api/v1/auth/refresh` | access token baru dari refresh cookie |
| POST | `/api/v1/auth/logout` | hapus refresh cookie di client |
| GET | `/api/v1/auth/rahasia` | contoh route admin-only |
| GET | `/api/v1/pengguna/profil` | contoh route dengan `verifyJWT` |

Endpoint minggu sebelumnya tetap sama dan tetap tanpa autentikasi, supaya
koleksi Postman lama tidak berubah. Middleware minggu ini dipakai untuk
melindungi endpoint project yang sudah ada sesuai aturan bisnisnya.

## Catatan keamanan

- JWT ditandatangani, bukan dienkripsi: jangan masukkan rahasia ke payload.
- Logout menghapus cookie client; refresh token yang sudah dicuri masih
  berlaku sampai kedaluwarsa. Pencabutan token di database jadi latihan.
- Akun admin seed hanya untuk development lokal.
