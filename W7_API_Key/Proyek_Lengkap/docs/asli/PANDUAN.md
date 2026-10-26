# PANDUAN PRAKTIKUM MINGGU 7

## Auth & Middleware dengan JWT

Mata Kuliah Arsitektur Berbasis Layanan (SOA) · S1 Sistem Informasi Bisnis, ISTTS

---

Lima minggu pertama, seluruh API terbuka untuk dunia. Minggu ini pintunya
kita pasang — dan hampir semua yang salah di mata kuliah ini salah di
sini secara HALUS: login yang jalan belum tentu login yang aman. Endpoint
buku **tetap terbuka by design** (koleksi lama tetap hijau; melindunginya
adalah latihan), sementara dua route contoh terproteksi memperlihatkan
semuanya.

## Daftar Isi

1. [Menjalankan project](#1-menjalankan-project)
2. [Hash bukan enkripsi: bcrypt](#2-hash-bukan-enkripsi-bcrypt)
3. [JWT: ditandatangani, bukan disandikan](#3-jwt-ditandatangani-bukan-disandikan)
4. [Dua token, dua masa hidup](#4-dua-token-dua-masa-hidup)
5. [Middleware: verifyJWT](#5-middleware-verifyjwt)
6. [Middleware: checkRoles](#6-middleware-checkroles)
7. [401 dan 403: dua pertanyaan berbeda](#7-401-dan-403-dua-pertanyaan-berbeda)
8. [Satu pesan untuk dua kegagalan](#8-satu-pesan-untuk-dua-kegagalan)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Menjalankan project

Prasyarat: Node 24, MySQL menyala.

```bash
npm install
cp .env.example .env   # WAJIB ISI KEDUA SECRET di bawah
npm run db:migrate     # buat database soa_minggu7 + tabel pengguna + admin
npm run dev            # http://localhost:3001
```

Generate secret (dua-duanya HARUS berbeda, minimal 64 karakter, jangan pernah masuk git):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# jalankan dua kali, taruh di .env sebagai
# ACCESS_TOKEN_SECRET=... dan REFRESH_TOKEN_SECRET=...
```

Server menolak start kalau secret hilang, masih placeholder, kurang dari
64 karakter, atau keduanya sama. Ini fail-closed: jangan biarkan JWT
menggunakan secret contoh yang diketahui semua orang. Akun admin dari seed:

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin123!` | `admin` |

Register sendiri selalu menghasilkan role `visitor` — karena ATURAN
BISNIS: tidak boleh ada jalur API yang menciptakan admin (lihat bagian 8
dan catatan di model Pengguna).

## Menguji

Impor `postman/SOA-Minggu7.postman_collection.json` +
`postman/local.postman_environment.json`, pilih environment `local`, jalankan
Runner. Folder baru **6 - Auth & Middleware (Minggu 7)** — request auth
mencakup register, login, 401/403, role, refresh, dan logout.

```bash
npx newman run postman/SOA-Minggu7.postman_collection.json \
  -e postman/local.postman_environment.json
```

Endpoint baru:

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/v1/auth/register` | buat akun (password di-hash) |
| POST | `/api/v1/auth/login` | verifikasi, terbitkan 2 token |
| POST | `/api/v1/auth/refresh` | accessToken baru dari cookie |
| POST | `/api/v1/auth/logout` | hapus cookie refresh |
| GET | `/api/v1/auth/rahasia` | demo route admin-only |
| GET | `/api/v1/pengguna/profil` | demo route terproteksi (`verifyJWT`) |

## 2. Hash bukan enkripsi: bcrypt

Enkripsi BISA dibalik dengan kunci. Hash TIDAK bisa dibalik sama sekali —
kalian hanya bisa meng-hash tebakan dan membandingkannya. Itulah kenapa
hash yang tepat untuk password: bahkan dengan akses penuh ke database,
penyerang tidak membaca password — hanya hash yang tidak bermakna.

```js
const hashedPassword = await bcrypt.hash(value.pengguna_password, 10);
// register
const passwordCocok = await bcrypt.compare(tebakan, hash);
// login
```

Dua hal yang ditunjukkan di kelas:

- **Cost 10** = ~100ms per hash. LAMBAT disengaja — brute-force juga
  menjadi lambat. Naikkan ke 12 dan rasakan bedanya.
- **SALT otomatis**: register DUA user dengan password yang sama, lalu
  bandingkan barisnya di MySQL — hash-nya BERBEDA. Tidak perlu kolom salt
  terpisah; salt tersimpan di dalam string hash.

> Kenapa `bcryptjs` (bukan `bcrypt`)? API identik, tapi bcryptjs murni
> JavaScript — tidak butuh compiler native yang kadang gagal di Windows.
> Kalau kalian perlu bcrypt asli, ganti import saja.

## 3. JWT: ditandatangani, bukan disandikan

Salah kaprah paling penting untuk dibunuh minggu ini:

```text
base64url(header).base64url(payload).base64url(signature)
```

### Contoh isi access token project

Ini contoh **decoded payload** memakai data fiktif. Bukan token aktif dan
tidak punya signature yang dapat diverifikasi:

```json
{
  "pengguna": {
    "id": 1,
    "pengguna_nama": "admin",
    "roles": "admin"
  },
  "iat": 1792450000,
  "exp": 1792450030
}
```

Arti setiap bagian:

| Claim | Arti | Sumber di project |
|---|---|---|
| `pengguna.id` | ID akun | `Pengguna.id` |
| `pengguna.pengguna_nama` | Nama akun | `Pengguna.pengguna_nama` |
| `pengguna.roles` | Hak akses yang dibawa token | `Pengguna.roles`; dibaca `checkRoles` |
| `iat` | Waktu token diterbitkan (Unix seconds) | Dibuat otomatis oleh `jsonwebtoken` |
| `exp` | Waktu token kedaluwarsa (Unix seconds) | `expiresIn: "30s"` pada access token |

Header token project berisi algoritma dan tipe:

```json
{ "alg": "HS256", "typ": "JWT" }
```

Secara ringkas, token compact-nya berbentuk:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload-base64url>.<signature-base64url>
```

Letak setiap bagian pada HTTP request jelasnya begini:

```text
HTTP request header:
Authorization: Bearer <JWT>
                └─────┘└───────────────────────────────────────────────────────────┘
                 scheme   token UTUH: SEG1.SEG2.SEG3
                          ├───┘      ├───┘   ├───┘
                          header     payload  signature
```

Jangan tertukar: **HTTP header** bernama `Authorization`; **JWT header**
adalah segmen pertama token, berisi `alg` dan `typ`. Kata `Bearer` bukan
bagian token. Token adalah seluruh string setelahnya, termasuk dua titik.
Signature adalah segmen ketiga di dalam token — bukan HTTP header terpisah.

`<payload-base64url>` dan `<signature-base64url>` di contoh atas adalah
placeholder, bukan token yang bisa dipakai. Login mengembalikan access token
sebagai JSON. Client mengirimkannya pada request berikutnya:

```http
Authorization: Bearer <accessToken>
```

Salin token hasil login dan decode bagian tengah (`payload`) di jwt.io atau
secara lokal:

```bash
node -e "console.log(JSON.parse(Buffer.from(process.argv[1].split('.')[1], 'base64url').toString()))" '<accessToken>'
```

SELURUH payload terbaca tanpa secret. Yang dilindungi token ini adalah
**keutuhan**, bukan **rahasia**: ubah satu karakter → verifikasi gagal,
tetapi membacanya tidak butuh kunci apa pun. Signature HS256 dibuat dari
header + payload memakai `ACCESS_TOKEN_SECRET`; server memverifikasinya
sebelum mempercayai identitas dan role.

Access dan refresh token membawa identitas minimal yang serupa, tetapi
ditandatangani dengan **secret berbeda** dan punya expiry berbeda. Jangan
pernah menaruh password, hash, API key, nomor kartu, atau data pribadi di
payload JWT. Gunakan HTTPS saat token dikirim melalui jaringan.

Konsekuensinya — dua aturan:

1. Jangan pernah meletakkan password, hash, nomor kartu, atau data
   pribadi di payload JWT. Yang diteruskan starter ini: `id`,
   `pengguna_nama`, `roles` — cukup untuk mengenali dan mengotorisasi.
2. "Signed" artinya **server yang bisa memverifikasi bahwa token ini
   yang dia terbitkan** — identitas bisa dipercaya tanpa sesi/tabel.

## 4. Dua token, dua masa hidup

| | accessToken | refreshToken |
|---|---|---|
| Masa hidup | 30 detik (pengajaran; produksi 5–15 menit) | 1 hari |
| Dikirim sebagai | header `Authorization: Bearer` | httpOnly cookie |
| Kalau bocor | bocornya sebentar | bocornya lama → karena itu httpOnly |
| Fungsi | per-request | memperpanjang tanpa login ulang |

`httpOnly` artinya JavaScript di halaman TIDAK bisa membaca cookie —
bug XSS di frontend tidak bisa mencuri refresh token. Access token
pendek hidup di memori; yang panjang umur yang dilindungi rapat.

Perhatikan dua SECRET berbeda — kalau satu secret dipakai dua-duanya,
refresh token bisa di-replay sebagai access token.

## 5. Middleware: verifyJWT

Autentikasi — "kamu SIAPA?":

```js
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json(...);
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json(...);
    req.pengguna = decoded.pengguna;   // identitas menempel ke request
    next();
  });
};
```

Dua aturan hidup-mati middleware (kalian sudah melihat pola ini sejak
`methodNotAllowed`):

- **Setiap jalur gagal butuh `return`** sebelum `res` — tanpa itu response
  terkirim dua kali: `Cannot set headers after they are sent`.
- **Jalur sukses wajib berakhir `next()`** — tanpa itu request menggantung
  selamanya: client menunggu, server menganggap belum selesai.

Pemakaian di route — controller TIDAK disentuh sama sekali:

```js
router.route("/profil").get(verifyJWT, profil);
```

## 6. Middleware: checkRoles

Otorisasi — "kamu BOLEH?":

```js
router.delete("/:id", verifyJWT, checkRoles("admin"), deleteHandler);
```

Perhatikan perbedaan pemanggilannya: `verifyJWT` diletakkan, sedangkan
`checkRoles("admin")` DIPANGGIL — karena checkRoles adalah **factory**
yang mengembalikan middleware. Satu fungsi, dikonfigurasi per route.

Dan urutannya TIDAK BOLEH terbalik: `checkRoles` membaca
`req.pengguna.roles` yang diisi `verifyJWT`. Middleware ini harus dipasang setelah `verifyJWT`, karena ia membaca
`req.pengguna.roles` yang diisi sebelumnya. Urutan salah memunculkan
`Cannot read property 'roles' of undefined` — error klasik, dibuktikan
karena `checkRoles` membaca `req.pengguna.roles` yang disiapkan middleware sebelumnya.

## 7. 401 dan 403: dua pertanyaan berbeda

| Kode | Pertanyaan | Kapan |
|---|---|---|
| `401` | Siapa kamu? | Tanpa token sama sekali |
| `403` | Kredensial kamu tidak sah — atau tidak berhak | Token rusak / kedaluwarsa; ATAU role kurang |

Dua-duanya "ditolak" — tapi maknanya berbeda bagi consumer:

- 401 = "coba autentikasi ulang" (ada harapan)
- 403 = "jangan coba lagi di sini" (tidak ada harapan)

Starter menjaga perbedaan ini konsisten: tanpa token → 401
(`POST /profil tanpa token`), payload rusak → 403, role kurang → 403.
Jika role kurang dikirim sebagai 401, client akan login ulang —
percuma.

## 8. Satu pesan untuk dua kegagalan

Login yang gagal punya DUA kemungkinan: username tidak ada, atau password
salah. Respon untuk keduanya HARUS identik:

```json
401 { "msg": "Gagal login" }
```

Kenapa? Kalau "password salah" dan "user tidak ada" berbeda, seorang
penyerang punya PETA: mereka bisa mendaftar akun-akun yang ADA di sistem
(pesan "password salah" berarti user-nya ada) sebelum mulai menebak
password. Satu kalimat menghemat satu celah.

Timing juga bisa membocorkan perbedaan itu. Karena itu login tetap menjalankan
`bcrypt.compare()` dengan hash dummy ketika username tidak ditemukan. Pesan
dan pekerjaan utama sama; ini mengurangi sinyal timing sederhana.

Hal yang sama berlaku di sisi register: payload yang menyertakan
`roles: "admin"` diabaikan total — register selalu `visitor`. Periksa
sendiri: login admin lalu coba register dengan roles — kolom `roles`
tidak pernah muncul dari body.

## 9. Melanjutkan project semester

Materi minggu ini dipakai untuk menambahkan autentikasi ke project rental
yang sudah berjalan — tidak membuat project atau tugas terpisah. Integrasikan
`register`/`login`, lalu pasang `verifyJWT` dan `checkRoles` pada route
project yang sesuai. Pilih role berdasarkan aturan bisnis yang sudah ada.
Endpoint dan collection project tetap menjadi sumber utama; jangan menyalin
data atau membuat project baru.

## 10. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Server langsung berhenti dengan `[AUTH] Konfigurasi JWT tidak aman` | secret kosong, placeholder, kurang 64 karakter, atau sama | generate dua secret berbeda dan isi `.env` |
| `bcrypt` gagal install | butuh kompiler native | starter memakai `bcryptjs`, tidak perlu compiler |
| `jwt malformed` | token dikirim tanpa prefix `Bearer ` | format header: `Bearer <token>` |
| `invalid signature` | secret sign/verify berbeda atau `.env` tidak terbaca | restart server setelah isi `.env`; pastikan secret sama di kedua jalur token yang sesuai |
| `req.cookies` undefined | `cookie-parser` belum dipasang sebelum router | cek `app.use(cookieParser())` di `index.js` |
| Profil 401 dengan token | header salah format atau token sudah kedaluwarsa | `Authorization: Bearer <accessToken>`; login/refresh lagi |
| Role cukup tapi route 403 | urutan middleware terbalik atau token membawa role lama | `verifyJWT` dulu; login ulang setelah role berubah |
| Refresh token tidak terkirim | cookie jar tidak menyimpan cookie | periksa tab Cookies Postman dan jalankan Login sebelum Refresh |
| Token kedaluwarsa saat menguji | access token memang 30 detik | login lagi atau gunakan refresh flow |

---
