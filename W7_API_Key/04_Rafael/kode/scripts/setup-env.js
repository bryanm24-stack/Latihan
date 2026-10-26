// RAFAEL: membuat .env lokal sekali saja, tanpa menimpa konfigurasi lama.
const fs = require("node:fs");
const crypto = require("node:crypto");
if (fs.existsSync(".env")) { console.log(".env sudah ada. Tidak ditimpa."); process.exit(0); }
let text = fs.readFileSync(".env.example", "utf8");
text = text.replace(/^ACCESS_TOKEN_SECRET=.*$/m,
  `ACCESS_TOKEN_SECRET=${crypto.randomBytes(64).toString("hex")}`);
text = text.replace(/^REFRESH_TOKEN_SECRET=.*$/m,
  `REFRESH_TOKEN_SECRET=${crypto.randomBytes(64).toString("hex")}`);
text = text.replace(/^DB_NAME=.*$/m, "DB_NAME=soa_bookdata_w8");
fs.writeFileSync(".env", text, { mode: 0o600 });
console.log(".env dibuat. Sesuaikan DB_HOST, DB_PORT, DB_USER dan DB_PASSWORD.");
