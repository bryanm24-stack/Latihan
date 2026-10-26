/**
 * CONTROLLER CONTOH AXIOS — MINGGU 6
 * ==================================
 *
 * Selama lima minggu service kita hanya MELAYANI. Minggu ini ia juga
 * MENGINJAK -- memanggil API orang lain (Kitsu), dan itu mengubah
 * sesuatu yang fundamental: sekarang ada dependensi yang tidak kita
 * kendalikan, tidak bisa kita perbaiki, dan tidak bisa kita percepat.
 *
 * Tiga pelajaran di controller ini, berurutan:
 *
 *   1. KONTRAK MILIK KITA -- response Kitsu tidak diteruskan mentah.
 *      Kita memilih delapan field, dan consumer HANYA bergantung pada
 *      delapan field itu. Kalau Kitsu mengubah payload-nya besok, yang
 *      kita perbaiki satu tempat di sini.
 *
 *   2. NULL-SAFE -- field opsional upstream (trailer, rating, jumlah
 *      episode sering null) tidak boleh menjatuhkan service kita.
 *      `?.` dan `?? null` ada untuk data yang bukan buatan kita.
 *
 *   3. GAGAL DENGAN SOPAN -- upstream timeout -> 504, upstream error ->
 *      502, kesalahan kita -> 500. Dan TIDAK PERNAH menunggu selamanya:
 *      `timeout: 5000` wajib.
 */
const axios = require("axios");
const { kirimNotifikasi } = require("../utils/notifikasi");

/**
 * Upstream bisa dioverride lewat .env (UPSTREAM_ANIME=...) --
 * berguna untuk demonstrasi 504/502 dengan upstream yang sengaja
 * salah/lambat, tanpa menunggu upstream asli yang sedang error.
 */
const UPSTREAM = process.env.UPSTREAM_ANIME || "https://kitsu.io/api/edge/anime";

/**
 * KONTRAK FIELD -- daftar ini adalah perjanjian kita dengan consumer.
 * Test Postman "returns only the fields we promised" menegakkannya.
 * Field di luar daftar ini TIDAK BOLEH bocor ke response -- itu pula
 * yang membuat upstream bebas mengubah payload-nya sendiri.
 *
 * Nama fieldnya sengaja NETRAL terhadap upstream ("title", bukan
 * "canonicalTitle") supaya suatu hari berganti API pun kontrak tidak
 * berubah. Inilah bedanya antarmuka dan implementasi.
 */
const KONTRAK_ANIME = ["mal_id", "url", "title", "trailer", "type", "episodes", "status", "rating"];

/**
 * Upstream -> kontrak kita. Satu-satunya tempat yang tahu bentuk
 * payload Kitsu: data[i].attributes (JSON:API).
 */
const petakanKeKontrak = (item) => ({
  mal_id: item.id,
  url: `https://kitsu.io/anime/${item.attributes?.slug ?? item.id}`,
  title: item.attributes?.canonicalTitle ?? null,
  // Tidak semua anime punya trailer. `youtubeVideoId` tanpa `?.` =
  // "Cannot read property ... of null" -> 500 untuk data yang bukan
  // salah kita. Optional chaining + nullish coalescing: ?. dan ?? null.
  trailer: item.attributes?.youtubeVideoId
    ? `https://youtu.be/${item.attributes.youtubeVideoId}`
    : null,
  type: item.attributes?.subtype ?? null,
  episodes: item.attributes?.episodeCount ?? null,
  status: item.attributes?.status ?? null,
  rating: item.attributes?.ageRating ?? null,
});

/**
 * Susun parameter untuk Kitsu dari query consumer.
 *
 * Consumer kita mengirim ?q= &limit= -- NAMA MILIK KITA. Nama parameter
 * upstream (filter[text], page[limit]) disembunyikan di sini. Kalau
 * besok upstream ganti nama parameternya, consumer TIDAK ikut rusak.
 */
