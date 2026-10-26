require("dotenv").config();
const accessSecret = process.env.ACCESS_TOKEN_SECRET || "";
const refreshSecret = process.env.REFRESH_TOKEN_SECRET || "";
const validJwtSecrets =
  accessSecret.length >= 64 &&
  refreshSecret.length >= 64 &&
  accessSecret !== refreshSecret &&
  !/ganti|placeholder|example/i.test(accessSecret + refreshSecret);

if (!validJwtSecrets) {
  console.error(
    "[AUTH] Konfigurasi JWT tidak aman. Isi dua secret acak, berbeda, minimal 64 karakter di .env.\n" +
      "[AUTH] Generate masing-masing dengan:\n" +
      'node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
  process.exit(1);
}


const app = require("./app");
const { testConnection } = require("./src/databases/connection");
const port = process.env.PORT || 3001;
app.listen(port, () => { console.log(`BookData API berjalan pada port ${port}`); testConnection(); });
