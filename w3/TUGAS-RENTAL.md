# TUGAS PRAKTIKUM MINGGU 3

## Studi Kasus: CV Wira Jaya Rental

Mata Kuliah Arsitektur Berbasis Layanan (SOA) · S1 Sistem Informasi Bisnis, ISTTS

Bacaan konsep (connection pool, repository pattern, prepared statement,
dua lapis validasi, dll di PANDUAN.md §10–§17) adalah BEKAL untuk
mengerjakan tugas ini — bukan sesuatu yang diulang di sini.

---

## Latar belakang

CV Wira Jaya Rental menyewakan motor dan mobil di Surabaya, sudah jalan 5
tahun. Sampai sekarang pencatatan masih pakai buku catatan dan Excel yang
dikelola manual oleh dua orang admin secara bergantian.

Owner menghubungi kalian (tim SOA) untuk membuatkan **backend REST API**
sebagai fondasi sistem digital mereka. Front-end web/mobile-nya akan
dikerjakan tim lain belakangan — tugas kalian murni backend.

Cuplikan hasil wawancara dengan klien:

> **Owner:** "Saya cuma mau tahu, motor mana yang available, siapa yang lagi
> minjem apa, dan kalau telat kena denda berapa. Simpel aja dulu, jangan
> neko-neko dulu fitur-fiturnya."

> **Admin:** "Yang paling nyebelin itu kalau ada motor yang sebenernya lagi
> disewa tapi kecatet available — jadi double booking, pelanggan komplain.
> Terus kalau motor lagi diservis, jangan sampai bisa disewain juga."

> **Owner:** "Soal denda telat, ya pokoknya ada tarif per hari keterlambatan
> gitu deh, biar adil. Detail angkanya nanti kita omongin lagi kalau
> sistemnya udah jalan — yang penting ada dulu mekanismenya."

**Catatan penting:** seperti klien pada umumnya, kebutuhan di atas TIDAK 100%
lengkap dan detail. Bagian yang ambigu (misalnya besaran denda pasti) SENGAJA
dibiarkan terbuka. Ambil keputusan desain yang masuk akal, lalu **tuliskan
asumsi kalian** — ini bagian dari nilai (lihat Deliverables).

---

## Ruang lingkup

- Backend REST API saja. Tidak perlu front-end.
- Tidak perlu login/autentikasi (menyusul Minggu 7). Anggap semua request
  datang dari admin yang sudah dipercaya.
- Database: MySQL, mengikuti pola Minggu 3 — koneksi lewat pool
  (`mysql2/promise`), SQL manual dengan **prepared statement**, TANPA ORM
  (Sequelize baru Minggu 4).
- Mengikuti struktur & pola project yang sudah ada: `routes/` → `controllers/`
  → `data/` (repository), validasi manual ala `src/utils/validate.js`,
  `asyncHandler` untuk setiap controller `async`.

---

## Entitas bisnis (dari sudut pandang klien)

Klien tidak peduli nama tabel/kolom di database kalian — itu keputusan
teknis kalian sendiri. Yang klien deskripsikan adalah "benda" dan
"kejadian" dalam bisnis mereka:

**Kendaraan** — satu unit motor/mobil yang disewakan. Punya: nama/model,
jenis (motor atau mobil), plat nomor (setiap unit harus punya plat nomor
yang tidak boleh sama dengan unit lain), tarif sewa per hari, dan status
saat ini (tersedia untuk disewa / sedang disewa / sedang diservis).

**Pelanggan** — orang yang menyewa. Punya: nama, nomor KTP (dipakai sebagai
identitas unik pelanggan — dua pelanggan tidak boleh terdaftar dengan KTP
yang sama), nomor HP.

**Transaksi sewa** — satu kejadian penyewaan: kendaraan yang mana, disewa
oleh siapa, mulai kapan, rencana kembali kapan, dan (setelah dikembalikan)
kapan benar-benar kembali, berapa total yang harus dibayar, dan berapa
dendanya kalau telat.

---

## Aturan bisnis (WAJIB — akan diuji satu per satu lewat Postman)

1. **Plat nomor kendaraan unik.** Mendaftarkan kendaraan dengan plat nomor
   yang sudah ada → **409**, bukan 400 (datanya valid, bentrok dengan yang
   sudah ada — pola yang sama seperti judul buku kembar di §15).
