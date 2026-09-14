/**
 * "DATABASE" MINGGU 2 — sebuah array biasa di memori.
 *
 * Kenapa bukan MySQL? Karena minggu ini fokusnya HTTP dan struktur project.
 * Menambah database sekarang berarti kalian harus belajar dua hal sulit
 * sekaligus, dan ketika ada error kalian tidak tahu harus menyalahkan yang mana.
 *
 * Konsekuensinya jujur saja: data hilang setiap kali server restart.
 * Minggu 3 memperbaikinya, dan endpoint-nya TIDAK akan berubah sedikit pun.
 * Itu justru pelajarannya.
 */
let buku = [
  {
    id: 1,
    judul: "Jojo's Bizarre Adventure",
    penulis: "Hirohiko Araki",
    tahun_terbit: 1987,
    harga: 120000,
    stok: 8,
    kategori: "komik",
    karakter: [
      { id: 1, nama: "Jotaro Kujo", peran: "protagonis" },
      { id: 2, nama: "Dio Brando", peran: "antagonis" },
      { id: 3, nama: "Giorno Giovanna", peran: "protagonis" },
    ],
  },
  {
    id: 2,
    judul: "Harry Potter and the Philosopher's Stone",
    penulis: "J.K. Rowling",
    tahun_terbit: 1997,
    harga: 95000,
    stok: 15,
    kategori: "novel",
    karakter: [
      { id: 1, nama: "Harry Potter", peran: "protagonis" },
      { id: 2, nama: "Hermione Granger", peran: "protagonis" },
    ],
  },
  {
    id: 3,
    judul: "Laskar Pelangi",
    penulis: "Andrea Hirata",
    tahun_terbit: 2005,
    harga: 78000,
    stok: 0,
    kategori: "novel",
    karakter: [{ id: 1, nama: "Ikal", peran: "protagonis" }],
  },
  {
    id: 4,
    judul: "Bumi Manusia",
    penulis: "Pramoedya Ananta Toer",
    tahun_terbit: 1980,
    harga: 110000,
    stok: 4,
    kategori: "novel",
    karakter: [{ id: 1, nama: "Minke", peran: "protagonis" }],
  },
  {
    id: 5,
    judul: "Filosofi Teras",
    penulis: "Henry Manampiring",
    tahun_terbit: 2018,
    harga: 88000,
    stok: 22,
    kategori: "non-fiksi",
    karakter: [],
  },
];

/**
 * Kenapa diekspor lewat objek, bukan `module.exports = buku`?
 *
 * Karena operasi seperti DELETE membuat array BARU (hasil .filter()).
 * Kalau kita mengekspor array-nya langsung, controller memegang referensi
 * ke array LAMA dan perubahan tidak pernah terlihat.
 *
 * Dengan objek pembungkus, controller selalu membaca `store.buku`
 * yang terbaru. Ini jebakan JavaScript yang halus dan sering memakan waktu
 * satu jam untuk ditemukan.
 */
const store = { buku };

module.exports = store;
