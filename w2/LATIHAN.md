# Jawaban Latihan — [Bryan Marvel] / [224180591]

## Latihan 1 — Rasakan bug-nya
| No | Pesan error | Penyebab |
|---|---|---|
| 1 |{ "msg": "Body kosong", "periksa": [ "app.use(express.json()) sudah ada di index.js?", "Di Postman: Body -> raw -> JSON (bukan Text)?" ] } | Tidak bisa menemukan .jsonnya  |
| 2 | { "msg": "Buku dengan id 1 tidak ditemukan" } | pencarian buku tidak ada |
| 3 | { "msg": "Buku dengan id 999 tidak ditemukan" } |Buku tidak menemukan idnya, jadi error 404 |
| 4 | judul terganti | AssertionError: expected undefined to deeply equal 'Dune Messiah'
| tidak bisa menangkap parameter buku |

## Latihan 2 

{
    "total": 3,
    "limit": 0,
    "offset": 0,
    "data": [
        {
            "id": 2,
            "judul": "Harry Potter and the Philosopher's Stone",
            "penulis": "J.K. Rowling",
            "harga": 95000,
            "stok": 15
        },
        {
            "id": 3,
            "judul": "Laskar Pelangi",
            "penulis": "Andrea Hirata",
            "harga": 78000,
            "stok": 0
        },
        {
            "id": 4,
            "judul": "Bumi Manusia",
            "penulis": "Pramoedya Ananta Toer",
            "harga": 110000,
            "stok": 4
        }
    ]
}

## Latihan 4 — Kenapa 409 dan bukan 400?
Karena buku dengan stok lebih dari dihapus, karena itu adalah pengecekan yang menjadi 409 dan bukan 400. 400 biasanya adalah bad request dimana input itu salah kata dan tidak bisa di lihat oleh code.

## Latihan 8 — Refleksi
### 1. Kenapa `?keyword=zzz` 200 tapi `/buku/999` 404?
karena ada pencarian ke daftar buku yang request, tapi hasil pencarian hasilnya yang kosong jadi datanya kosong. tetapi jika /buku/999 adalah hal yang spesifik jadi 404 eerror.


### 2. Kenapa hapus buku berstok itu 409?
Karena buku tersebut ada dan datanya valid, tetapi kondisi bisnisnya tidak mengizinkan penghapusan saat stok masih > 0. 

### 3. Kalau pindah ke MySQL, file mana yang berubah?
Yang berubah paling mungkin hanya file data buku.js dan karena postman dan isi struktur route tidak berubah serta antarmuka HTTP yang sudah dirancang sejak awal.

### 4. Apa yang berlebihan dari project ini?
