/**
 * ROUTES BUKU
 * ===========
 *
 * File ini hanya menjawab satu pertanyaan: URL mana memanggil fungsi mana.
 * Tidak boleh ada logika bisnis di sini. Kalau kalian melihat `if` atau
 * `.filter()` di file routes, itu tanda ada yang salah tempat.
 *
 * Baca file ini dari atas ke bawah dan kalian langsung tahu
 * SELURUH permukaan API untuk resource buku. Itulah gunanya dipisah.
 */

const express = require("express");
const router = express.Router();
const methodNotAllowed = require("../middlewares/methodNotAllowed");

const {
  queryBuku,
  statistikBuku,
  getSingleBuku,
  getKarakter,
  storeBuku,
  updateBuku,
  patchBuku,
  deleteBuku,
  bukuTermurah,
  bukuPerKategori,
  storeKarakter,
  updateKarakter,
  deleteKarakter,
} = require("../controllers/buku");

/* ==================================================================
 * BAGIAN 1 — SATU URL, BANYAK METHOD
 * ==================================================================
 *
 * Inilah inti REST: URL menunjuk BENDA (resource),
 * method menunjuk PERBUATAN terhadap benda itu.
 *
 *     GET  /api/v1/buku   -> "tunjukkan daftar buku"
 *     POST /api/v1/buku   -> "tambahkan buku ke daftar"
 *
 * Alamatnya sama persis. Yang berbeda kata kerjanya.
 * Ini disebut ROUTING BERDASARKAN METHOD (method-based routing),
 * dan ini perilaku bawaan HTTP — bukan trik Express.
 *
 * `.route()` membuat hal itu terbaca jelas dalam satu blok.
 * Alternatifnya menulis router.get("/") dan router.post("/") terpisah;
 * hasilnya identik, hanya kurang enak dibaca.
 */
router
  .route("/")
  .get(queryBuku)     // GET    /api/v1/buku
  .post(storeBuku)    // POST   /api/v1/buku
  .all(methodNotAllowed("GET", "POST"));
//   ^^^^
//   .all() menangkap SEMUA method lain pada path yang sama.
//   Tanpa baris ini, DELETE /api/v1/buku jatuh ke notFound -> 404.
//   Padahal alamatnya jelas ada; yang salah methodnya -> 405.

/* ==================================================================
 * BAGIAN 2 — URUTAN ROUTE ITU MENENTUKAN
 * ==================================================================
 *
 * Express mencocokkan route DARI ATAS KE BAWAH, dan berhenti
 * pada yang pertama cocok.
 *
 * "/statistik" dan "/:bukuId" sama-sama cocok dengan URL /api/v1/buku/statistik.
 * Kalau "/:bukuId" ditulis lebih dulu, maka:
 *
 *     GET /api/v1/buku/statistik
 *       -> cocok dengan /:bukuId
 *       -> req.params.bukuId = "statistik"
 *       -> Number("statistik") = NaN
 *       -> cariBuku(NaN) = undefined
 *       -> 404 "Buku dengan id statistik tidak ditemukan"
 *
 * Errornya menyesatkan karena tidak ada yang salah dengan controller.
 * Yang salah URUTANNYA.
 *
 * ATURAN: route spesifik (teks tetap) SELALU di atas route berparameter.
 *
 * Silakan coba sendiri: pindahkan blok /:bukuId ke atas blok ini,
 * restart, lalu panggil /api/v1/buku/statistik. Lihat apa yang terjadi.
 */
router.route("/statistik").get(statistikBuku).all(methodNotAllowed("GET"));


router
  .route("/termurah")
  .get(bukuTermurah)
  .all(methodNotAllowed("GET"));


  


/* ==================================================================
 * BAGIAN 3 — NESTED RESOURCE
 * ==================================================================
 *
 * Karakter tidak punya arti berdiri sendiri, jadi URL-nya bersarang.
 * Tanda tanya pada :karakterId? berarti parameter itu OPSIONAL:
 *
 *     GET /api/v1/buku/1/karakter      -> semua karakter buku 1
 *     GET /api/v1/buku/1/karakter/2    -> karakter nomor 2 saja
 *
 * Satu route, dua kegunaan. Controller memeriksa apakah karakterId ada.
 *
 * CATATAN VERSI: sintaks `:param?` ini berlaku di Express 4.
 * Express 5 memakai path-to-regexp versi baru dan menuliskannya berbeda.
 * Project ini sengaja memakai Express 4 agar cocok dengan materi referensi.
 */
router
  .route("/:bukuId/karakter/:karakterId?")
  .get(getKarakter)
  .all(methodNotAllowed("GET"));
router
  .route("/:bukuId/karakter")
  .get(getKarakter)
  .post(storeKarakter)
  .all(methodNotAllowed("GET", "POST"));

router
  .route("/:bukuId/karakter/:karakterId")
  .get(getKarakter)
  .put(updateKarakter)
  .delete(deleteKarakter)
  .all(methodNotAllowed("GET", "PUT", "DELETE"));
/* ==================================================================
 * BAGIAN 4 — SATU RESOURCE, EMPAT PERBUATAN
 * ==================================================================
 *
 * Sekali lagi: satu alamat, empat fungsi berbeda, dipilih oleh method.
 *
 *     GET    /api/v1/buku/1  -> baca
 *     PUT    /api/v1/buku/1  -> ganti SELURUHNYA
 *     PATCH  /api/v1/buku/1  -> ubah SEBAGIAN
 *     DELETE /api/v1/buku/1  -> hapus
 *
 * Bandingkan dengan gaya lama yang masih sering terlihat:
 *
 *     GET /api/getBuku?id=1
 *     GET /api/updateBuku?id=1&judul=xxx
 *     GET /api/deleteBuku?id=1        <-- GET yang menghapus data!
 *
 * Yang terakhir berbahaya sungguhan. GET seharusnya AMAN (tidak mengubah
 * apa pun). Browser, crawler, dan proxy bebas memanggil URL GET kapan saja
 * untuk prefetch. Kalau GET menghapus data, data kalian bisa terhapus
 * tanpa ada manusia yang menekan tombol.
 */
router
  .route("/:bukuId")
  .get(getSingleBuku)
  .put(updateBuku)
  .patch(patchBuku)
  .delete(deleteBuku)
  .all(methodNotAllowed("GET", "PUT", "PATCH", "DELETE"));


module.exports = router;