2. **Nomor KTP pelanggan unik.** Sama alasannya seperti di atas → **409**.
3. **Tidak bisa menyewa kendaraan yang sedang tidak tersedia.** Membuat
   transaksi baru untuk kendaraan berstatus "disewa" atau "servis" → **409**.
4. **Tanggal harus masuk akal.** Tanggal rencana kembali yang sama atau
   sebelum tanggal sewa → **400**.
5. **Transaksi baru otomatis mengubah status kendaraan.** Begitu transaksi
   berhasil dibuat, kendaraan yang bersangkutan berubah status jadi "sedang
   disewa" — TANPA request terpisah dari client untuk mengubah status
   kendaraan itu.
6. **Pengembalian kendaraan menghitung total biaya dan (kalau telat) denda,
   lalu mengembalikan status kendaraan ke "tersedia".** Ini butuh cara
   client memberi tahu server "kendaraan ini baru saja dikembalikan" —
   rancang endpoint-nya sendiri (bukan `PUT`/`PATCH` polos ke transaksi,
   karena ini sebuah AKSI/kejadian, bukan sekadar ganti field — pikirkan
   nama URL yang tetap terasa RESTful).
7. **Transaksi yang sudah selesai atau sudah dibatalkan tidak bisa
   dikembalikan atau dibatalkan lagi.** → **409**.
