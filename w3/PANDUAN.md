# PANDUAN PRAKTIKUM MINGGU 3

## REST Service dengan MySQL

Mata Kuliah Arsitektur Berbasis Layanan (SOA) · S1 Sistem Informasi Bisnis, ISTTS

---

## Daftar Isi

1. [Menjalankan project](#1-menjalankan-project)
2. [Peta folder: kenapa dipisah begini](#2-peta-folder-kenapa-dipisah-begini)
3. [Tiga tempat data masuk](#3-tiga-tempat-data-masuk)
4. [Satu URL, banyak method](#4-satu-url-banyak-method)
5. [Method spoofing — meluruskan istilah](#5-method-spoofing--meluruskan-istilah)
6. [Urutan route menentukan segalanya](#6-urutan-route-menentukan-segalanya)
7. [Status code: memilih dengan sengaja](#7-status-code-memilih-dengan-sengaja)
8. [Validasi manual](#8-validasi-manual)
9. [Mass assignment: bahaya yang jarang diajarkan](#9-mass-assignment-bahaya-yang-jarang-diajarkan)
10. [Dari array ke MySQL: apa yang berubah, apa yang tidak](#10-dari-array-ke-mysql-apa-yang-berubah-apa-yang-tidak)
11. [Connection pool](#11-connection-pool)
12. [Repository pattern](#12-repository-pattern)
13. [Prepared statement dan SQL Injection](#13-prepared-statement-dan-sql-injection)
14. [Normalisasi: kenapa karakter jadi tabel sendiri](#14-normalisasi-kenapa-karakter-jadi-tabel-sendiri)
15. [Dua lapis validasi](#15-dua-lapis-validasi)
16. [async/await dan asyncHandler](#16-asyncawait-dan-asynchandler)
17. [Troubleshooting MySQL](#17-troubleshooting-mysql)
18. [Sepuluh best practice](#18-sepuluh-best-practice)
19. [Latihan](#19-latihan)
20. [Tugas Praktikum Minggu 3 — yang dikumpulkan](#20-tugas-praktikum-minggu-3--yang-dikumpulkan)

---

## 1. Menjalankan project

Kalau MySQL sudah pernah kalian siapkan untuk project ini, ringkasnya:

```bash
npm install
cp .env.example .env        # sesuaikan kredensial MySQL
npm run db:migrate          # buat database, tabel, isi data awal
npm run dev                 # nodemon, restart otomatis saat file disimpan
```

Buka `http://localhost:3001`. Kalau muncul JSON daftar endpoint, server jalan.
Kalau log juga menunjukkan `[DB] Terhubung ke MySQL "soa_minggu3"`, koneksi ke
database juga beres. Lanjut ke bagian **Menguji**, di bawah langkah-langkah ini.

Kalau ini pertama kalinya kalian menyiapkan MySQL untuk project ini, ikuti
empat langkah berikut satu per satu.

### Langkah 1 — Install MySQL

Pilih salah satu. Kalau sudah punya MySQL menyala di komputer kalian, lewati
langkah ini.

**macOS (Homebrew):**

```bash
brew install mysql
brew services start mysql
```

**Windows:** install lewat [MySQL Installer](https://dev.mysql.com/downloads/installer/)
(pilih "MySQL Server"), atau lewat XAMPP/Laragon kalau sudah terbiasa
memakainya untuk mata kuliah lain.

**Alternatif tanpa install lokal — Docker:**

```bash
docker run --name soa-mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8
```

Kalau pakai ini, isi `DB_PASSWORD=root` di `.env` pada langkah berikutnya.

Verifikasi MySQL sudah menyala sebelum lanjut:

```bash
mysqladmin ping -h 127.0.0.1 -u root -p
# atau kalau pakai Docker:
docker exec soa-mysql mysqladmin ping -uroot -proot
```

Kalau responnya `mysqld is alive`, lanjut ke langkah 2.

### Langkah 2 — Siapkan `.env`

```bash
cp .env.example .env
```

Buka `.env`, sesuaikan lima baris terakhir dengan instalasi kalian:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=       # isi kalau MySQL kalian pakai password
DB_NAME=soa_minggu3
```

`DB_NAME` **tidak perlu dibuat manual** — langkah berikutnya membuatnya
otomatis kalau belum ada.

> **Kenapa kredensial database masuk `.env` dan bukan ditulis langsung di
> `src/config/database.js`?**
> Karena `.env` tidak ikut ke git (lihat `.gitignore`), sementara kode ikut ke
> git. Kalau password MySQL kalian ditulis langsung di kode lalu di-commit,
> siapa pun yang punya akses ke repository — termasuk kalau repo-nya publik —
> punya akses ke database kalian. Aturan ini berlaku untuk SEMUA kredensial
> selamanya, bukan cuma untuk mata kuliah ini.

### Langkah 3 — `npm run db:migrate`

```bash
npm install
npm run db:migrate
```

Perintah ini menjalankan `scripts/migrate.js`, yang melakukan tiga hal
berurutan (baca komentar di file itu untuk detail tiap langkah):

1. `CREATE DATABASE IF NOT EXISTS soa_minggu3`
2. Menjalankan `sql/schema.sql` — membuat tabel `buku`, `karakter`, `penulis`
3. Menjalankan `sql/seed.sql` — mengisi data awal

Output yang diharapkan:

```
[migrate] Memastikan database "soa_minggu3" ada...
[migrate] Menjalankan sql/schema.sql...
[migrate] Menjalankan sql/seed.sql...
[migrate] Selesai. Database siap dipakai.
```

Perintah ini **aman dijalankan berulang kali**. `seed.sql` mengosongkan tabel
lebih dulu (`TRUNCATE`) sebelum mengisi ulang — jadi kalau data latihan
kalian berantakan karena bereksperimen dengan POST/PUT/DELETE, jalankan lagi
`npm run db:migrate` untuk kembali ke kondisi awal.

Mau lihat isi tabelnya langsung? Buka dengan MySQL Workbench, TablePlus,
DBeaver, atau CLI:

```bash
mysql -u root -p soa_minggu3 -e "SELECT * FROM buku;"
```

### Langkah 4 — Jalankan server

```bash
npm run dev
```

Cek log saat server menyala. Kalau koneksi berhasil:

```
Example app listening on port 3001!
[DB] Terhubung ke MySQL "soa_minggu3"
```

Kalau gagal, server **tetap menyala** (endpoint `/api/v1/contoh` tidak butuh
database), tapi kalian akan lihat pesan error yang jelas — lanjut ke
[§17 Troubleshooting MySQL](#17-troubleshooting-mysql) kalau butuh.

### Menguji

Impor `postman/SOA-Minggu2.postman_collection.json` dan
`postman/local.postman_environment.json` ke Postman (tab **Documentation** di
tiap folder dan request sudah menjelaskan query/param/body-nya masing-masing —
lihat juga §19), pilih environment `local`, lalu jalankan Runner.

**28 request, 49 assertion, semuanya harus hijau.** Kalau ada yang merah
sebelum kalian mengubah apa pun, ada yang salah dengan instalasi — bukan
dengan kode.

Lewat terminal:

```bash
npx newman run postman/SOA-Minggu2.postman_collection.json \
  -e postman/local.postman_environment.json
```

```
soa-minggu3/
├── index.js                    ← pasang middleware, pasang router, nyalakan server
├── src/
│   ├── config/database.js      ← pool koneksi MySQL (lihat §11)
│   ├── data/buku.js            ← bicara ke MySQL — repository pattern (lihat §12)
│   ├── routes/                 ← URL mana memanggil fungsi mana
│   ├── controllers/            ← apa yang terjadi
│   ├── middlewares/            ← yang berjalan sebelum/sesudah controller
│   └── utils/validate.js       ← validasi manual (Minggu 5 diganti Joi)
├── sql/                        ← schema.sql + seed.sql
├── scripts/migrate.js          ← menjalankan kedua file .sql di atas
└── postman/                    ← koleksi + environment, ikut di-commit
```

---

## 2. Peta folder: kenapa dipisah begini

Semua kode di project ini muat dalam satu file `index.js`. Jadi kenapa
dipecah?

Pertanyaan yang lebih tepat: **apa yang bisa saya ketahui tanpa membaca
seluruh kode?**

| File                   | Menjawab              | Kalau butuh tahu ini, buka file ini        |
| ----------------------- | --------------------- | ------------------------------------------ |
| `routes/buku.js`       | URL apa saja yang ada | Seluruh permukaan API buku, dalam 30 baris |
| `controllers/buku.js`  | Apa yang terjadi      | Logika, tanpa terganggu urusan URL         |
| `data/buku.js`         | Datanya bagaimana     | Cara bicara ke MySQL, satu tempat          |
| `utils/validate.js`    | Aturan inputnya apa   | Bisa dipakai ulang oleh resource lain      |

Buka `src/routes/buku.js` sekarang. Dalam 20 detik kalian tahu ada berapa
endpoint, apa saja methodnya, dan apa nama fungsinya — tanpa membaca satu
baris pun logika.

Itulah nilainya. Bukan "supaya rapi", tapi supaya **bisa dibaca sebagian**.

Ada bonus yang baru terasa nanti: di Minggu 7 kalian menambahkan autentikasi.
Perubahannya cuma satu baris di file routes:

```js
router.route("/:bukuId").delete(verifyJWT, checkRoles("admin"), deleteBuku);
```

Controller `deleteBuku` tidak disentuh sama sekali. Itu hanya mungkin kalau
keduanya terpisah sejak awal.

Minggu ini folder ini dapat satu anggota baru: `src/data/buku.js` sekarang
bicara ke MySQL lewat SQL manual (`pool.query(...)`), bukan lagi array. Dia
masih BELUM "model" dalam arti Sequelize: tidak ada schema class, tidak ada
relasi otomatis, tidak ada migration tool. Itu semua datang Minggu 4. Minggu
3 sengaja berhenti di SQL manual dulu — supaya kalian merasakan apa yang
sebenarnya dikerjakan Sequelize nanti, sebelum memakainya sebagai mantra.

---

## 3. Tiga tempat data masuk

Ini konsep paling penting sejak Minggu 2, dan tidak berubah sama sekali
minggu ini. Jalankan endpoint `/api/v1/contoh` sambil membaca bagian ini.

| Sumber       | Bentuknya                    | Untuk apa                  | Sifat                              |
| ------------ | ----------------------------- | --------------------------- | ------------------------------------ |
| `req.query`  | `/buku?keyword=jojo&limit=5`  | Filter, cari, paging, sort  | Opsional, bebas dikombinasi          |
| `req.params` | `/buku/3/karakter/2`          | **Menunjuk** resource mana  | Wajib, bagian dari identitas         |
| `req.body`   | Isi kiriman, tidak di URL     | Data yang dibuat/diubah     | Bisa besar, tidak terlihat di log    |

Cara memilih:

- Kalau menghilangkannya membuat URL menunjuk **resource yang berbeda** → itu `params`
- Kalau menghilangkannya hanya mengubah **cara menampilkan** → itu `query`
- Kalau isinya **data baru** → itu `body`

Contoh: `/buku/3` tanpa `3` jadi `/buku` — resource berbeda (satu buku vs
daftar). Jadi `params`.
`/buku?limit=5` tanpa `limit` tetap `/buku` — resource sama, tampilan beda.
Jadi `query`.

### Jebakan: semua dari HTTP itu string

```js
req.query.umur; // "40"  — string, SELALU
typeof req.query.umur; // "string"
```

Ada tiga cara ini menggigit. Panggil `GET /api/v1/contoh?umur=40&min=100&max=45`
dan lihat responsnya:

```js
// (a) + menyambung teks, bukan menjumlah
"40" + 1; // "401"     ← bukan 41
Number("40") + 1; // 41

// (b) membandingkan DUA nilai dari HTTP → dua-duanya string → alfabetis
"100" < "45"; // true      ← "1" lebih kecil dari "4"
Number("100") < Number("45"); // false

// (c) === tidak mengonversi apa pun
"40" === 40; // false, selalu
b.id === req.params.bukuId; // selalu false
b.id === Number(req.params.bukuId); // benar
```

Catatan jujur: `"100" < 45` **aman** — kalau salah satu sisi angka,
JavaScript mengonversi string ke number lebih dulu. Yang berbahaya justru
saat **kedua** sisi string, yaitu (b). Banyak materi salah menjelaskan ini.

Poin (c) adalah bug paling sering sejak Minggu 2, dan masih relevan di MySQL.
Coba sendiri: buka `src/controllers/buku.js`, cari fungsi `getKarakter`, dan
hapus `Number()` pada baris `c.id === Number(karakterId)`. Panggil
`GET /api/v1/buku/1/karakter/2` — kalian dapat 404 "karakter tidak ada",
padahal karakternya jelas ada. Kenapa bug ini masih muncul walau datanya
sekarang dari MySQL? Karena baris itu membandingkan `id` (angka, hasil query)
dengan `karakterId` (string, dari `req.params`) di dalam JavaScript, BUKAN di
dalam SQL. MySQL memang mengonversi otomatis di klausa `WHERE id = ?`
(`?` = `"1"`), tapi `===` di JavaScript tidak pernah melakukan itu. Kembalikan
`Number()`-nya sebelum lanjut.

---

## 4. Satu URL, banyak method

Inti REST cuma satu kalimat:

> **URL menunjuk BENDA. Method menunjuk PERBUATAN terhadap benda itu.**

```
GET    /api/v1/buku      →  tunjukkan daftarnya
POST   /api/v1/buku      →  tambahkan satu ke daftar

GET    /api/v1/buku/1    →  tunjukkan buku nomor 1
PUT    /api/v1/buku/1    →  ganti buku nomor 1 seluruhnya
PATCH  /api/v1/buku/1    →  ubah sebagian buku nomor 1
DELETE /api/v1/buku/1    →  hapus buku nomor 1
```

Empat fungsi berbeda, satu alamat. Di Express:

```js
router
  .route("/:bukuId")
  .get(getSingleBuku)
  .put(updateBuku)
  .patch(patchBuku)
  .delete(deleteBuku)
  .all(methodNotAllowed("GET", "PUT", "PATCH", "DELETE"));
```

Namanya **routing berdasarkan method** (_method-based routing_). Ini
perilaku bawaan HTTP, bukan fitur Express.

Bandingkan dengan gaya lama yang masih sering terlihat:

```
GET /api/getBuku?id=1
GET /api/updateBuku?id=1&judul=xxx
GET /api/deleteBuku?id=1        ← ini berbahaya sungguhan
```

Yang terakhir bukan sekadar jelek. GET seharusnya **aman** — tidak mengubah
apa pun. Browser, crawler, dan proxy bebas memanggil URL GET kapan saja untuk
prefetch. Kalau GET menghapus data, data kalian bisa terhapus tanpa ada
manusia yang menekan tombol.

### `.all()` dan status 405

```js
.all(methodNotAllowed("GET", "POST"))
```

`.all()` menangkap semua method **lain** pada path yang sama. Tanpa baris
ini, `DELETE /api/v1/buku` jatuh ke handler 404 — padahal alamatnya jelas
ada.

| Kode    | Artinya                                          |
| ------- | ------------------------------------------------- |
| **404** | Alamatnya **tidak ada**                            |
| **405** | Alamatnya **ada**, methodnya yang tidak didukung   |

RFC 9110 mewajibkan response 405 menyertakan header `Allow`. Buktikan:

```bash
curl -i -X DELETE localhost:3001/api/v1/buku
```

```
HTTP/1.1 405 Method Not Allowed
Allow: GET, POST

{"msg":"Method DELETE tidak diizinkan untuk endpoint ini","allowed":["GET","POST"]}
```

Consumer langsung tahu apa yang seharusnya dia kirim. Itu API yang sopan.

---

## 5. Method spoofing — meluruskan istilah

Kalian menyebut perilaku di bagian 4 sebagai _spoofing_. Itu bukan spoofing —
tapi tebakan saya, istilah itu datang dari **Laravel**, dan kalau benar maka
intuisinya sangat masuk akal.

Ada **tiga hal berbeda** yang sering tertukar:

### (a) Method-based routing — yang kalian maksud

Satu URL, method berbeda memanggil fungsi berbeda. Perilaku normal HTTP,
tidak ada yang dipalsukan. Ini bagian 4 di atas.

### (b) Method spoofing / method override — ini yang namanya spoofing

Masalahnya nyata: **form HTML hanya bisa mengirim GET dan POST.** Tidak ada
cara menulis `<form method="DELETE">`.

Padahal REST butuh PUT, PATCH, dan DELETE. Solusinya: kirim POST, tapi
selipkan field tersembunyi yang menyatakan method yang _sebenarnya_
dimaksud. Server membacanya dan berpura-pura menerima method itu.

Laravel menyebut ini **"Form Method Spoofing"** — istilahnya persis, ada di
dokumentasi resminya:

```blade
<form action="/buku/1" method="POST">
    @method('DELETE')     {{-- menghasilkan <input type="hidden" name="_method" value="DELETE"> --}}
    @csrf
</form>
```

Padanannya di Express adalah middleware `method-override`:

```js
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
// POST /buku/1?_method=DELETE  →  diperlakukan sebagai DELETE
```

Jadi tebakan saya: kalian mengingatnya dari mata kuliah BWP yang memakai
Laravel 11.

**Kita tidak memerlukannya di mata kuliah ini.** Alasannya: kita tidak
membuat form HTML. Consumer kita Postman dan program lain, dan keduanya bisa
mengirim method apa pun secara langsung. Method override hanya perlu kalau
ada form HTML di antara client dan server.

### (c) Spoofing sebagai serangan keamanan

Istilah yang sama juga dipakai untuk hal yang sama sekali lain: **IP
spoofing**, **email spoofing**, **DNS spoofing** — memalsukan identitas
pengirim. Tidak ada hubungannya dengan routing. Disebutkan supaya kalian
tidak bingung saat menemukannya di bacaan keamanan.

**Ringkasnya:**

| Istilah                     | Artinya                                        | Dipakai di MK ini? |
| ---------------------------- | ----------------------------------------------- | ------------------- |
| Method-based routing         | Satu URL, method beda → fungsi beda             | ✅ Bagian 4          |
| Method spoofing / override   | POST menyamar jadi PUT/DELETE lewat `_method`   | ❌ Tidak perlu       |
| Spoofing (keamanan)          | Memalsukan identitas pengirim                   | ❌ Konteks lain      |

---

## 6. Urutan route menentukan segalanya

Express mencocokkan route **dari atas ke bawah** dan berhenti pada yang
pertama cocok.

```js
// ❌ SALAH
router.route("/:bukuId").get(getSingleBuku);
router.route("/statistik").get(statistikBuku); // tidak pernah tercapai
```

```
GET /api/v1/buku/statistik
  → cocok dengan /:bukuId
  → req.params.bukuId = "statistik"
  → Number("statistik") = NaN
  → 404 "Buku dengan id statistik tidak ditemukan"
```

Errornya menyesatkan karena tidak ada yang salah dengan controller. Yang
salah **urutannya**.

```js
// ✅ BENAR — teks tetap di atas, parameter di bawah
router.route("/statistik").get(statistikBuku);
router.route("/:bukuId").get(getSingleBuku);
```

> **Aturan:** route dengan teks tetap **selalu** di atas route berparameter.

Coba sendiri: tukar urutan kedua blok itu di `src/routes/buku.js`, simpan,
lalu panggil `/api/v1/buku/statistik`. Lihat 404-nya muncul. Kembalikan lagi.
Sekali mengalami, seumur hidup ingat.

---

## 7. Status code: memilih dengan sengaja

| Kode  | Kapan                                          | Contoh di project ini                |
| ----- | ------------------------------------------------ | -------------------------------------- |
| `200` | Berhasil                                          | GET, PUT, PATCH, DELETE                |
| `201` | Berhasil **membuat** sesuatu                      | POST buku baru, + header `Location`    |
| `400` | Client mengirim yang salah                        | Validasi gagal, body kosong            |
| `404` | Resource yang **diminta spesifik** tidak ada      | `GET /buku/999`                        |
| `405` | Alamat ada, method salah                          | `DELETE /buku`                         |
| `409` | Data benar, tapi bentrok                          | Judul duplikat                         |
| `500` | **Kode kalian** yang rusak                        | Jangan pernah dikirim sengaja          |
| `503` | **Dependensi** (database) tidak bisa dihubungi    | MySQL mati — baru muncul Minggu 3      |

### Empat keputusan yang sering salah

**Daftar kosong itu 200, bukan 404.**

```js
GET /api/v1/buku?keyword=zzzz
→ 200 { "total": 0, "data": [] }
```

Pencarian yang tidak menemukan apa pun adalah pencarian yang **berhasil**
dengan hasil nol. 404 artinya "alamat yang kamu minta tidak ada" — padahal
`/buku` jelas ada.

Beda dengan `GET /buku/999`: di situ kalian meminta **satu resource
spesifik** yang memang tidak ada. Itu 404.

**Duplikat itu 409, bukan 400.**

400 artinya "kiriman kamu salah bentuk". Tapi judul duplikat bentuknya
sempurna — yang bentrok adalah **keadaan server**. Kirim data yang sama
besok setelah bukunya dihapus, dan request itu berhasil. Itulah 409
Conflict. Minggu ini aturan ini ditegakkan di DUA lapis sekaligus — lihat
[§15 Dua lapis validasi](#15-dua-lapis-validasi).

**Jangan pernah 200 untuk error.**

```json
// ❌ berbohong pada setiap mesin yang memanggil
HTTP/1.1 200 OK
{ "success": false, "error": "not found" }
```

Manusia membaca body. **Mesin membaca status line.** Library HTTP di seluruh
dunia memutuskan sukses/gagal dari angka itu. Kalau kalian berbohong di
sana, setiap consumer harus menulis kode khusus untuk API kalian.

**Database mati itu 503, bukan diam-diam menggantung.**

Ini baru muncul Minggu 3 — lihat [§16](#16-asyncawait-dan-asynchandler) dan
[§17](#17-troubleshooting-mysql). Server yang jujur bilang "aku tidak bisa
menjawab sekarang" (503), bukan membiarkan request menunggu tanpa batas
waktu sampai client-nya sendiri yang menyerah.

---

## 8. Validasi manual

Buka `src/utils/validate.js`. Minggu 5 seluruh file itu diganti Joi dalam 10
baris — jadi kenapa menulisnya sendiri sekarang?

**Supaya kalian tahu apa yang sebenarnya Joi kerjakan.** Kalau tidak pernah
merasakan repotnya, Joi jadi mantra, bukan alat.

Fungsi itu mengerjakan tiga hal:

```js
const { valid, errors, value } = validate(req.body, aturanBuku);
```

1. **Memeriksa** — apakah datanya masuk akal
2. **Mengubah** — `"1965"` → `1965`
3. **Menyaring** — hanya field yang diizinkan yang keluar

Aturannya deklaratif, ditulis sekali di atas controller:

```js
const aturanBuku = {
  judul: {
    type: "string",
    required: true,
    label: "Judul",
    minLength: 3,
    maxLength: 150,
  },
  tahun_terbit: {
    type: "number",
    required: true,
    integer: true,
    min: 1900,
    max: 2026,
  },
  kategori: {
    type: "enum",
    required: true,
    values: ["novel", "komik", "non-fiksi", "referensi"],
  },
  stok: { type: "number", required: false, min: 0, default: 0 },
};
```

### Semua error sekaligus

```json
POST /api/v1/buku
{ "judul": "ab", "tahun_terbit": 1800, "harga": "mahal", "kategori": "majalah" }
```

```json
400 {
  "msg": "Validasi gagal",
  "errors": {
    "judul":        ["Judul minimal 3 karakter"],
    "penulis":      ["Penulis harus diisi"],
    "tahun_terbit": ["Tahun terbit minimal 1900"],
    "harga":        ["Harga harus berupa angka"],
    "kategori":     ["Kategori harus salah satu dari: novel, komik, non-fiksi, referensi"]
  }
}
```

Lima masalah, satu kali kirim. Bandingkan kalau berhenti di error pertama:
pengguna memperbaiki satu, kirim, dapat error kedua, perbaiki, kirim lagi —
lima kali bolak-balik untuk satu form.

Di Minggu 5 hal ini namanya `abortEarly: false`. Sekarang kalian tahu apa
yang dimatikan opsi itu.

Perhatikan juga bentuknya: **objek dikelompokkan per field**, isinya array.
Client bisa langsung menampilkan pesan di bawah input yang tepat.

Catatan Minggu 3: `validate()` sendiri **tidak tahu apa-apa soal MySQL**, dan
memang tidak perlu tahu. Dia hanya memeriksa BENTUK data. Aturan yang
membutuhkan database (seperti "judul tidak boleh kembar dengan yang sudah
tersimpan") tetap ditulis terpisah, di controller — persis seperti Minggu 2.

### PUT vs PATCH pada validasi

Ini bagian yang paling menarik. Aturannya **sama**, tapi dipakai berbeda:

```js
// PUT — ganti seluruhnya, semua field wajib
validate(req.body, aturanBuku);

// PATCH — ubah sebagian, hanya validasi yang dikirim
const aturanParsial = {};
for (const [field, rule] of Object.entries(aturanBuku)) {
  if (field in req.body) {
    aturanParsial[field] = { ...rule, required: false };
  }
}
validate(req.body, aturanParsial);
```

Buktikan di Postman:

| Request         | Body               | Hasil                          |
| ---------------- | ------------------- | -------------------------------- |
| `PUT /buku/1`   | `{"judul":"Baru"}` | `400` — field lain wajib         |
| `PATCH /buku/1` | `{"judul":"Baru"}` | `200` — field lain tetap utuh    |

---

## 9. Mass assignment: bahaya yang jarang diajarkan

Kode yang kelihatannya wajar:

```js
const bukuBaru = { ...req.body, id: idBaru };
store.buku.push(bukuBaru);
```

Penyerang mengirim:

```json
{ "judul": "Buku", "harga": 0, "isAdmin": true, "diskon": 100 }
```

`...req.body` menyalin **semua** field, termasuk yang tidak pernah kalian
rencanakan. `isAdmin` dan `diskon` ikut tersimpan.

Kelemahan ini punya nama sendiri: **mass assignment**, dan masuk daftar
OWASP API Security Top 10. Penyebabnya selalu sama — mempercayai bentuk data
yang dikirim client.

Solusinya sudah ada di `validate()`: `value` hanya berisi field yang
tercantum di `rules`. Apa pun yang lain dibuang diam-diam.

```js
const bukuBaru = { id: idBaru, ...value, karakter: [] };
//                              ^^^^^ bukan req.body
```

Minggu 3, prinsip yang sama diteruskan ke `src/data/buku.js`:
`repoBuku.simpan(value)` menerima `value` (sudah bersih) dan membangun
`INSERT` dari field yang jelas disebutkan satu per satu, bukan
`INSERT ... SET ?` dengan objek mentah. Dua pertahanan berbeda untuk
kelemahan yang berhubungan: mass assignment (field mana yang boleh masuk)
dan SQL Injection ([§13](#13-prepared-statement-dan-sql-injection), nilai
mana yang boleh ditempel ke SQL).

Buktikan — koleksi Postman sudah punya requestnya (**"Mass assignment
ditolak"**):

```bash
curl -X POST localhost:3001/api/v1/buku -H "Content-Type: application/json" \
  -d '{"judul":"Penyusup","penulis":"Penyerang","tahun_terbit":2020,
       "harga":1,"kategori":"novel","isAdmin":true,"diskon":100}'
```

Response 201, tapi `isAdmin` dan `diskon` **tidak ada**.

> **Aturan seumur hidup:**
> Jangan pernah menyimpan `req.body` secara langsung.
> Selalu bangun ulang objeknya dari field yang kalian pilih sendiri.

Ini juga alasan `id` diset terpisah (Minggu 3: oleh `AUTO_INCREMENT` di
MySQL, bukan `Math.max()` manual), bukan diambil dari body. Kalau tidak,
client bisa menentukan id-nya sendiri dan menimpa buku orang lain.

---

## 10. Dari array ke MySQL: apa yang berubah, apa yang tidak

**Tidak berubah** — ini yang paling penting untuk dipahami duluan:

- Semua endpoint di [README.md](README.md#daftar-endpoint), URL dan method-nya sama persis.
- Status code untuk setiap kondisi (200, 201, 400, 404, 405, 409) sama persis.
- Bentuk JSON response sama persis.
- Koleksi Postman kalian dari Minggu 2 — **tidak satu request pun perlu diedit.**
- `src/utils/validate.js`, aturan validasi di controller, logika mass assignment.
- `src/routes/*.js` — URL tetap memanggil fungsi yang sama.

**Berubah:**

| File                                | Sebelum (Minggu 2)                  | Sesudah (Minggu 3)                     |
| ------------------------------------ | ------------------------------------- | ----------------------------------------- |
| `src/data/buku.js`                  | Array `let buku = [...]` di memori   | Fungsi `async` yang query ke MySQL        |
| `src/controllers/buku.js`           | Fungsi biasa, akses array langsung    | Fungsi `async`, `await repoBuku...`       |
| `src/routes/buku.js`                | Controller dipasang langsung          | Dibungkus `asyncHandler(...)`             |
| `src/middlewares/errorHandler.js`   | Tangani error JSON & generic          | + tangani error khas MySQL                |
| *(baru)* `src/config/database.js`   | —                                     | Pool koneksi MySQL                        |
| *(baru)* `sql/schema.sql`, `sql/seed.sql` | —                                | Struktur tabel + data awal                |
| *(baru)* `scripts/migrate.js`       | —                                     | Menjalankan kedua file `.sql` di atas     |

Kalau kalian penasaran melihat diff persisnya, `git log -p` di masing-masing
file akan menunjukkan versi Minggu 2-nya.

Enam bagian berikut (§11–§16) membahas SATU perubahan konseptual masing-masing.

---

## 11. Connection pool

Baca komentar lengkap di `src/config/database.js`. Ringkasnya:

Satu koneksi MySQL itu seperti satu saluran telepon. Server web kalian
melayani BANYAK request bersamaan (itulah gunanya Node.js asinkron), tapi
kalau cuma ada satu koneksi ke database, request kedua harus antre sampai
request pertama selesai memakainya.

**Pool** menyiapkan beberapa koneksi di muka (project ini: maksimal 10),
meminjamkannya ke request yang butuh, lalu menerimanya kembali begitu
selesai. `mysql2/promise` mengurus pinjam-kembalikan ini otomatis lewat
`pool.query(...)`.

Ini kenapa `pool` dibuat **satu kali** saat aplikasi menyala
(`src/config/database.js` di-`require` sekali, Node meng-cache module),
bukan satu koneksi baru per request.

---

## 12. Repository pattern

Bandingkan `src/controllers/buku.js` Minggu 2 dan Minggu 3. Minggu 2,
controller langsung memanggil `store.buku.find(...)`. Minggu 3, controller
memanggil `repoBuku.cariId(...)` — dan `repoBuku` (yaitu `src/data/buku.js`)
yang menulis SQL-nya.

Kenapa ditambah satu lapis ini, bukan langsung `pool.query(...)` di dalam
controller?

- **Controller mengurus HTTP**: status code mana, pesan error apa, field
  mana yang divalidasi. Itu sudah cukup untuk dipikirkan.
- **Repository mengurus SQL**: bagaimana caranya "cari buku berdasarkan id"
  itu benar-benar dikerjakan di database.
- Kalau nanti (Minggu 4) `buku.js` diganti Sequelize, atau kalian menambah
  cache Redis di depan MySQL, yang berubah **hanya `src/data/buku.js`**.
  Tidak ada satu baris pun di `controllers/` atau `routes/` yang perlu
  disentuh — karena keduanya tidak pernah tahu SQL-nya seperti apa.

Ini alasan yang sama dengan kenapa `routes/` dan `controllers/` dipisah
([§2](#2-peta-folder-kenapa-dipisah-begini)). Prinsipnya sama, cuma
diterapkan satu lapis lebih dalam.

---

## 13. Prepared statement dan SQL Injection

Lihat baris ini di `src/data/buku.js`:

```js
const cariByJudul = async (judul) => {
  const [rows] = await pool.query(
    "SELECT id, judul FROM buku WHERE LOWER(judul) = LOWER(?)",
    [judul]
  );
  return rows[0] || null;
};
```

Tanda `?` disebut **placeholder**. Nilai `judul` dikirim TERPISAH dari teks
SQL-nya (sebagai array kedua), bukan ditempel jadi satu string. Ini disebut
**prepared statement**.

Bandingkan dengan cara yang SALAH, yang mungkin terlihat lebih "praktis":

```js
// JANGAN PERNAH MENULIS INI
const sql = `SELECT id, judul FROM buku WHERE LOWER(judul) = LOWER('${judul}')`;
await pool.query(sql);
```

Sekarang bayangkan seseorang mengirim `judul` berisi:

```
' OR '1'='1
```

Ditempel jadi satu string, query itu berubah menjadi:

```sql
SELECT id, judul FROM buku WHERE LOWER(judul) = LOWER('' OR '1'='1')
```

Perhatikan: `'1'='1'` selalu benar. Kondisi WHERE jadi selalu benar, dan
penyerang bisa membaca (atau dengan query lain: menghapus) SELURUH tabel,
bukan hanya baris yang dia maksud. Ini **SQL Injection**, dan ini nomor 3 di
OWASP Top 10 — kelas berat yang sama dengan mass assignment
([§9](#9-mass-assignment-bahaya-yang-jarang-diajarkan)).

**Aturan mutlak di seluruh `src/data/*.js`:** nilai dari luar (parameter
fungsi, yang ujungnya berasal dari `req.body`/`req.params`/`req.query`)
SELALU lewat `?`, TIDAK PERNAH ditempel langsung ke string SQL dengan
template literal.

Satu pengecualian yang terlihat seperti melanggar aturan ini — dan penting
dipahami KENAPA dia aman — ada di `cariSemua()`:

```js
const kolomSort = KOLOM_SORT_BOLEH.includes(sort) ? sort : "id";
// ...
`... ORDER BY ${kolomSort} ${arahSort}`
```

`?` cuma bisa dipakai untuk NILAI (isi kolom), bukan untuk NAMA kolom atau
kata kunci SQL seperti `ASC`/`DESC` — MySQL akan memperlakukannya sebagai
string biasa, bukan sebagai bagian dari sintaks. Karena nama kolom tidak
bisa diparameterkan, satu-satunya pertahanan yang tersisa adalah
**whitelist**: `sort` dari user HARUS ada di `KOLOM_SORT_BOLEH` sebelum
boleh ditempel ke SQL. Kalau tidak ada di daftar, jatuh ke default `"id"`.
Prinsipnya sama dengan `kolomBoleh` di Minggu 2 — MySQL cuma menambah alasan
yang lebih serius untuk menerapkannya.

---

## 14. Normalisasi: kenapa karakter jadi tabel sendiri

Minggu 2, `karakter` adalah array yang MENEMPEL di dalam objek buku. Minggu
3, `karakter` adalah tabel sendiri, dengan kolom `buku_id` yang MENUNJUK ke
tabel `buku` (lihat `sql/schema.sql`). Ini disebut **normalisasi** —
memisahkan data yang punya bentuk berulang jadi tabelnya sendiri,
dihubungkan lewat foreign key.

Efek praktisnya ada di `DELETE /api/v1/buku/:bukuId`. Minggu 2:

```js
store.buku = store.buku.filter((b) => b.id !== Number(bukuId));
// karakter ikut hilang karena dia bagian dari objek buku yang difilter
```

Minggu 3, `controllers/buku.js` hanya memanggil `repoBuku.hapus(bukuId)`,
yang isinya cuma `DELETE FROM buku WHERE id = ?`. Tidak ada kode yang
menghapus baris di tabel `karakter`. Tapi karakternya tetap ikut hilang —
coba sendiri: hapus sebuah buku, lalu
`SELECT * FROM karakter WHERE buku_id = <id tadi>`.

Ini terjadi karena `sql/schema.sql` mendefinisikan:

```sql
FOREIGN KEY (buku_id) REFERENCES buku(id) ON DELETE CASCADE
```

`ON DELETE CASCADE` memerintahkan MySQL: "kalau baris `buku` yang aku tunjuk
dihapus, hapus juga baris aku." Ini pekerjaan DATABASE, bukan pekerjaan kode
aplikasi — dan itu bedanya dengan `.filter()` manual Minggu 2.

---

## 15. Dua lapis validasi

Aturan bisnis "judul tidak boleh kembar" sekarang ditegakkan di DUA tempat:

1. **Controller** (`storeBuku` di `controllers/buku.js`): `SELECT` dulu
   lewat `repoBuku.cariByJudul(...)` sebelum `INSERT`. Ini yang menghasilkan
   pesan error rapi dan status `409` yang sudah kalian kenal dari Minggu 2.
2. **Database** (`sql/schema.sql`): `UNIQUE KEY uq_buku_judul (judul)`. Ini
   jaring pengaman kedua.

Kenapa perlu dua-duanya, padahal terlihat mengerjakan hal yang sama?

Antara langkah "SELECT untuk cek" dan langkah "INSERT" di controller, ada
jeda waktu — sesingkat apa pun. Kalau DUA request POST dengan judul yang
sama persis datang nyaris bersamaan, keduanya bisa lolos dari `SELECT`
(karena saat itu belum ada satu pun yang ter-INSERT), lalu keduanya mencoba
INSERT. Ini disebut **race condition**. Tanpa `UNIQUE KEY` di database,
kalian akan punya dua baris buku dengan judul kembar walau kode
controller-nya "benar".

Dengan `UNIQUE KEY`, INSERT kedua akan ditolak MySQL dengan error
`ER_DUP_ENTRY` — dan `src/middlewares/errorHandler.js` sudah menangkapnya,
mengembalikan `409` juga (lihat kodenya). Jadi hasil akhirnya konsisten,
baik lewat jalur normal (controller yang menangkap duluan) maupun jalur race
condition langka (database yang menangkap).

**Pelajarannya:** validasi di level aplikasi itu perlu (untuk pesan error
yang bagus, dan untuk gagal cepat sebelum menyentuh database sama sekali),
tapi constraint di level database tetap perlu sebagai jaring pengaman
terakhir yang tidak bisa dilewati oleh timing yang tidak beruntung. Ingat
pola ini — Tugas di [§20](#20-tugas-praktikum-minggu-3--yang-dikumpulkan)
memakainya lagi untuk aturan bisnis baru.

---

## 16. async/await dan asyncHandler

Baca `src/utils/asyncHandler.js` — penjelasan lengkapnya ada di komentar
file itu. Ringkasnya:

- Minggu 2, controller tidak pernah `throw`. Semua kegagalan dikembalikan
  lewat `return res.status(...).json(...)`.
- Minggu 3, `await pool.query(...)` bisa gagal (MySQL mati, query salah,
  dst), dan kegagalan itu berbentuk **exception**, bukan return value.
- Express 4 tidak tahu cara menangkap exception yang terjadi di dalam fungsi
  `async` secara otomatis. Tanpa penanganan tambahan, request akan
  menggantung tanpa response.
- `asyncHandler(fn)` di `routes/buku.js` menangkap exception itu dan
  melemparnya ke `errorHandler.js`, tempat yang sama yang sudah kalian kenal
  dari Minggu 2.

Coba sendiri: matikan MySQL (`brew services stop mysql` atau
`docker stop soa-mysql`), lalu panggil `GET /api/v1/buku`. Responsnya `503`
dengan pesan `"Database sedang tidak bisa dihubungi"` — bukan request yang
menggantung selamanya. Itu `asyncHandler` dan penanganan `ECONNREFUSED` di
`errorHandler.js` bekerja bersama. Nyalakan lagi MySQL-nya sebelum lanjut.

---

## 17. Troubleshooting MySQL

| Gejala                                                          | Penyebab paling mungkin                                                             | Solusi                                                                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `[DB] GAGAL terhubung ke MySQL: connect ECONNREFUSED`           | MySQL belum menyala                                                                   | `brew services start mysql` (atau nyalakan Docker container-nya)                                          |
| `Access denied for user 'root'@'localhost'`                    | `DB_USER`/`DB_PASSWORD` di `.env` salah                                              | Cocokkan dengan kredensial MySQL kalian; reset password kalau lupa                                       |
| `Unknown database 'soa_minggu3'`                                | Belum menjalankan migrasi                                                             | `npm run db:migrate`                                                                                      |
| `ER_NO_SUCH_TABLE` saat memanggil endpoint                      | Migrasi belum selesai / gagal di tengah                                              | Jalankan lagi `npm run db:migrate`, baca error-nya di terminal                                            |
| Data terasa "kotor" setelah banyak eksperimen POST/PUT/DELETE   | Wajar — kalian mengubah data sungguhan di database                                   | `npm run db:migrate` mengembalikan ke data awal (aman, idempotent)                                        |
| Request menggantung lama lalu timeout                           | Lupa membungkus controller baru dengan `asyncHandler` di routes                      | Cek `routes/buku.js`, pastikan pola `asyncHandler(fungsiController)`                                      |
| `ER_DUP_ENTRY` muncul di response `500` bukan `409`             | Menambah endpoint INSERT baru tanpa `errorHandler.js` versi terbaru terpasang         | Pastikan `errorHandler.js` (menangani `err.code === "ER_DUP_ENTRY"`) terpasang paling bawah di `index.js`  |
| `npm run migrate` : `Missing script: "migrate"`                 | Salah ketik nama script                                                              | Nama script-nya `db:migrate` — jalankan `npm run db:migrate`                                              |

---

## 18. Sepuluh best practice

**1. Selalu `return res...`**

```js
if (!buku) {
  return res.status(404).json({ msg: "..." }); // ← return-nya wajib
}
return res.status(200).json(buku);
```

Tanpa `return`, eksekusi lanjut dan kalian mengirim response dua kali:
`Cannot set headers after they are sent to the client`. Bug nomor satu sejak
Minggu 2, obatnya satu kata.

**2. `express.json()` sebelum router**

```js
app.use(express.json()); // dulu
app.use("/api/v1/buku", router); // baru
```

Terbalik → `req.body` selalu `undefined`.

**3. `Number()` untuk apa pun dari `params` atau `query`, walau sudah lewat MySQL**

Lihat [§3](#3-tiga-tempat-data-masuk) — `WHERE id = ?` di SQL aman dari
perbedaan tipe, perbandingan `===` di JavaScript tidak.

**4. Versi di URL sejak hari pertama**

`/api/v1/buku`, bukan `/buku`. Menambahkan versi belakangan berarti memutus
semua consumer.

**5. Nama resource: kata benda, jamak, tanpa kata kerja**

| ✅                       | ❌                                 |
| ------------------------- | ------------------------------------ |
| `GET /buku`               | `GET /getSemuaBuku`                 |
| `DELETE /buku/1`          | `GET /hapusBuku?id=1`               |
| `GET /buku/1/karakter`    | `GET /karakterDariBuku?bukuId=1`    |

Kata kerjanya sudah ada di method. Menulisnya lagi di URL itu mengulang.

**6. `404` dan error handler paling bawah**

```js
app.use("/api/v1/buku", bukuRouter);
app.use(notFound); // setelah semua router
app.use(errorHandler); // paling akhir
```

Dipasang di atas → menangkap semua request sebelum router sempat jalan.

**7. Error handler wajib empat parameter**

```js
const errorHandler = (err, req, res, next) => { ... };
//                    ^^^ hilangkan satu, Express tidak mengenalinya
```

**8. Log detail, kirim yang generik**

```js
console.error(err.stack); // untuk kalian
return res.status(500).json({ msg: "Terjadi kesalahan" }); // untuk client
```

Mengirim `err.stack` ke client membocorkan struktur folder, versi library,
dan kadang isi variabel. Minggu 3 ini juga berlaku untuk error MySQL — jangan
pernah meneruskan `err.sqlMessage` mentah ke client, itu bisa membocorkan
nama tabel/kolom.

**9. Repository yang menyalin data, bukan mengubah data asli saat query**

```js
let hasil = [...store.buku]; // Minggu 2: salin dulu sebelum sort()
```

```js
// Minggu 3: setiap panggilan cariSemua() query ulang ke MySQL,
// tidak pernah menyimpan/mengubah "array hasil terakhir" secara global.
const { total, data } = await repoBuku.cariSemua({ ... });
```

Prinsipnya sama: satu request tidak boleh diam-diam mengubah apa yang
dilihat request lain.

**10. `.gitignore` sebelum commit pertama**

```
node_modules/
.env
```

Mulai Minggu 7 `.env` berisi rahasia sungguhan — dan sejak Minggu 3, `.env`
kalian sudah berisi kredensial MySQL. Apa pun yang pernah masuk git tetap
ada di riwayatnya walau filenya dihapus.

---

## 19. Latihan

Tujuh latihan singkat seputar materi bacaan di atas. Nomor 1, 4, dan 8
**ditulis jawabannya** di `LATIHAN.md`. Nomor lainnya cukup dikerjakan
langsung (coba sendiri), tidak perlu ditulis ulang. Latihan ini TERPISAH
dari **Tugas** di [§20](#20-tugas-praktikum-minggu-3--yang-dikumpulkan) —
latihan melatih satu konsep kecil dari bacaan, tugas menguji semuanya
sekaligus lewat studi kasus baru.

### Latihan 1 — Rasakan bug-nya

Lakukan EMPAT hal berikut satu per satu, catat pesan error/perilaku yang
muncul dan penyebabnya di tabel `LATIHAN.md`:

1. Tukar urutan `/statistik` dan `/:bukuId` di `routes/buku.js`, panggil `GET /api/v1/buku/statistik`.
2. Hapus `Number()` pada `c.id === Number(karakterId)` di `getKarakter` (`controllers/buku.js`), panggil `GET /api/v1/buku/1/karakter/2`.
3. Nonaktifkan `app.use(express.json())` di `index.js`, kirim `POST /api/v1/buku` dengan body JSON.
4. Hapus pembungkus `asyncHandler(...)` dari salah satu route `buku`, matikan MySQL, lalu panggil route itu.

Kembalikan semua perubahan setelah selesai mencatat.

### Latihan 2 — 404 vs 405

Panggil `DELETE /api/v1/buku` lewat `curl -i` (bukan lewat Postman, supaya
kalian melihat header mentahnya). Temukan header `Allow`-nya. Jelaskan pada
diri sendiri kenapa ini bukan `404`.

### Latihan 3 — Urutan route

Ikuti instruksi "coba sendiri" di [§6](#6-urutan-route-menentukan-segalanya)
sampai selesai — tukar urutan, lihat 404-nya, kembalikan lagi.

### Latihan 4 — Kenapa 409 dan bukan 400?

Tulis jawabannya di `LATIHAN.md`. Kaitkan dengan `UNIQUE KEY` di
`sql/schema.sql` — apa yang terjadi kalau constraint itu dihapus dan dua
request `POST` dengan judul sama datang nyaris bersamaan? (lihat
[§15](#15-dua-lapis-validasi))

### Latihan 5 — Normalisasi dan CASCADE

Hapus sebuah buku yang punya karakter (misalnya id `1`) lewat
`DELETE /api/v1/buku/1`, lalu jalankan
`SELECT * FROM karakter WHERE buku_id = 1` langsung di MySQL. Jelaskan pada
diri sendiri kenapa hasilnya kosong padahal tidak ada satu baris kode pun di
`controllers/buku.js` yang menghapus tabel `karakter`. Jalankan
`npm run db:migrate` sesudahnya untuk mengembalikan data.

### Latihan 6 — Migrasi resource `penulis` ke MySQL, + aturan bisnis tambahan (opsional)

`src/data/penulis.js` sudah disiapkan mengikuti pola yang sama dengan
`src/data/buku.js`, dan tabel `penulis` sudah ada isinya (lihat
`sql/schema.sql` dan `sql/seed.sql`). Bangun `src/controllers/penulis.js`
dan `src/routes/penulis.js` sendiri, mengikuti pola `buku`: `GET` semua,
`GET` satu (404 kalau tidak ada), `POST`, `PUT`, `DELETE`. Daftarkan
router barunya di `src/routes/index.js` dan `index.js`.

Latihan tambahan opsional (tidak dinilai terpisah, tapi menjawab Latihan 8
no. 2 di bawah): terapkan aturan "tidak boleh hapus buku yang masih
berstok" pada `deleteBuku` (`src/controllers/buku.js`) — kalau `stok > 0`,
kembalikan `409` dan JANGAN hapus. Pola persis sama dengan aturan judul
kembar di [§15](#15-dua-lapis-validasi): cek dulu sebelum eksekusi.

### Latihan 7 — Menelusuri jalur error

Matikan MySQL sementara, panggil `GET /api/v1/buku`, catat status code dan
pesannya. Nyalakan lagi MySQL. Jelaskan pada diri sendiri alur request itu:
file mana yang dilewati dari `pool.query()` gagal sampai menjadi response
`503` (sebutkan minimal tiga file/komponen: repository, `asyncHandler`,
`errorHandler`).

### Latihan 8 — Refleksi

Tulis jawabannya di `LATIHAN.md`:

1. Kenapa `?keyword=zzz` 200 tapi `/buku/999` 404?
2. Kenapa hapus buku berstok itu 409?
   > Kerjakan dulu bagian opsional di Latihan 6 di atas, baru jawab
   > pertanyaan ini dari kode yang baru saja kalian tulis sendiri.
3. Kalau pindah ke MySQL, file mana yang berubah?
4. Apa yang berlebihan dari project ini?

---

## 20. Tugas Praktikum Minggu 3 — yang dikumpulkan

Tugas minggu ini bentuknya studi kasus: sebuah "klien" (CV Wira Jaya
Rental) meminta backend REST API baru untuk bisnis rental kendaraan
mereka — resource dan aturan bisnis yang SAMA SEKALI BEDA dari `buku`,
supaya kalian membuktikan paham POLA-nya, bukan cuma hafal kode `buku`.

Soal lengkapnya (latar belakang klien, aturan bisnis, kontrak endpoint,
deliverables, kriteria penilaian) ada di file terpisah:

**→ [`TUGAS-RENTAL.md`](TUGAS-RENTAL.md)**

Semua konsep yang dibutuhkan untuk mengerjakannya sudah ada di §1–§18 di
atas: repository pattern, prepared statement, dua lapis validasi (untuk
aturan "plat nomor tidak boleh kembar", dst), `asyncHandler`, dan pola
"tolak dengan 409 sebelum eksekusi" yang sudah kalian latih di
[Latihan 6](#19-latihan).

