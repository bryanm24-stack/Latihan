// RAFAEL: HTTP + Sequelize + MySQL nyata. Jalankan test:prepare terlebih dahulu.
require("dotenv").config();
process.env.DB_NAME = process.env.TEST_DB_NAME || "soa_bookdata_w8_test";
if (!/^[a-zA-Z0-9_]+_test$/.test(process.env.DB_NAME)) throw new Error("Database uji harus berakhiran _test");
process.env.ACCESS_TOKEN_SECRET ||= "a".repeat(128);
process.env.REFRESH_TOKEN_SECRET ||= "b".repeat(128);
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const crypto = require("node:crypto");
const { sequelize, Pengguna, ApiLog } = require("../src/models");
const app = require("../app");
const { hashApiKey } = require("../src/utils/apiKey");
let server, base, seq = 0;
const suffix = crypto.randomBytes(4).toString("hex");
async function request(path, { method = "GET", token, key, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (key) headers["X-API-Key"] = key;
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
const auth = (path, options) => request(`/api/v1/auth/${path}`, options);
const manage = (path, options) => request(`/api/v1/api-key/${path}`, options);
const partner = (path, key) => request(`/api/v1/partner/${path}`, { key });
async function account() {
  const name = `t${suffix}${++seq}`;
  const reg = await auth("register", { method: "POST", body: { pengguna_nama: name, pengguna_password: "Tester123!" } });
  assert.equal(reg.status, 201);
  const login = await auth("login", { method: "POST", body: { pengguna_nama: name, pengguna_password: "Tester123!" } });
  return { id: reg.body.id, token: login.body.accessToken, registered: reg.body };
}
async function withKey() {
  const user = await account();
  const issued = await manage("generate", { method: "POST", token: user.token });
  assert.equal(issued.status, 201);
  return { ...user, key: issued.body.api_key };
}
before(async () => {
  await sequelize.authenticate();
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});
test("BookData API: alur bisnis dan batas akses pada database nyata", async (t) => {
  const user = await withKey();
  await t.test("register tidak membocorkan hash password / api_key", () => {
    assert.equal(user.registered.api_key, undefined);
    assert.equal(user.registered.pengguna_password, undefined);
    assert.equal(user.registered.api_level, "basic");
  });
  await t.test("database menyimpan SHA-256, bukan raw key", async () => {
    const row = await Pengguna.unscoped().findByPk(user.id);
    assert.match(user.key, /^bd_live_[a-f0-9]{64}$/);
    assert.equal(row.api_key, hashApiKey(user.key));
    assert.notEqual(row.api_key, user.key);
  });
  await t.test("generate memerlukan JWT", async () => {
    assert.equal((await manage("generate", { method: "POST" })).status, 401);
  });
  await t.test("generate kedua menghasilkan 409", async () => {
    assert.equal((await manage("generate", { method: "POST", token: user.token })).status, 409);
  });
  await t.test("dua generate bersamaan hanya menerbitkan satu key", async () => {
    const u = await account();
    const results = await Promise.all([1, 2].map(() => manage("generate", { method: "POST", token: u.token })));
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  });
  await t.test("key hilang / salah dan JWT saja tidak memberi akses partner", async () => {
    assert.equal((await partner("ringkasan")).status, 401);
    assert.equal((await partner("ringkasan", "bd_live_" + "0".repeat(64))).status, 401);
    assert.equal((await request("/api/v1/partner/ringkasan", { token: user.token })).status, 401);
  });
  await t.test("Basic mendapat ringkasan dari buku W7 dan header sisa kuota", async () => {
    const r = await partner("ringkasan", user.key);
    assert.equal(r.status, 200); assert.ok(r.body.data.total_judul >= 5);
    assert.equal(r.headers.get("x-daily-remaining"), "99");
  });
  await t.test("Basic ditolak analitik tanpa menghabiskan kuota", async () => {
    const before = await ApiLog.count({ where: { pengguna_id: user.id } });
    assert.equal((await partner("analitik", user.key)).status, 403);
    assert.equal(await ApiLog.count({ where: { pengguna_id: user.id } }), before);
  });
  await t.test("visitor tidak dapat upgrade paket sendiri", async () => {
    assert.equal((await manage(`level/${user.id}`, { method: "PATCH", token: user.token,
      body: { api_level: "premium" } })).status, 403);
  });
  const admin = await auth("login", { method: "POST", body: { pengguna_nama: "admin", pengguna_password: "Admin123!" } });
  assert.equal(admin.status, 200);
  await t.test("admin menolak paket / id / body yang salah", async () => {
    for (const [id, body] of [[user.id, { api_level: "gold" }], ["abc", { api_level: "premium" }],
      [user.id, { api_level: "premium", roles: "admin" }], [user.id, { api_level: { toString: "bad" } }]]) {
      assert.equal((await manage(`level/${id}`, { method: "PATCH", token: admin.body.accessToken, body })).status, 400);
    }
  });
  await t.test("admin menerima 404 jika target tidak ada", async () => {
    assert.equal((await manage("level/2147483647", { method: "PATCH", token: admin.body.accessToken,
      body: { api_level: "premium" } })).status, 404);
  });
  await t.test("admin mengaktifkan Premium, key yang sama langsung mendapat analitik", async () => {
    assert.equal((await manage(`level/${user.id}`, { method: "PATCH", token: admin.body.accessToken,
      body: { api_level: "premium" } })).status, 200);
    const r = await partner("analitik", user.key);
    assert.equal(r.status, 200); assert.ok(Array.isArray(r.body.data.kategori));
    assert.equal(r.headers.get("x-api-level"), "premium");
  });
  await t.test("me menampilkan penggunaan tanpa raw key atau hash", async () => {
    const r = await manage("me", { token: user.token });
    assert.equal(r.status, 200); assert.equal(r.body.usage.daily, 2);
    assert.equal(r.body.api_key, undefined); assert.equal(r.body.has_api_key, true);
    assert.ok(!JSON.stringify(r.body).includes(hashApiKey(user.key)));
  });
  await t.test("regenerate mencabut key lama tanpa menghapus pemakaian", async () => {
    const r = await manage("regenerate", { method: "POST", token: user.token });
    assert.equal(r.status, 200); assert.notEqual(r.body.api_key, user.key);
    assert.equal((await partner("ringkasan", user.key)).status, 401);
    assert.equal((await partner("ringkasan", r.body.api_key)).status, 200);
    user.key = r.body.api_key;
    assert.equal((await manage("me", { token: user.token })).body.usage.daily, 3);
  });
  await t.test("downgrade segera menolak analitik", async () => {
    await manage(`level/${user.id}`, { method: "PATCH", token: admin.body.accessToken, body: { api_level: "basic" } });
    assert.equal((await partner("analitik", user.key)).status, 403);
  });
  await t.test("11 request Basic bersamaan menerima tepat 10 slot", async () => {
    const u = await withKey();
    // Hindari lintas batas menit pada kasus uji ini.
    const remaining = 60000 - (Date.now() % 60000);
    if (remaining < 3000) await new Promise((r) => setTimeout(r, remaining + 20));
    const rs = await Promise.all(Array.from({ length: 11 }, () => partner("ringkasan", u.key)));
    assert.equal(rs.filter((r) => r.status === 200).length, 10);
    const denied = rs.filter((r) => r.status === 429);
    assert.equal(denied.length, 1); assert.equal(denied[0].body.code, "RATE_LIMIT_EXCEEDED");
    assert.ok(Number(denied[0].headers.get("retry-after")) > 0);
    assert.equal(await ApiLog.count({ where: { pengguna_id: u.id } }), 10);
  });
  await t.test("kuota harian 100 menolak request berikutnya walaupun menit masih kosong", async () => {
    const u = await withKey();
    const now = new Date(); const day = new Date(now); day.setUTCHours(0, 0, 0, 0);
    // Fixture tetap pada hari UTC ini. Kuota harian diperiksa terlebih dahulu.
    const minute = new Date(now); minute.setUTCSeconds(0, 0);
    const old = new Date(Math.max(+day, +minute - 1000));
    await ApiLog.bulkCreate(Array.from({ length: 100 }, () => ({ pengguna_id: u.id,
      endpoint: "/fixture", http_method: "GET", status_code: 200, createdAt: old })));
    const r = await partner("ringkasan", u.key);
    assert.equal(r.status, 429); assert.equal(r.body.code, "DAILY_QUOTA_EXCEEDED");
  });
  await t.test("Premium meloloskan lebih dari 10 request per menit", async () => {
    const u = await withKey(); await Pengguna.update({ api_level: "premium" }, { where: { id: u.id } });
    const rs = await Promise.all(Array.from({ length: 12 }, () => partner("ringkasan", u.key)));
    assert.ok(rs.every((r) => r.status === 200));
  });
  await t.test("log merekam HTTP status sesudah respons tanpa menyimpan key", async () => {
    let rows;
    for (let i = 0; i < 40; i++) {
      rows = await ApiLog.findAll({ where: { pengguna_id: user.id }, raw: true });
      if (rows.every((r) => r.status_code !== null)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(rows.length >= 3); assert.ok(rows.every((r) => r.status_code === 200));
    assert.ok(rows.every((r) => !JSON.stringify(r).includes(user.key)));
  });
  await t.test("UUID lama yang sudah di-hash masih dapat dipakai", async () => {
    const u = await account(); const legacy = crypto.randomUUID();
    await Pengguna.update({ api_key: hashApiKey(legacy) }, { where: { id: u.id } });
    assert.equal((await partner("ringkasan", legacy)).status, 200);
  });
  await t.test("endpoint buku W7 tetap tersedia", async () => {
    assert.equal((await request("/api/v1/buku")).status, 200);
  });
});
