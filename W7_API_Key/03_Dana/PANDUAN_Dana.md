# Dana — Tahap 3: Validasi key, paket dan kuota

**Prasyarat:** Kenneth menyediakan model/database, Bryan menyediakan key dan konfigurasi paket. **Target:** hanya pemegang key yang valid dan paket yang sesuai dapat memakai endpoint partner dalam batas yang ditentukan.

## File yang menjadi tanggung jawab

| File | Status terhadap W7 |
|---|---|
| `src/middlewares/verifyApiKey.js` | Baru |
| `src/middlewares/checkApiLevel.js` | Baru |
| `src/middlewares/limitApiUsage.js` | Baru |
| `src/services/apiUsage.js` | Baru |

## Kontrak aturan pemakaian


| Paket | Harga simulasi | Kuota harian | Batas per menit | Fitur |
|---|---:|---:|---:|---|
| Basic | Rp0 | 100 | 10 | Ringkasan buku |
| Premium | Rp99.000/bulan | 10.000 | 100 | Ringkasan dan analitik |

Batas menggunakan **jendela menit kalender dan hari kalender UTC**. Hari UTC dimulai pukul 07.00 WIB. Kuota melekat pada pengguna, sehingga regenerate key tidak mereset pemakaian. Respons 401/403/429 sebelum reservasi tidak dihitung. Request yang sudah memperoleh slot tetap dihitung, termasuk jika controller kemudian gagal atau koneksi client terputus. Endpoint JWT pengelolaan key tidak memakai kuota partner.


## Langkah 1 — verifyApiKey

`verifyApiKey.js` membaca header `X-API-Key`, memvalidasi format, meng-hash raw key, lalu mencari pengguna berdasarkan hash. Header hilang, format salah, atau hash tidak ditemukan menghasilkan 401. Middleware menyiapkan `req.apiClient` berisi ID, level, dan hash internal. Jangan mengirim objek internal ini ke client.

Header yang benar:

```http
X-API-Key: bd_live_<64-karakter-hex-dari-generate>
```

JWT sendiri tidak memberi akses partner karena JWT dipakai untuk pengelolaan akun. Key yang dikirim dalam URL/query tidak digunakan.

## Langkah 2 — checkApiLevel

`checkApiLevel("ringkasan")` menerima Basic dan Premium. `checkApiLevel("analitik")` menerima Premium. Daftar fitur berasal dari `apiPlans.js`. Kegagalan mengembalikan 403 sebelum reservasi kuota, sehingga Basic yang mencoba analitik tidak kehilangan satu slot.

## Langkah 3 — Reservasi kuota dalam transaksi

Pengecekan `COUNT` lalu `INSERT` tanpa lock memiliki race condition: dua request bisa sama-sama melihat satu slot tersisa. Implementasi final `services/apiUsage.js` menggunakan transaksi READ COMMITTED dan row lock pada pengguna:

```js
      // Lock satu akun: dua request bersamaan tidak bisa mengambil slot terakhir.
      const user = await Pengguna.unscoped().findByPk(penggunaId, {
        transaction, lock: transaction.LOCK.UPDATE });
      // Cek ulang setelah lock untuk menangani rotasi key / perubahan paket.
      if (!user || user.api_key !== keyHash) return { error: 401, code: "INVALID_API_KEY" };
      const plan = API_PLANS[user.api_level];
      if (!plan || !plan.features.includes(feature)) return { error: 403, code: "PLAN_FORBIDDEN" };
```

Setelah memperoleh lock, service mengecek ulang hash dan paket. Ini mencegah request yang belum memperoleh slot tetap memakai key yang baru dicabut atau paket yang baru diturunkan. Semua request akun yang sama mengantre pada lock yang sama, termasuk ketika beberapa proses aplikasi memakai database yang sama.

Service membaca `UTC_TIMESTAMP(3)` dari database setelah lock, menentukan awal hari/menit UTC, menghitung `api_log` pengguna, lalu membuat log sebagai reservasi slot sebelum transaksi selesai. Transaksi berikutnya melihat reservasi tersebut. Kuota melekat pada ID pengguna, sehingga regenerasi key tidak mengembalikan kuota.

- Kuota harian habis: 429 `DAILY_QUOTA_EXCEEDED`.
- Rate per menit habis: 429 `RATE_LIMIT_EXCEEDED`.
- Kedua jenis 429 menyertakan header `Retry-After` dalam detik.
- Reset menit memakai awal menit kalender berikutnya, bukan rolling window 60 detik. Request pada batas dua menit dapat membentuk burst lebih dari limit dalam rentang 60 detik.
- Timestamp menggunakan jam database, sehingga tidak bergantung pada jam masing-masing server aplikasi.

## Langkah 4 — Header dan status log

`limitApiUsage.js` mengirim `X-API-Level`, `X-Daily-Remaining`, dan `X-RateLimit-Remaining`. Header sisa kuota menunjukkan hasil reservasi request tersebut, sehingga respons paralel dapat tiba tidak berurutan.

Log mencatat path tanpa query string, method dan waktu. Setelah respons selesai, event `finish` memperbarui `status_code`. Event `close` menandai 499 jika koneksi putus sebelum respons selesai. Nilai 499 hanya penanda log internal. Pembaruan status dilakukan setelah respons, sehingga ada jeda singkat sebelum terlihat di SQLyog. Apabila proses mati atau update status gagal, baris dapat tetap NULL tetapi slot kuotanya sudah tercatat.

## Langkah 5 — Urutan pemasangan

Rafael memasang pada route yang dikenal saja:

```js
verifyApiKey
checkApiLevel("ringkasan")
limitApiUsage
ringkasan
```

Dalam Express 4, middleware async wajib dibungkus `asyncHandler`. Route final telah melakukannya. Request ke path yang tidak dikenal tidak membuat log reservasi karena middleware tidak dipasang global pada seluruh prefix.

## Langkah 6 — Bukti pengujian

Jalankan pengujian Rafael. Kasus penting: 11 request Basic bersamaan memberikan tepat 10 respons 200 dan satu 429. Premium meloloskan 12 request dalam satu menit. Fixture 100 log hari ini menolak request Basic berikutnya dengan 429 harian. Test juga memastikan 403 fitur tidak menambah jumlah log dan regenerate tidak menghapus log.

Untuk volume besar, COUNT pada log dan penguncian satu akun menjadi batas performa. Praktikum ini memilih konsistensi dengan MySQL yang sudah dipakai W7. Tahap produksi dapat memisahkan counter kuota dan audit log serta menerapkan retensi log tanpa menghapus penggunaan periode berjalan.


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
