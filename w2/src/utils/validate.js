/**
 * VALIDASI MANUAL — MINGGU 2
 * ==========================
 *
 * Di Minggu 5 semua ini diganti Joi dalam 10 baris.
 * Jadi kenapa kita menulisnya sendiri sekarang?
 *
 * Karena kalau kalian tidak pernah merasakan repotnya, kalian tidak akan
 * paham APA yang sebenarnya Joi kerjakan untuk kalian — dan kalian akan
 * memakainya sebagai mantra, bukan sebagai alat.
 *
 * Tiga hal yang dikerjakan fungsi ini, dan ketiganya penting:
 *
 *   1. MEMERIKSA   — apakah datanya masuk akal
 *   2. MENGUBAH    — "40" (string dari HTTP) menjadi 40 (number)
 *   3. MENYARING   — hanya field yang kita izinkan yang lolos keluar
 *
 * Nomor 3 sering dilupakan padahal paling berbahaya. Lihat catatan
 * "mass assignment" di bagian bawah file ini.
 */

const kosong = (v) => v === undefined || v === null || String(v).trim() === "";

const tambahError = (errors, field, pesan) => {
  if (!errors[field]) errors[field] = [];
  errors[field].push(pesan);
};

/**
 * @param {object} data  biasanya req.body
 * @param {object} rules aturan per field
 * @returns {{ valid: boolean, errors: object, value: object }}
 *
 * PENTING: pakailah `value` yang dikembalikan, JANGAN req.body.
 * `value` sudah bersih, sudah dikonversi tipenya, dan hanya berisi
 * field yang kalian izinkan.
 */
const validate = (data, rules) => {
  const errors = {};
  const value = {};

  for (const [field, rule] of Object.entries(rules)) {
    const label = rule.label || field;
    const asli = data[field];

    // ---- 1. wajib atau tidak -------------------------------------
    if (kosong(asli)) {
      if (rule.required) {
        tambahError(errors, field, `${label} harus diisi`);
      } else if ("default" in rule) {
        value[field] = rule.default;
      }
      continue; // tidak ada gunanya memeriksa tipe dari nilai kosong
    }

    // ---- 2. periksa tipe dan konversi ------------------------------
    let v = asli;

    switch (rule.type) {
      case "number": {
        v = Number(v);
        if (Number.isNaN(v)) {
          tambahError(errors, field, `${label} harus berupa angka`);
          continue;
        }
        if (rule.integer && !Number.isInteger(v)) {
          tambahError(errors, field, `${label} harus bilangan bulat`);
        }
        if (rule.min !== undefined && v < rule.min) {
          tambahError(errors, field, `${label} minimal ${rule.min}`);
        }
        if (rule.max !== undefined && v > rule.max) {
          tambahError(errors, field, `${label} maksimal ${rule.max}`);
        }
        break;
      }

      case "string": {
        v = String(v).trim();
        if (rule.minLength && v.length < rule.minLength) {
          tambahError(errors, field, `${label} minimal ${rule.minLength} karakter`);
        }
        if (rule.maxLength && v.length > rule.maxLength) {
          tambahError(errors, field, `${label} maksimal ${rule.maxLength} karakter`);
        }
        if (rule.pattern && !rule.pattern.test(v)) {
          tambahError(errors, field, rule.patternMsg || `${label} formatnya tidak sesuai`);
        }
        break;
      }

      case "enum": {
        v = String(v).trim();
        if (!rule.values.includes(v)) {
          tambahError(errors, field, `${label} harus salah satu dari: ${rule.values.join(", ")}`);
        }
        break;
      }

      case "array": {
        if (!Array.isArray(v)) {
          tambahError(errors, field, `${label} harus berupa array`);
          continue;
        }
        if (rule.minItems && v.length < rule.minItems) {
          tambahError(errors, field, `${label} minimal berisi ${rule.minItems} item`);
        }
        break;
      }

      default:
        // tipe tidak dikenal: biarkan apa adanya
        break;
    }

    // ---- 3. hanya masukkan kalau field ini tidak bermasalah --------
    if (!errors[field]) value[field] = v;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value,
  };
};

module.exports = validate;

/**
 * ====================================================================
 * CATATAN 1 — KENAPA SEMUA ERROR DIKUMPULKAN, BUKAN BERHENTI DI YANG PERTAMA
 * ====================================================================
 *
 * Bandingkan dua pengalaman ini:
 *
 *   Berhenti di error pertama:
 *     kirim -> "judul harus diisi"          -> perbaiki
 *     kirim -> "harga harus berupa angka"   -> perbaiki
 *     kirim -> "tahun minimal 1900"         -> perbaiki
 *     3 kali bolak-balik untuk satu form.
 *
 *   Kumpulkan semua:
 *     kirim -> ketiganya sekaligus          -> perbaiki sekali
 *
 * Karena itulah `continue` di atas hanya melompati field yang sedang
 * diperiksa, bukan menghentikan seluruh loop.
 *
 * Di Minggu 5 hal ini namanya `abortEarly: false`. Sekarang kalian tahu
 * apa yang sebenarnya dimatikan oleh opsi itu.
 *
 *
 * ====================================================================
 * CATATAN 2 — MASS ASSIGNMENT (ini yang paling berbahaya)
 * ====================================================================
 *
 * Kode yang kelihatannya wajar:
 *
 *     const bukuBaru = { ...req.body, id: idBaru };
 *     buku.push(bukuBaru);
 *
 * Sekarang seorang penyerang mengirim:
 *
 *     { "judul": "Buku", "harga": 0, "isAdmin": true, "diskon": 100 }
 *
 * `...req.body` menyalin SEMUA field, termasuk yang tidak pernah kalian
 * rencanakan. Field `isAdmin` dan `diskon` ikut tersimpan.
 *
 * Kelemahan ini punya nama sendiri: **mass assignment**. Ia masuk daftar
 * OWASP API Security Top 10, dan penyebabnya selalu sama — mempercayai
 * bentuk data yang dikirim client.
 *
 * Solusinya persis nomor 3 di atas: `value` hanya berisi field yang ada
 * di `rules`. Apa pun yang tidak kalian sebutkan, dibuang diam-diam.
 *
 * Aturan praktis yang berlaku seumur hidup:
 *
 *     JANGAN PERNAH menyimpan req.body secara langsung.
 *     Selalu bangun ulang objeknya dari field yang kalian pilih sendiri.
 */
