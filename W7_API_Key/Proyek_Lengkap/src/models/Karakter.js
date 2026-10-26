/**
 * MODEL KARAKTER — MINGGU 4
 * =========================
 *
 * Sisi "many" dari relasi one-to-many Buku -> Karakter.
 * Versi SQL-nya ada di sql/schema.sql (tabel karakter + foreign key).
 */
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Karakter extends Model {
    /**
     * Sisi cermin dari Buku.hasMany: satu karakter MILIK satu buku.
     *
     *     Karakter.belongsTo(Buku, { foreignKey: "buku_id", as: "buku" })
     *
     * Tabel database-nya sudah mendeklarasikan relasi ini sejak Minggu 3
     * (FOREIGN KEY di schema.sql) — model hanya MENYATAKAN ulang agar
     * Sequelize bisa memakainya untuk eager loading.
     */
    static associate(models) {
      Karakter.belongsTo(models.Buku, {
        foreignKey: "buku_id",
        as: "buku",
      });
    }
  }

  Karakter.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      buku_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,

        // Validasi level model: karakter TANPA buku tidak boleh ada.
        // Di database aturannya NOT NULL + FOREIGN KEY (schema.sql).
        // Di model, aturan yang sama dinyatakan sekali lagi — ORM bukan
        // pengganti constraint database, dia lapisan yang bekerja BERSAMA
        // constraint itu.
      },

      nama: {
        type: DataTypes.STRING(100),
        allowNull: false,
        set(value) {
          this.setDataValue("nama", String(value).trim().replace(/\s+/g, " "));
        },
      },

      peran: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: {
            args: [["protagonis", "antagonis", "pendukung"]],
            msg: "Peran harus salah satu dari: protagonis, antagonis, pendukung",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Karakter",
      tableName: "karakter",

      // Tabel karakter TIDAK punya kolom createdAt/updatedAt (lihat
      // schema.sql). `timestamps: false` memberi tahu Sequelize untuk
      // tidak menyentuh kolom yang memang tidak ada — kalau tidak,
      // setiap INSERT akan gagal mencari kolom yang tidak ketemu.
      timestamps: false,
    }
  );

  return Karakter;
};
