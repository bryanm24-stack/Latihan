

## 1. Denda Keterlambatan

Denda keterlambatan ditetapkan sebesar Rp50.000 per hari.

Denda dihitung berdasarkan selisih antara tanggal rencana kembali
dan tanggal kendaraan benar-benar dikembalikan.

Jika kendaraan dikembalikan tepat waktu atau lebih awal,
denda bernilai Rp0.

Contoh:

Rencana kembali : 23 September 2026
Tanggal kembali : 25 September 2026
Terlambat        : 2 hari

Denda:
2 x Rp50.000 = Rp100.000


## 2. Perhitungan Lama Sewa

Lama sewa dihitung berdasarkan selisih hari antara tanggal sewa
dan tanggal kendaraan dikembalikan.

Minimal lama sewa adalah 1 hari.

Contoh:

Tanggal sewa    : 20 September 2026
Tanggal kembali : 25 September 2026

Lama sewa = 5 hari


## 3. Perhitungan Total Biaya

Total biaya dihitung oleh server dengan rumus:

Total biaya =
(lama sewa x tarif per hari) + denda

Contoh:

Tarif kendaraan : Rp100.000/hari
Lama sewa       : 5 hari
Denda            : Rp100.000

Biaya sewa:
5 x Rp100.000 = Rp500.000

Total:
Rp500.000 + Rp100.000 = Rp600.000


## 4. Status Kendaraan Baru

Setiap kendaraan yang baru didaftarkan otomatis memiliki status:

tersedia

Client tidak diperbolehkan menentukan status kendaraan melalui body request.


## 5. Status Transaksi Baru

Setiap transaksi sewa yang berhasil dibuat otomatis memiliki status:

berjalan

Setelah transaksi dibuat, kendaraan yang digunakan otomatis berubah
dari:

tersedia

menjadi:

disewa


## 6. Pengembalian Kendaraan

Pengembalian kendaraan dianggap sebagai aksi bisnis, sehingga digunakan endpoint:

POST /api/v1/transaksi/:id/pengembalian

Body request hanya berisi tanggal kendaraan benar-benar dikembalikan.

Contoh:

{
  "tanggal_kembali": "2026-09-25"
}

Saat pengembalian berhasil:

- transaksi berubah menjadi `selesai`
- total biaya dihitung oleh server
- denda dihitung oleh server
- kendaraan berubah menjadi `tersedia`


## 7. Pembatalan Transaksi

Pembatalan dianggap sebagai aksi bisnis, sehingga digunakan endpoint:

POST /api/v1/transaksi/:id/pembatalan

Pembatalan tidak membutuhkan body request.

Jika transaksi berhasil dibatalkan:

- status transaksi menjadi `dibatalkan`
- kendaraan kembali menjadi `tersedia`


## 8. Transaksi yang Sudah Diproses

Transaksi dengan status:

- selesai
- dibatalkan

tidak dapat dikembalikan atau dibatalkan lagi.

Percobaan tersebut menghasilkan HTTP 409 Conflict.


## 9. Field yang Ditentukan Server

Field berikut tidak dipercaya dari data yang dikirim client:

- status kendaraan
- status transaksi
- total_biaya
- denda

Walaupun client mengirim field tersebut melalui body request,
server akan mengabaikannya dan menentukan nilainya sendiri.


## 10. Kendaraan Servis

Kendaraan dengan status `servis` dianggap tidak tersedia untuk disewa.

Pembuatan transaksi menggunakan kendaraan berstatus `servis`
menghasilkan HTTP 409 Conflict.


## 11. Penghapusan Data

Kendaraan yang sedang berstatus `disewa` tidak dapat dihapus.

Pelanggan yang masih mempunyai transaksi dengan status `berjalan`
juga tidak dapat dihapus.

Kedua kondisi tersebut menghasilkan HTTP 409 Conflict.