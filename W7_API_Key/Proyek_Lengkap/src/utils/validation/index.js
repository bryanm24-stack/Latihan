/**
 * DAFTAR SCHEMA VALIDASI — MINGGU 5
 * =================================
 *
 * Semua schema Joi dikumpulkan di sini supaya controller cukup mengimpor
 * satu file:
 *
 *   const { bukuSchema, userSchema } = require("../utils/validation");
 *
 * Tambah schema baru untuk resource project dengan cara:
 *   1. buat file di folder ini
 *   2. require + ekspor di bawah
 */
const bukuSchema = require("./bukuSchema");
const userSchema = require("./userSchema");

module.exports = { bukuSchema, userSchema };
