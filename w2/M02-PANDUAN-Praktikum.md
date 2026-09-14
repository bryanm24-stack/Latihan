# PANDUAN PRAKTIKUM MINGGU 2
## REST Service Dasar dengan Express

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
9. [Mass assignment](#9-mass-assignment-bahaya-yang-jarang-diajarkan)
10. [Sepuluh best practice](#10-sepuluh-best-practice-minggu-2)
11. [Latihan 1–8](#11-latihan)
12. [Praktikum 1 — yang dikumpulkan](#12-praktikum-1--yang-dikumpulkan)

---

## 1. Menjalankan project

```bash
npm install
cp .env.example .env
npm run dev          # nodemon, restart otomatis saat file disimpan
```

Buka `http://localhost:3001`. Kalau muncul JSON daftar endpoint, berhasil.

Impor dua file di folder `postman/` ke Postman, pilih environment `local`, lalu jalankan Runner. **28 request, 49 assertion, semuanya harus hijau.** Kalau ada yang merah sebelum kalian mengubah apa pun, ada yang salah dengan instalasi — bukan dengan kode.

```
soa-minggu2/
├── index.js                    ← pasang middleware, pasang router, nyalakan server
├── src/
│   ├── data/buku.js            ← "database" sementara (array biasa)
│   ├── routes/                 ← URL mana memanggil fungsi mana
│   ├── controllers/            ← apa yang terjadi
│   ├── middlewares/            ← yang berjalan sebelum/sesudah controller
│   └── utils/validate.js       ← validasi manual (Minggu 5 diganti Joi)
└── postman/                    ← koleksi + environment, ikut di-commit
```

---

## 2. Peta folder: kenapa dipisah begini

Semua kode di project ini muat dalam satu file `index.js`. Jadi kenapa dipecah?

Pertanyaan yang lebih tepat: **apa yang bisa saya ketahui tanpa membaca seluruh kode?**

| File | Menjawab | Kalau butuh tahu ini, buka file ini |
|---|---|---|
| `routes/buku.js` | URL apa saja yang ada | Seluruh permukaan API buku, dalam 30 baris |
| `controllers/buku.js` | Apa yang terjadi | Logika, tanpa terganggu urusan URL |
| `data/buku.js` | Datanya bagaimana | Bentuk data, satu tempat |
| `utils/validate.js` | Aturan inputnya apa | Bisa dipakai ulang oleh resource lain |

Buka `src/routes/buku.js` sekarang. Dalam 20 detik kalian tahu ada berapa endpoint, apa saja methodnya, dan apa nama fungsinya — tanpa membaca satu baris pun logika.

Itulah nilainya. Bukan "supaya rapi", tapi supaya **bisa dibaca sebagian**.

Ada bonus yang baru terasa nanti: di Minggu 7 kalian menambahkan autentikasi. Perubahannya cuma satu baris di file routes:

```js
router.route("/:bukuId").delete(verifyJWT, checkRoles("admin"), deleteBuku);
```

Controller `deleteBuku` tidak disentuh sama sekali. Itu hanya mungkin kalau keduanya terpisah sejak awal.

> **Model belum ada minggu ini, dan itu disengaja.**
> `data/buku.js` bukan model — dia cuma array. Model asli (Sequelize) datang Minggu 4. Minggu ini fokusnya HTTP dan struktur; menambah database sekarang berarti kalian belajar dua hal sulit sekaligus, dan saat error kalian tidak tahu harus menyalahkan yang mana.

---

## 3. Tiga tempat data masuk

Ini konsep paling penting minggu ini. Jalankan endpoint `/api/v1/contoh` sambil membaca bagian ini.

| Sumber | Bentuknya | Untuk apa | Sifat |
|---|---|---|---|
| `req.query` | `/buku?keyword=jojo&limit=5` | Filter, cari, paging, sort | Opsional, bebas dikombinasi |
| `req.params` | `/buku/3/karakter/2` | **Menunjuk** resource mana | Wajib, bagian dari identitas |
| `req.body` | Isi kiriman, tidak di URL | Data yang dibuat/diubah | Bisa besar, tidak terlihat di log |

Cara memilih:

- Kalau menghilangkannya membuat URL menunjuk **resource yang berbeda** → itu `params`
- Kalau menghilangkannya hanya mengubah **cara menampilkan** → itu `query`
- Kalau isinya **data baru** → itu `body`

Contoh: `/buku/3` tanpa `3` jadi `/buku` — resource berbeda (satu buku vs daftar). Jadi `params`.
`/buku?limit=5` tanpa `limit` tetap `/buku` — resource sama, tampilan beda. Jadi `query`.

### Jebakan: semua dari HTTP itu string

```js
req.query.umur        // "40"  — string, SELALU
typeof req.query.umur // "string"
```

Ada tiga cara ini menggigit. Panggil `GET /api/v1/contoh?umur=40&min=100&max=45` dan lihat responsnya:

```js
// (a) + menyambung teks, bukan menjumlah
"40" + 1              // "401"     ← bukan 41
Number("40") + 1      // 41

// (b) membandingkan DUA nilai dari HTTP → dua-duanya string → alfabetis
"100" < "45"          // true      ← "1" lebih kecil dari "4"
Number("100") < Number("45")  // false

// (c) === tidak mengonversi apa pun
"40" === 40           // false, selalu
b.id === req.params.bukuId          // selalu false
b.id === Number(req.params.bukuId)  // benar
```

Catatan jujur: `"100" < 45` **aman** — kalau salah satu sisi angka, JavaScript mengonversi string ke number lebih dulu. Yang berbahaya justru saat **kedua** sisi string, yaitu (b). Banyak materi salah menjelaskan ini.

Poin (c) adalah bug Minggu 2 paling sering. Coba sendiri: hapus `Number()` di fungsi `cariBuku` pada `controllers/buku.js`, lalu panggil `GET /api/v1/buku/1`. Kalian dapat 404 untuk buku yang jelas-jelas ada.

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

Namanya **routing berdasarkan method** (*method-based routing*). Ini perilaku bawaan HTTP, bukan fitur Express.

Bandingkan dengan gaya lama yang masih sering terlihat:

```
GET /api/getBuku?id=1
GET /api/updateBuku?id=1&judul=xxx
GET /api/deleteBuku?id=1        ← ini berbahaya sungguhan
```

Yang terakhir bukan sekadar jelek. GET seharusnya **aman** — tidak mengubah apa pun. Browser, crawler, dan proxy bebas memanggil URL GET kapan saja untuk prefetch. Kalau GET menghapus data, data kalian bisa terhapus tanpa ada manusia yang menekan tombol.

### `.all()` dan status 405

```js
.all(methodNotAllowed("GET", "POST"))
```

`.all()` menangkap semua method **lain** pada path yang sama. Tanpa baris ini, `DELETE /api/v1/buku` jatuh ke handler 404 — padahal alamatnya jelas ada.

| Kode | Artinya |
|---|---|
| **404** | Alamatnya **tidak ada** |
| **405** | Alamatnya **ada**, methodnya yang tidak didukung |

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

Kalian menyebut perilaku di bagian 4 sebagai *spoofing*. Itu bukan spoofing — tapi tebakan saya, istilah itu datang dari **Laravel**, dan kalau benar maka intuisinya sangat masuk akal.

Ada **tiga hal berbeda** yang sering tertukar:

### (a) Method-based routing — yang kalian maksud

Satu URL, method berbeda memanggil fungsi berbeda. Perilaku normal HTTP, tidak ada yang dipalsukan. Ini bagian 4 di atas.

### (b) Method spoofing / method override — ini yang namanya spoofing

Masalahnya nyata: **form HTML hanya bisa mengirim GET dan POST.** Tidak ada cara menulis `<form method="DELETE">`.

Padahal REST butuh PUT, PATCH, dan DELETE. Solusinya: kirim POST, tapi selipkan field tersembunyi yang menyatakan method yang *sebenarnya* dimaksud. Server membacanya dan berpura-pura menerima method itu.

Laravel menyebut ini **"Form Method Spoofing"** — istilahnya persis, ada di dokumentasi resminya:

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

Jadi tebakan saya: kalian mengingatnya dari mata kuliah BWP yang memakai Laravel 11.

**Kita tidak memerlukannya di mata kuliah ini.** Alasannya: kita tidak membuat form HTML. Consumer kita Postman dan program lain, dan keduanya bisa mengirim method apa pun secara langsung. Method override hanya perlu kalau ada form HTML di antara client dan server.

### (c) Spoofing sebagai serangan keamanan

Istilah yang sama juga dipakai untuk hal yang sama sekali lain: **IP spoofing**, **email spoofing**, **DNS spoofing** — memalsukan identitas pengirim. Tidak ada hubungannya dengan routing. Disebutkan supaya kalian tidak bingung saat menemukannya di bacaan keamanan.

**Ringkasnya:**

| Istilah | Artinya | Dipakai di MK ini? |
|---|---|---|
| Method-based routing | Satu URL, method beda → fungsi beda | ✅ Bagian 4 |
| Method spoofing / override | POST menyamar jadi PUT/DELETE lewat `_method` | ❌ Tidak perlu |
| Spoofing (keamanan) | Memalsukan identitas pengirim | ❌ Konteks lain |

---

## 6. Urutan route menentukan segalanya

Express mencocokkan route **dari atas ke bawah** dan berhenti pada yang pertama cocok.

```js
// ❌ SALAH
router.route("/:bukuId").get(getSingleBuku);
router.route("/statistik").get(statistikBuku);   // tidak pernah tercapai
```

```
GET /api/v1/buku/statistik
  → cocok dengan /:bukuId
  → req.params.bukuId = "statistik"
  → Number("statistik") = NaN
  → 404 "Buku dengan id statistik tidak ditemukan"
```

Errornya menyesatkan karena tidak ada yang salah dengan controller. Yang salah **urutannya**.

```js
// ✅ BENAR — teks tetap di atas, parameter di bawah
router.route("/statistik").get(statistikBuku);
router.route("/:bukuId").get(getSingleBuku);
```

> **Aturan:** route dengan teks tetap **selalu** di atas route berparameter.

Coba sendiri: tukar urutan kedua blok itu di `src/routes/buku.js`, simpan, lalu panggil `/api/v1/buku/statistik`. Lihat 404-nya muncul. Kembalikan lagi. Sekali mengalami, seumur hidup ingat.

---

## 7. Status code: memilih dengan sengaja

| Kode | Kapan | Contoh di project ini |
|---|---|---|
| `200` | Berhasil | GET, PUT, PATCH, DELETE |
| `201` | Berhasil **membuat** sesuatu | POST buku baru, + header `Location` |
| `400` | Client mengirim yang salah | Validasi gagal, body kosong |
| `404` | Resource yang **diminta spesifik** tidak ada | `GET /buku/999` |
| `405` | Alamat ada, method salah | `DELETE /buku` |
| `409` | Data benar, tapi bentrok | Judul duplikat |
| `500` | **Kode kalian** yang rusak | Jangan pernah dikirim sengaja |

### Tiga keputusan yang sering salah

**Daftar kosong itu 200, bukan 404.**

```js
GET /api/v1/buku?keyword=zzzz
→ 200 { "total": 0, "data": [] }
```

Pencarian yang tidak menemukan apa pun adalah pencarian yang **berhasil** dengan hasil nol. 404 artinya "alamat yang kamu minta tidak ada" — padahal `/buku` jelas ada.

Beda dengan `GET /buku/999`: di situ kalian meminta **satu resource spesifik** yang memang tidak ada. Itu 404.

**Duplikat itu 409, bukan 400.**

400 artinya "kiriman kamu salah bentuk". Tapi judul duplikat bentuknya sempurna — yang bentrok adalah **keadaan server**. Kirim data yang sama besok setelah bukunya dihapus, dan request itu berhasil. Itulah 409 Conflict.

**Jangan pernah 200 untuk error.**

```json
// ❌ berbohong pada setiap mesin yang memanggil
HTTP/1.1 200 OK
{ "success": false, "error": "not found" }
```

Manusia membaca body. **Mesin membaca status line.** Library HTTP di seluruh dunia memutuskan sukses/gagal dari angka itu. Kalau kalian berbohong di sana, setiap consumer harus menulis kode khusus untuk API kalian.

---

## 8. Validasi manual

Buka `src/utils/validate.js`. Minggu 5 seluruh file itu diganti Joi dalam 10 baris — jadi kenapa menulisnya sendiri sekarang?

**Supaya kalian tahu apa yang sebenarnya Joi kerjakan.** Kalau tidak pernah merasakan repotnya, Joi jadi mantra, bukan alat.

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
  judul: { type: "string", required: true, label: "Judul", minLength: 3, maxLength: 150 },
  tahun_terbit: { type: "number", required: true, integer: true, min: 1900, max: 2026 },
  kategori: { type: "enum", required: true, values: ["novel", "komik", "non-fiksi", "referensi"] },
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

Lima masalah, satu kali kirim. Bandingkan kalau berhenti di error pertama: pengguna memperbaiki satu, kirim, dapat error kedua, perbaiki, kirim lagi — lima kali bolak-balik untuk satu form.

Di Minggu 5 hal ini namanya `abortEarly: false`. Sekarang kalian tahu apa yang dimatikan opsi itu.

Perhatikan juga bentuknya: **objek dikelompokkan per field**, isinya array. Client bisa langsung menampilkan pesan di bawah input yang tepat.

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

| Request | Body | Hasil |
|---|---|---|
| `PUT /buku/1` | `{"judul":"Baru"}` | `400` — field lain wajib |
| `PATCH /buku/1` | `{"judul":"Baru"}` | `200` — field lain tetap utuh |

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

`...req.body` menyalin **semua** field, termasuk yang tidak pernah kalian rencanakan. `isAdmin` dan `diskon` ikut tersimpan.

Kelemahan ini punya nama sendiri: **mass assignment**, dan masuk daftar OWASP API Security Top 10. Penyebabnya selalu sama — mempercayai bentuk data yang dikirim client.

Solusinya sudah ada di `validate()`: `value` hanya berisi field yang tercantum di `rules`. Apa pun yang lain dibuang diam-diam.

```js
const bukuBaru = { id: idBaru, ...value, karakter: [] };
//                              ^^^^^ bukan req.body
```

Buktikan — koleksi Postman sudah punya requestnya (**"Mass assignment ditolak"**):

```bash
curl -X POST localhost:3001/api/v1/buku -H "Content-Type: application/json" \
  -d '{"judul":"Penyusup","penulis":"Penyerang","tahun_terbit":2020,
       "harga":1,"kategori":"novel","isAdmin":true,"diskon":100}'
```

Response 201, tapi `isAdmin` dan `diskon` **tidak ada**.

> **Aturan seumur hidup:**
> Jangan pernah menyimpan `req.body` secara langsung.
> Selalu bangun ulang objeknya dari field yang kalian pilih sendiri.

Ini juga alasan `id` diset terpisah di controller, bukan diambil dari body. Kalau tidak, client bisa menentukan id-nya sendiri dan menimpa buku orang lain.

---

## 10. Sepuluh best practice Minggu 2

**1. Selalu `return res...`**

```js
if (!buku) {
  return res.status(404).json({ msg: "..." });   // ← return-nya wajib
}
return res.status(200).json(buku);
```

Tanpa `return`, eksekusi lanjut dan kalian mengirim response dua kali:
`Cannot set headers after they are sent to the client`. Bug nomor satu minggu ini, obatnya satu kata.

**2. `express.json()` sebelum router**

```js
app.use(express.json());          // dulu
app.use("/api/v1/buku", router);  // baru
```

Terbalik → `req.body` selalu `undefined`.

**3. `Number()` untuk apa pun dari `params` atau `query`**

**4. Versi di URL sejak hari pertama**

`/api/v1/buku`, bukan `/buku`. Menambahkan versi belakangan berarti memutus semua consumer.

**5. Nama resource: kata benda, jamak, tanpa kata kerja**

| ✅ | ❌ |
|---|---|
| `GET /buku` | `GET /getSemuaBuku` |
| `DELETE /buku/1` | `GET /hapusBuku?id=1` |
| `GET /buku/1/karakter` | `GET /karakterDariBuku?bukuId=1` |

Kata kerjanya sudah ada di method. Menulisnya lagi di URL itu mengulang.

**6. `404` dan error handler paling bawah**

```js
app.use("/api/v1/buku", bukuRouter);
app.use(notFound);        // setelah semua router
app.use(errorHandler);    // paling akhir
```

Dipasang di atas → menangkap semua request sebelum router sempat jalan.

**7. Error handler wajib empat parameter**

```js
const errorHandler = (err, req, res, next) => { ... };
//                    ^^^ hilangkan satu, Express tidak mengenalinya
```

**8. Log detail, kirim yang generik**

```js
console.error(err.stack);                                    // untuk kalian
return res.status(500).json({ msg: "Terjadi kesalahan" });   // untuk client
```

Mengirim `err.stack` ke client membocorkan struktur folder, versi library, dan kadang isi variabel.

**9. Jangan mengubah data asli saat query**

```js
let hasil = [...store.buku];   // salin dulu
hasil.sort(...)                // sort() mengubah array aslinya
```

Tanpa `[...]`, `GET /buku?sort=harga` mengubah urutan data untuk semua request berikutnya.

**10. `.gitignore` sebelum commit pertama**

```
node_modules/
.env
```

Mulai Minggu 7 `.env` berisi rahasia sungguhan. Apa pun yang pernah masuk git tetap ada di riwayatnya walau filenya dihapus.

---

## 11. Latihan

Kerjakan berurutan. Setiap latihan menambah sesuatu ke project yang sama.

### Latihan 1 — Rasakan bug-nya (10 menit)

Rusakkan dengan sengaja, amati, kembalikan.

1. Hapus `app.use(express.json())` di `index.js`. Panggil `POST /api/v1/contoh`. Apa yang terjadi pada `req.body`?
2. Kembalikan. Sekarang hapus `Number()` di `cariBuku` (`controllers/buku.js`). Panggil `GET /api/v1/buku/1`. Kenapa 404?
3. Kembalikan. Sekarang hapus kata `return` pada baris 404 di `getSingleBuku`. Panggil `GET   `. Baca errornya di terminal.
4. Kembalikan. Pindahkan blok `/:bukuId` ke ATAS blok `/statistik` di `routes/buku.js`. Panggil `/api/v1/buku/statistik`.

**Tulis di `LATIHAN.md`:** untuk setiap nomor, satu kalimat pesan errornya dan satu kalimat penyebabnya.

### Latihan 2 — Endpoint pencarian lanjutan (20 menit)

Tambahkan ke `GET /api/v1/buku`:

- `?harga_min=` dan `?harga_max=` — rentang harga
- `?tersedia=true` — hanya yang `stok > 0`
- `?tahun_min=` dan `?tahun_max=`

Semua harus bisa dikombinasikan: `?kategori=novel&harga_max=100000&tersedia=true`

**Syarat:** jangan menyentuh file routes. Ini murni urusan controller.

### Latihan 3 — Endpoint agregat baru (20 menit)

Buat `GET /api/v1/buku/termurah` yang mengembalikan satu buku dengan harga terendah.

**Perhatian:** taruh di urutan yang benar. Kalau kalian dapat 404, baca lagi bagian 6.

Lalu `GET /api/v1/buku/kategori/:namaKategori` yang mengembalikan semua buku dalam satu kategori, dengan 404 kalau kategorinya tidak dikenal.

### Latihan 4 — Aturan bisnis (25 menit)

Tambahkan aturan berikut, masing-masing dengan status code yang tepat:

| Aturan | Status |
|---|---|
| Buku dengan `stok > 0` tidak boleh dihapus | `409` |
| `harga` tidak boleh diubah lebih dari 50% sekali PATCH | `400` |
| `tahun_terbit` tidak boleh diubah setelah dibuat (PATCH mengabaikannya diam-diam) | `200`, tapi tidak berubah |

Pertanyaan yang harus kalian jawab di komentar: **kenapa aturan pertama 409 dan bukan 400?**

### Latihan 5 — Karakter yang bisa ditulis (30 menit)

Sekarang karakter hanya bisa dibaca. Tambahkan:

```
POST   /api/v1/buku/:bukuId/karakter
PUT    /api/v1/buku/:bukuId/karakter/:karakterId
DELETE /api/v1/buku/:bukuId/karakter/:karakterId
```

**Syarat:**
- Validasi `nama` (wajib, 2–100 karakter) dan `peran` (enum: `protagonis`, `antagonis`, `pendukung`)
- Id karakter unik **di dalam bukunya**, bukan global
- Bedakan 404 "buku tidak ada" dan 404 "karakter tidak ada"
- Pasang `.all(methodNotAllowed(...))`

### Latihan 6 — Resource kedua dari nol (45 menit)

`src/data/penulis.js` sudah disediakan. Bangun sendiri:

- `src/controllers/penulis.js`
- `src/routes/penulis.js`
- Daftarkan di `src/routes/index.js` dan `index.js`

**Endpoint minimum:**

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/penulis` | keyword, negara, limit, offset |
| GET | `/api/v1/penulis/:id` | 404 kalau tidak ada |
| GET | `/api/v1/penulis/:id/buku` | semua buku karya penulis ini |
| POST | `/api/v1/penulis` | validasi + cek duplikat nama |
| PUT | `/api/v1/penulis/:id` | semua field wajib |
| PATCH | `/api/v1/penulis/:id` | sebagian |
| DELETE | `/api/v1/penulis/:id` | **409** kalau masih punya buku |

Aturan validasi: `nama` (3–100), `negara` (wajib), `tahun_lahir` (1800 sampai tahun ini).

Endpoint ketiga dan aturan DELETE-nya adalah inti latihan ini: kalian mulai menangani **relasi antar resource** — persis yang jadi materi Minggu 4.

### Latihan 7 — Test Postman sendiri (25 menit)

Tambahkan folder `Penulis` ke koleksi, minimal 10 request dengan test:

- Semua jalur sukses
- Minimal empat kasus gagal: `400` validasi, `404` tidak ada, `405` method salah, `409` hapus yang masih punya buku
- Satu test yang membuktikan mass assignment tertahan
- Rantaikan id: POST menyimpan `penulisId`, request berikutnya memakainya

Jalankan lewat Runner. **Semua hijau**, lalu export dan commit.

### Latihan 8 — Refleksi (15 menit)

Jawab di `LATIHAN.md`, masing-masing satu paragraf:

1. Kenapa `/buku?keyword=zzz` mengembalikan `200` sedangkan `/buku/999` mengembalikan `404`? Apa aturan umumnya?
2. Kenapa menghapus buku yang masih ada stoknya lebih cocok `409` daripada `400`?
3. Kalau minggu depan data pindah ke MySQL, file mana saja yang berubah dan mana yang tidak? Kenapa?
4. Satu hal dari project ini yang menurut kalian **berlebihan** untuk project sekecil ini — dan alasannya. (Jawaban jujur bernilai lebih dari jawaban sopan.)

Pertanyaan 3 adalah jembatan ke Minggu 3. Kalau jawabannya "hanya controller", kalian sudah paham kenapa struktur ini dipakai.

---

## 12. Praktikum 1 — yang dikumpulkan

**Format:** tautan repository GitHub + koleksi Postman yang sudah di-export ke dalam repo.
**Nama repo:** `soa-prak1-<NRP>`

### Daftar periksa

- [ ] Latihan 1–8 selesai, `LATIHAN.md` terisi
- [ ] Resource `buku` lengkap dengan tambahan dari Latihan 2–5
- [ ] Resource `penulis` lengkap (Latihan 6), termasuk `/penulis/:id/buku`
- [ ] Struktur `routes` / `controllers` / `data` / `middlewares` / `utils` dipertahankan
- [ ] Semua endpoint memakai `.route()` dan `.all(methodNotAllowed(...))`
- [ ] Route berteks tetap berada di atas route berparameter
- [ ] Validasi memakai `validate()`, melaporkan semua error sekaligus
- [ ] Mass assignment tertahan — dibuktikan oleh test Postman
- [ ] Status code: `200`, `201`, `400`, `404`, `405`, `409` semuanya terpakai dengan benar
- [ ] Koleksi Postman ≥ 35 request, semua bertest, semua hijau di Runner
- [ ] `.gitignore` berisi `node_modules/` dan `.env`
- [ ] `README.md` berisi: cara menjalankan, daftar endpoint, dan keputusan yang kalian ambil sendiri

### Penilaian

| Kriteria | Bobot | Nilai penuh berarti |
|---|---|---|
| Endpoint berfungsi | 25% | Semua method bekerja pada dua resource, termasuk nested |
| Status code | 20% | `201`+Location, `404` vs `405`, `409` dipakai dengan alasan yang benar |
| Struktur project | 20% | Routes/controllers terpisah bersih; tidak ada logika di file routes |
| Validasi | 20% | Semua error sekaligus, per field, dan mass assignment tertahan |
| Koleksi Postman | 15% | ≥35 request bertest, mencakup jalur gagal, memakai `{{baseUrl}}` |

### Yang mengurangi nilai

- Ada `http://localhost:3001` tertulis langsung di request Postman — pakai `{{baseUrl}}`
- `node_modules/` ikut ter-commit
- Mengembalikan `200` untuk kondisi error
- Ada logika bisnis (`if`, `.filter()`) di dalam file `routes/`
- Menyimpan `req.body` langsung tanpa disaring

---

## Menuju Minggu 3

Minggu depan `data/buku.js` diganti MySQL. Yang berubah **hanya isi controller**. File routes, struktur folder, status code, dan **seluruh koleksi Postman kalian** tetap sama persis.

Koleksi yang kalian buat minggu ini akan dipakai lagi untuk menguji versi database-nya. Kalau semua tetap hijau tanpa satu request pun diedit, itu bukti bahwa kalian sudah merancang **antarmuka**, bukan sekadar kode.

Karena itu jangan asal mengejar hijau minggu ini. Koleksi ini hidup sampai Minggu 14.
