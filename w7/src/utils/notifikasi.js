/**
 * NOTIFIKASI WEBHOOK — MINGGU 6
 * =============================
 *
 * Webhook = POST keluar, TANPA response yang ditunggu. Berbeda dengan
 * panggilan API biasa: kita tidak menunggu jawaban, kita hanya
 * "mengetuk pintu" dan melanjutkan kerja.
 *
 * ATURAN PALING PENTING DI FILE INI:
 * kegagalan notifikasi TIDAK BOLEH menggagalkan operasi utama.
 * Buku yang berhasil dibuat tetap ada walau Discord sedang error.
 * Karena itu SELURUH isi fungsi dibungkus try/catch — dan catch-nya
 * sengaja "tidak melakukan apa-apa" selain mencatat log.
 *
 * Kenapa TIDAK di-await oleh pemanggil? Lihat storeBuku() di
 * controllers/buku.js — notifikasi dikirim di latar (fire-and-forget)
 * supaya response 201 tidak menunggu Discord.
 */
const axios = require("axios");

const kirimNotifikasi = async (pesan) => {
  // Belum diset di .env -> tidak ada yang dikirim, BUKAN error.
  // Endpoint demo tetap jalan untuk semua mahasiswa tanpa Discord.
  if (!process.env.DISCORD_WEBHOOK_URL) return;

  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, { content: pesan });
    console.log(`[webhook] Terkirim: ${pesan}`);
  } catch (error) {
    // Discord membalas 204 No Content saat SUKSES — jangan salah paham
    // mengira itu gagal. Selain itu: gagal di sini bukan urusan client.
    console.error("[webhook] Gagal kirim notifikasi:", error.message);
  }
};

module.exports = { kirimNotifikasi };
