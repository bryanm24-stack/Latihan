/**
 * CONTROLLER CONTOH
 * =================
 * Bukan bagian dari resource buku. Ini "laboratorium" untuk memahami
 * TIGA TEMPAT data masuk ke service kita. Pahami ini dulu sebelum
 * menyentuh controller buku.
 */

/* ------------------------------------------------------------------
 * 1. req.query  -> setelah tanda ? di URL
 *    GET /api/v1/contoh?nama=jojo&umur=40&jk=L
 *
 *    Dipakai untuk: filter, pencarian, paging, sorting.
 *    Ciri: opsional, boleh dikombinasikan bebas.
 * ------------------------------------------------------------------ */
const contohQuery = (req, res) => {
  console.log("req.query =", req.query);

  const { nama, umur, jk } = req.query;

  // JEBAKAN NOMOR SATU DI MINGGU 2:
  // semua yang datang lewat HTTP itu STRING. Selalu.
  console.log("tipe umur:", typeof umur); // selalu "string"

  // Hati-hati, ini sering salah dijelaskan.
  // `umur < 45` sebenarnya AMAN: kalau salah satu sisi angka,
  // JavaScript mengubah string menjadi angka dulu. "100" < 45 -> false. Benar.
  //
  // Yang BENAR-BENAR menggigit ada tiga:

  // (a) operator + menyambung teks, bukan menjumlah
  const tahunDepan = umur + 1;            // "40" + 1 -> "401"  BUKAN 41
  const tahunDepanBenar = Number(umur) + 1;

  // (b) membandingkan DUA nilai dari HTTP -> dua-duanya string
  //     -> perbandingan menjadi alfabetis, bukan numerik
  const { min, max } = req.query;         // coba ?min=100&max=45
  const bandingSalah = min < max;         // "100" < "45"  -> true  (!!)
  const bandingBenar = Number(min) < Number(max);

  // (c) === tidak mengonversi apa pun
  const samaDenganKetat = umur === 40;    // "40" === 40 -> selalu false

  return res.status(200).json({
    diterima: req.query,
    tipe_umur: typeof umur,
    a_penjumlahan: { salah: tahunDepan, benar: tahunDepanBenar },
    b_perbandingan_dua_string: { salah: bandingSalah, benar: bandingBenar },
    c_strict_equal: { "umur === 40": samaDenganKetat },
    catatan:
      "Selalu Number() sebelum menjumlah, membandingkan dua parameter, atau memakai ===",
  });
};

/* ------------------------------------------------------------------
 * 2. req.params -> bagian dari jalur URL itu sendiri
 *    GET /api/v1/contoh/jojo/umur/40/jk/L
 *
 *    Dipakai untuk: MENUNJUK resource mana yang dimaksud.
 *    Ciri: wajib (kecuali diberi tanda ?), dan merupakan identitas.
 * ------------------------------------------------------------------ */
const contohParams = (req, res) => {
  console.log("req.params =", req.params);

  let { nama, umur, jk } = req.params;

  // jk memakai tanda ? di route, jadi boleh tidak ada.
  // Pola `x || nilaiDefault` adalah cara ringkas memberi nilai cadangan.
  jk = jk || "Tidak Tahu";

  return res.status(200).json({ nama, umur: Number(umur), jk });
};

/* ------------------------------------------------------------------
 * 3. req.body -> isi kiriman, tidak terlihat di URL
 *    POST /api/v1/contoh  dengan body JSON
 *
 *    Dipakai untuk: data yang dibuat atau diubah.
 *    Ciri: bisa besar, bisa bersarang, tidak muncul di log/riwayat browser.
 * ------------------------------------------------------------------ */
const contohPost = (req, res) => {
  console.log("req.body =", req.body);

  // Kalau ini undefined, penyebabnya HAMPIR SELALU salah satu dari dua:
  //   a) express.json() belum dipasang di index.js
  //   b) di Postman, Body masih "Text", belum diubah ke "JSON"
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      msg: "Body kosong",
      periksa: [
        "app.use(express.json()) sudah ada di index.js?",
        "Di Postman: Body -> raw -> JSON (bukan Text)?",
      ],
    });
  }

  return res.status(200).json({ diterima: req.body });
};

/* ------------------------------------------------------------------
 * 4. Ketiganya sekaligus, supaya perbedaannya terlihat berdampingan.
 *    PUT /api/v1/contoh/gabungan/7?draft=true
 *    body: { "judul": "Halo" }
 * ------------------------------------------------------------------ */
const contohGabungan = (req, res) => {
  return res.status(200).json({
    params: req.params,   // dari jalur URL   -> "yang mana"
    query: req.query,     // setelah tanda ?  -> "bagaimana caranya"
    body: req.body,       // isi kiriman      -> "datanya apa"
    method: req.method,
    path: req.originalUrl,
  });
};

/* ------------------------------------------------------------------
 * 5. Review array function dari Minggu 1.
 *    Semua controller buku dibangun dari empat fungsi ini.
 * ------------------------------------------------------------------ */
const contohArrayFunction = (req, res) => {
  const arr1 = [
    { nama: "jojo", umur: 40 },
    { nama: "giorno", umur: 100 },
    { nama: "jolyne", umur: 50 },
  ];

  // map    -> ubah setiap elemen, jumlahnya tetap
  const contohMap = arr1.map((item) => `${item.nama} berumur ${item.umur}`);

  // find   -> elemen PERTAMA yang cocok, atau undefined
  const contohFind = arr1.find((item) => item.nama.includes("jo"));

  // filter -> SEMUA yang cocok, selalu array (bisa kosong)
  const contohFilter = arr1.filter((item) => item.nama !== "giorno");

  // reduce -> peras array menjadi satu nilai
  const palingTua = arr1.reduce(
    (max, item) => (item.umur > max.umur ? item : max),
    { nama: "", umur: 0 }
  );

  return res.status(200).json({
    contohMap,
    contohFind,
    contohFilter,
    palingTua,
    catatan:
      "find mengembalikan objek atau undefined. filter mengembalikan array, mungkin kosong. Tertukar = 'Cannot read property of undefined'.",
  });
};

module.exports = {
  contohQuery,
  contohParams,
  contohPost,
  contohGabungan,
  contohArrayFunction,
};
