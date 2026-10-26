/**
 * MODEL BUKU — MINGGU 4
 * =====================
 *
 * Inilah "lapisan data" versi ORM. Bandingkan dengan src/data/buku.js
 * versi Minggu 3: seluruh SQL manual (SELECT, INSERT, UPDATE, DELETE,
 * JOIN, COUNT) sekarang DIGANTI oleh definisi ini.
 *
 * Model = peta satu tabel database, plus PERILAKU yang melekat padanya.
 * Perhatikan bahwa model ini mendokumentasikan dirinya sendiri:
 * tipe kolom, aturan validasi, transformasi, dan relasinya — semuanya
 * di SATU tempat, bukan tersebar di controller.
 */
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Buku extends Model {
    /**
     * RELASI — dipanggil dari src/models/index.js SETELAH semua model
     * dibangun (kenapa urutannya begitu? baca catatan di models/index.js).
     *
     * Satu buku punya BANYAK karakter (one-to-many):
     *
     *     Buku.hasMany(Karakter, { foreignKey: "buku_id", as: "karakter" })
     *
     * `as: "karakter"` menentukan NAMA properti hasil eager loading:
     *     buku.karakter   <- seperti di Minggu 2 dan 3!
     * Nama ini WAJIB sama dengan yang dipakai di include pada controller,
     * dan WAJIB sama dengan bentuk response Minggu 2/3 supaya koleksi
     * Postman tidak berubah.
     */
    static associate(models) {
      Buku.hasMany(models.Karakter, {
        foreignKey: "buku_id",
        as: "karakter",
      });
    }
  }

  Buku.init(
    {
      /* ------------------------------------------------------------
       * PETA KOLOM — bandingkan satu per satu dengan sql/schema.sql.
       * Nama properti = nama kolom. Tipe DataTypes = tipe MySQL.
       * ------------------------------------------------------------ */
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      judul: {
        type: DataTypes.STRING(150),
        allowNull: false,

        // Jaring pengaman KETIGA untuk "judul tidak boleh kembar"
        // (lapis 1: cek controller, lapis 2: UNIQUE KEY di MySQL).
        // Sequelize menerjemahkan ini menjadi error
        // SequelizeUniqueConstraintError kalau dilanggar.
        unique: true,

        // ------------------------------------------------------------
        // SETTER — transformasi SEBELUM nilai disimpan.
        // ------------------------------------------------------------
        // Kenapa? Input dari req.body bisa berisi spasi berlebih
        // ("  Dune  " atau "Dune    Messiah"). Membersihkannya di
        // controller berarti setiap controller harus ingat; di model,
        // TIDAK ADA jalur INSERT/UPDATE yang bisa lolos dari aturan ini.
        set(value) {
          this.setDataValue("judul", String(value).trim().replace(/\s+/g, " "));
        },
      },

      penulis: {
        type: DataTypes.STRING(100),
        allowNull: false,
        set(value) {
          this.setDataValue("penulis", String(value).trim().replace(/\s+/g, " "));
        },
      },

      tahun_terbit: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,

        // ------------------------------------------------------------
        // VALIDASI MODEL — lapis validasi KEDUA, dijalankan Sequelize
        // sebelum INSERT/UPDATE dikirim ke MySQL.
        //
        // Lapis pertama tetap validate() manual di controller (menghasilkan
        // 400 + pesan per field). Lapis ini menangkap yang lolos —
        // termasuk penulisan langsung lewat model dari tempat lain di kode.
        // Kalau keduanya dilanggar, error berbentuk
        // SequelizeValidationError, dan controller menerjemahkannya
        // menjadi 400, bukan 500 (lihat catch di controllers/buku.js).
        // ------------------------------------------------------------
        validate: {
          isInt: { msg: "Tahun terbit harus berupa angka bulat" },
          min: { args: [1900], msg: "Tahun terbit minimal 1900" },
          max: {
            args: [2100],
            msg: "Tahun terbit tidak masuk akal (maksimal 2100)",
          },
        },
      },

      harga: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: {
          min: { args: [0], msg: "Harga tidak boleh negatif" },
        },
      },

      stok: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0, // versi ORM dari `default: 0` di aturanBuku controller
        validate: {
          isInt: { msg: "Stok harus berupa angka bulat" },
          min: { args: [0], msg: "Stok tidak boleh negatif" },
        },
      },

      kategori: {
        // ENUM — persis seperti ENUM di schema.sql. Sequelize menolak
        // nilai di luar daftar ini sebelum menyentuh database.
        type: DataTypes.ENUM("novel", "komik", "non-fiksi", "referensi"),
        allowNull: false,
      },

      /* ------------------------------------------------------------
       * VIRTUAL FIELD — dihitung saat dibaca, TIDAK ada kolomnya.
       * ------------------------------------------------------------
       * Muncul di response JSON, tapi tidak pernah tersimpan.
       * Bandingkan `keterangan_lengkap` di materi referensi Minggu 4:
       * kegunaannya sama — nilai turunan yang kalau dihitung di
       * controller harus dihitung berulang-ulang di setiap endpoint.
       *
       * Karena tidak ada kolomnya, setter-nya justru menolak: mencoba
       * mengirim keterangan dari req.body (mass assignment!) langsung
       * meledak dengan jelas, bukan diam-diam tersimpan.
       */
      keterangan: {
        type: DataTypes.VIRTUAL,
        get() {
          return `Buku ini berjudul ${this.judul}, ditulis ${
            this.penulis
          } dan terbit pada tahun ${this.tahun_terbit}`;
        },
        set() {
          throw new Error("keterangan dihitung otomatis, tidak bisa diisi");
        },
      },
    },

    /* ==================================================================
     * OPSI MODEL
     * ================================================================== */
    {
      sequelize,       // koneksi dari src/databases/connection.js
      modelName: "Buku",
      tableName: "buku", // TANPA ini, Sequelize menyimpulkan "Buku" sendiri

      // TIMESTAMPS — otomatis mengisi kolom createdAt dan updatedAt.
      // Sequelize versi default kita juga menunggu kolom `deletedAt`
      // (paranoid / soft delete). Di starter ini paranoid sengaja mati agar DELETE tetap menghapus
      // baris secara permanen, seperti implementasi sebelumnya. Mengaktifkan
      // soft delete berdampak juga pada
      // UNIQUE KEY judul.
      timestamps: true,
      paranoid: false,

      // --------------------------------------------------------------
      // DEFAULT SCOPE — kenapa kolom createdAt/updatedAt/deletedAt
      // tidak muncul di response?
      // --------------------------------------------------------------
      // Sequelize menyertakan SEMUA kolom by default. Response Minggu 2
      // dan 3 TIDAK punya kolom itu, dan koleksi Postman kita harus tetap
      // hijau tanpa diubah. Scope ini menyaringnya dari SETIAP query —
      // satu tempat, bukan satu argumen `attributes` per endpoint.
      //
      // Setiap query yang butuh kolom lain cukup mengirim `attributes`
      // miliknya sendiri (lihat controllers/buku.js) — scope punya aturan
      // merge yang masuk akal untuk itu.
      defaultScope: {
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      },
    }
  );

  return Buku;
};
