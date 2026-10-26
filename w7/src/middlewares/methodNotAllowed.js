/**
 * 405 METHOD NOT ALLOWED
 *
 * Bedanya dengan 404:
 *   404 = alamatnya tidak ada
 *   405 = alamatnya ADA, tapi method yang kamu pakai tidak didukung
 *
 * Contoh: DELETE /api/v1/buku  (menghapus SELURUH koleksi buku?)
 *   -> alamat /api/v1/buku jelas ada
 *   -> tapi DELETE di situ tidak kita izinkan
 *   -> jawaban yang benar 405, bukan 404
 *
 * RFC 9110 mewajibkan response 405 menyertakan header "Allow"
 * berisi daftar method yang boleh dipakai. Ini yang membuat API kita
 * sopan: consumer langsung tahu apa yang seharusnya dia kirim.
 */
const methodNotAllowed = (...allowed) => {
  return (req, res) => {
    return res
      .set("Allow", allowed.join(", "))
      .status(405)
      .json({
        msg: `Method ${req.method} tidak diizinkan untuk endpoint ini`,
        allowed,
      });
  };
};

module.exports = methodNotAllowed;
