/**
 * MODEL PENGGUNA — MINGGU 7
 * =========================
 *
 * Model paling berisiko di project ini, karena datanya paling sensitif:
 * password hash dan aturan akses.
 *
 * Tiga aturan yang membuat model ini berbeda dari model-model lain:
 *
 *   1. `pengguna_password` TIDAK PERNAH boleh muncul di response JSON.
 *      Mekanismenya ada di defaultScope bawah -- bukan "ingat-ingat
 *      saat membuat response", karena ingatan itu yang biasanya lupa.
 *
 *   2. TIDAK ADA route API yang menciptakan role admin. Register
 *      selalu 'visitor' (lihat controllers/auth.js). Kalau admin bisa
 *      dibuat lewat POST, siapa pun jadi admin -- tidak ada validasi
 *      yang bisa menyelamatkan desain yang salah seperti itu.
 *
 *   3. Role disimpan sebagai STRING bebas-koma ("visitor,editor") --
 *      sederhana untuk pengajaran. Versi produksi memakai tabel
 *      roles tersendiri (many-to-many); prinsipnya sama, polanya nanti
 *      kalian kenal dari Minggu 4: tabel penghubung.
 */
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Pengguna extends Model {
    /**
     * Tidak ada relasi di minggu ini -- kolom api_key/api_level baru
     * dipakai di Minggu 8 (API key aplikasi), dan relasinya satu arah
     * dari api_log (Minggu 8 juga).
     */
    static associate() {}
  }

  Pengguna.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      pengguna_nama: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue("pengguna_nama", String(value).trim().toLowerCase());
        },
      },

      pengguna_jk: {
        // enum 'L'/'P', boleh NULL -- opsional. Cermin schema.sql.
        type: DataTypes.ENUM("L", "P"),
        allowNull: true,
      },

      pengguna_password: {
        // HASH bcrypt -- yang menulis nilai kolom ini adalah
        // bcrypt.hash() di controllers/auth.js, bukan client.
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      pengguna_email: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      roles: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "visitor", // SELALU visitor dari register -- lihat catatan atas
        validate: {
          // hanya karakter yang diharapkan, mis. "admin" / "visitor,editor"
          is: { args: /^[a-z,]+$/i, msg: "Roles hanya boleh berupa huruf dipisah koma" },
        },
      },

      api_key: {
        // identitas APLIKASI developer -- di-generate otomatis saat
        // register (crypto.randomUUID()), dipakai di Minggu 8.
        type: DataTypes.STRING(64),
        allowNull: true,
      },

      api_level: {
        // tier rate limit untuk Minggu 8: basic / premium
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "basic",
      },

      /* ------------------------------------------------------------
       * VIRTUAL: keterangan akun -- sama polanya dengan `keterangan`
       * di model Buku (Minggu 4): dihitung saat dibaca, tidak ada
       * kolomnya, setter-nya menolak diisi.
       * ------------------------------------------------------------ */
      keterangan: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.pengguna_nama} terdaftar sebagai ${this.roles}`;
        },
        set() {
          throw new Error("keterangan dihitung otomatis, tidak bisa diisi");
        },
      },
    },
    {
      sequelize,
      modelName: "Pengguna",
      tableName: "pengguna",
      timestamps: true,
      paranoid: false,

      // ------------------------------------------------------------
      // DEFAULT SCOPE -- dua lapis penyaringan dalam satu tempat:
      //
      //   1. timestamps & kolom teknis tidak ikut ke response.
      //   2. pengguna_password TIDAK PERNAH keluar dari model -- di
      //      manapun Pengguna di-JSON-kan, hash tidak ikut. Controller
      //      TIDAK PERLU ingat-aturnya... TAPI:
      //
      // PENTING: login TETAP butuh membaca hash (bcrypt.compare butuh
      // nilai kolomnya). Karena itu login memakai
      // `Pengguna.unscoped()` atau override attributes -- lihat
      // controllers/auth.js. Scope menjaga OUTPUT; data internal tetap
      // bisa diambil secara sadar dan eksplisit.
      // ------------------------------------------------------------
      defaultScope: {
        attributes: {
          exclude: ["createdAt", "updatedAt", "pengguna_password"],
        },
      },
    }
  );

  return Pengguna;
};