8. **Tidak bisa hapus kendaraan yang sedang berstatus "disewa".** → **409**
   (pola yang identik dengan Latihan 6 opsional di §19 — aturan "tidak boleh
   hapus buku yang masih berstok").
9. **Tidak bisa hapus pelanggan yang masih punya transaksi berstatus
   berjalan.** → **409**.
10. **Field yang DIHITUNG SERVER (status kendaraan, total biaya, denda,
    status transaksi) harus DIABAIKAN kalau client mengirimkannya lewat
    body request.** Ini bentuk mass assignment yang baru: bukan cuma field
    yang "tidak boleh ada", tapi field yang NILAINYA harus selalu dihitung
    ulang oleh server, tidak pernah dipercaya dari client — walau field itu
    "sah" secara nama.

---

## Kontrak API minimal yang harus disediakan

Rancang path dan nama field JSON kalian sendiri (boleh Bahasa Indonesia
seperti resource `buku`, atau Inggris — konsisten saja). Daftar di bawah ini
FUNGSInya yang wajib ada, bukan nama URL pastinya:

| Fungsi                          | Method    | Contoh path                                      | Catatan                                                                                                 |
| ------------------------------- | --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Daftar kendaraan, bisa difilter | GET       | `/kendaraan?status=&jenis=`                      | Sama gayanya dengan `?keyword=` di `buku`                                                               |
| Detail satu kendaraan           | GET       | `/kendaraan/:id`                                 | 404 kalau tidak ada                                                                                     |
| Tambah kendaraan                | POST      | `/kendaraan`                                     | Cek plat nomor kembar (aturan 1)                                                                        |
| Ubah data kendaraan             | PUT/PATCH | `/kendaraan/:id`                                 | Bebas pilih salah satu atau dua-duanya, dokumentasikan alasannya                                        |
| Hapus kendaraan                 | DELETE    | `/kendaraan/:id`                                 | Aturan 8                                                                                                |
| Daftar pelanggan                | GET       | `/pelanggan`                                     | —                                                                                                       |
| Detail satu pelanggan           | GET       | `/pelanggan/:id`                                 | 404 kalau tidak ada                                                                                     |
| Tambah pelanggan                | POST      | `/pelanggan`                                     | Cek KTP kembar (aturan 2)                                                                               |
| Hapus pelanggan                 | DELETE    | `/pelanggan/:id`                                 | Aturan 9                                                                                                |
| Buat transaksi sewa baru        | POST      | `/transaksi`                                     | Aturan 3, 4, 5, 10                                                                                      |
| Daftar transaksi, bisa difilter | GET       | `/transaksi?status=&kendaraan_id=&pelanggan_id=` | —                                                                                                       |
| Detail satu transaksi           | GET       | `/transaksi/:id`                                 | 404 kalau tidak ada                                                                                     |
| **Kembalikan** kendaraan (aksi) | —         | rancang sendiri                                  | Aturan 6, 7, 10                                                                                         |
| **Batalkan** transaksi (aksi)   | —         | rancang sendiri                                  | Aturan 7                                                                                                |
| Statistik ringkas               | GET       | `/transaksi/statistik`                           | Minimal: jumlah transaksi per status, total pendapatan dari transaksi selesai. Ingat urutan route (§6)! |

Untuk dua baris "rancang sendiri": pikirkan baik-baik apakah ini `PUT`,
`PATCH`, `POST` ke sub-path, atau sesuatu yang lain. Tidak ada satu jawaban
"benar" tunggal — yang dinilai adalah KONSISTENSI dan alasan yang bisa kalian
jelaskan, sama seperti diskusi PUT vs PATCH di §8.

---

## Batasan teknis (non-fungsional)

- Repository terpisah dari controller, seperti `src/data/buku.js` —
  controller TIDAK BOLEH memanggil `pool.query(...)` langsung.
- Semua nilai dari `req.body`/`req.params`/`req.query` yang masuk ke SQL
  lewat placeholder `?` — tidak ada template literal SQL (§13).
- Semua controller `async` dibungkus `asyncHandler` di file routes (§16).
- Validasi bentuk data (tipe, wajib/opsional, rentang) tetap lewat pola
  `validate()` seperti `aturanBuku` — bukan `if` bertumpuk di controller.
- Tidak memakai Sequelize/ORM apa pun. Tidak memakai package tambahan di
  luar yang sudah ada di `package.json`, kecuali kalian benar-benar butuh
  dan bisa jelaskan alasannya.

---

## Deliverables yang dikumpulkan

1. **Kode sumber** — route/controller/repository baru untuk `kendaraan`,
   `pelanggan`, dan `transaksi`, mengikuti struktur folder yang sudah ada.
2. **Skema database** — file `.sql` baru (boleh `sql/schema-rental.sql` +
   `sql/seed-rental.sql` terpisah, atau digabung ke `schema.sql`/`seed.sql`
   yang sudah ada — keputusan kalian), dan pastikan `npm run db:migrate`
   tetap berfungsi untuk membuat semuanya dari nol.
3. **Koleksi Postman** — folder baru (misalnya "4 - Rental") di collection
   yang sudah ada, atau collection terpisah. Setiap ATURAN BISNIS di atas
   (10 aturan) harus punya minimal satu request dengan assertion yang
   membuktikannya (skenario sukses DAN skenario gagalnya).
4. **Catatan asumsi** — bagian baru di `README.md` atau file `ASUMSI.md`,
   berisi keputusan desain yang kalian ambil untuk hal yang ambigu di
   cerita klien (contoh: berapa besar denda per hari telat, dan kenapa).
   Ini WAJIB, bukan bonus.

---

## Kriteria penilaian

| Kriteria                                    | Bobot | Nilai penuh berarti                                                                                                                         |
| ------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Kebenaran aturan bisnis (10 aturan di atas) | 35%   | Semua status code & efek sampingnya (perubahan status kendaraan, perhitungan denda) benar                                                   |
| Desain API & konsistensi                    | 20%   | Nama resource, method, status code konsisten dengan pola `buku`; keputusan desain (endpoint aksi, PUT vs PATCH) masuk akal & terdokumentasi |
| Struktur & keamanan kode                    | 20%   | Repository pattern, prepared statement di semua query, tidak ada mass assignment (termasuk field terhitung)                                 |
| Koleksi Postman                             | 15%   | Semua 10 aturan bisnis teruji, assertion jelas, jalan hijau lewat Runner                                                                    |
| Dokumentasi asumsi                          | 10%   | Asumsi yang diambil masuk akal dan dijelaskan alasannya, bukan sekadar "terserah saya"                                                      |

### Yang mengurangi nilai

- SQL ditempel manual (template literal) alih-alih placeholder `?`
- Status kendaraan/total biaya/denda bisa "dipaksa" lewat body request client
- Logika bisnis (pengecekan status, hitung denda) ditulis di file `routes/`
- Tidak ada penanganan kalau tanggal/angka yang dikirim client bukan format yang valid
- Tidak ada `README`/catatan asumsi sama sekali

Tenggat: sesuai kalender kelas kalian — cek pengumuman terpisah.