const susunParams = ({ q, limit, page }) => {
  const params = { "page[limit]": Math.min(Number(limit) || 3, 20) };
  if (page) params["page[offset]"] = (Number(page) - 1) * Number(params["page[limit]"] || 3);
  if (q) {
    params["filter[text]"] = q;
  } else {
    params.sort = "-userCount"; // tanpa kata kunci -> anime paling populer
  }
  return params;
};

/* ================================================================== */
/* GET /api/v1/contohAxios?q=jojo&limit=3                              */
/* ================================================================== */
const queryAnime = async (req, res) => {
  let perintah;

  try {
    for (let percobaan = 1; percobaan <= 2; percobaan++) {
      try {
        perintah = await axios.get(UPSTREAM, {
          // HANYA parameter yang kita kenali yang diteruskan -- field
          // query asing dari consumer dibuang (prinsip yang sama dengan
          // pertahanan mass assignment, tapi untuk query string).
          params: susunParams(req.query),

          // WAJIB. Tanpa timeout, axios menunggu SELAMANYA -- upstream
          // yang menggantung memegang request kita terbuka, cukup banyak
          // request menggantung dan service kita berhenti menjawab
          // siapa pun. Outage yang bukan salah kita, tapi yang kita
          // tanggung.
          timeout: 5000,
        });
        break; // berhasil -- keluar dari loop retry
      } catch (upstream) {
        const bolehUlangi =
          percobaan < 2 && upstream.response && upstream.response.status >= 500;
        if (!bolehUlangi) throw upstream;
        console.warn(`[contohAxios] upstream ${upstream.response.status}, coba ulang...`);
        await new Promise((selesai) => setTimeout(selesai, 1000)); // jeda 1 detik
      }
    }

    const data = perintah.data.data; // axios membungkus di .data, Kitsu juga
    const hasil = data.map(petakanKeKontrak);

    return res.status(200).json({ total: hasil.length, data: hasil });
  } catch (error) {
    // Gagal memanggil upstream BUKAN 500-nya kita. Bedakan tiga situasi:
    if (error.code === "ECONNABORTED") {
      // timeout yang kita pasang sendiri meledak
      return res
        .status(504)
        .json({ msg: "Layanan pihak ketiga tidak merespon" });
    }
    if (error.response) {
      // upstream MENJAWAB, tapi dengan error (4xx/5xx)
      console.error("[contohAxios] upstream:", error.response.status, error.response.data);
      if (error.response.status === 429) {
        // rate limit upstream -- teruskan pesannya ke consumer
        return res
          .status(429)
          .json({ msg: "Terlalu banyak request ke layanan pihak ketiga" });
      }
      return res
        .status(502)
        .json({ msg: "Layanan pihak ketiga mengembalikan error" });
    }
    // sisanya: request tidak pernah sampai (ECONNREFUSED, ENOTFOUND) --
    // atau bug kita sendiri. 500, pesan generik, detail di log.
    console.error("[contohAxios]", error.message);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

/* ================================================================== */
/* POST /api/v1/contohAxios/webhook  { "pesan": "..." }                */
/*                                                                     */
/* Endpoint latihan: buktikan sendiri bahwa webhook yang gagal TIDAK   */
/* menggagalkan request. Isi DISCORD_WEBHOOK_URL di .env dengan URL    */
/* yang benar, kirim, lihat pesan muncul di Discord. Lalu rusak        */
/* URL-nya, kirim lagi: responsenya tetap 200.                         */
/* ================================================================== */
const ujiWebhook = async (req, res) => {
  const { pesan } = req.body || {};

  if (!pesan || typeof pesan !== "string") {
    return res.status(400).json({ msg: "Body harus berisi { pesan: '...' }" });
  }

  await kirimNotifikasi(pesan);

  // 200 SELALU -- bukan 500 kalau Discord down. Itulah seluruh poinnya.
  return res.status(200).json({
    msg: "Notifikasi dikirim (kalau DISCORD_WEBHOOK_URL terpasang)",
  });
};

module.exports = { queryAnime, ujiWebhook, KONTRAK_ANIME };
