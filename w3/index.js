require("dotenv").config();

const express = require("express");
const app = express();

const logger = require("./src/middlewares/logger");
const notFound = require("./src/middlewares/notFound");
const errorHandler = require("./src/middlewares/errorHandler");

const {
  contohRouter,
  bukuRouter,
  kendaraanRouter,
  pelangganRouter,
  transaksiRouter,
} = require("./src/routes");

const {
  testConnection,
} = require("./src/config/database");

const port = process.env.PORT || 3001;

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(logger);

app.get("/", (req, res) => {
  return res.json({
    service: "SOA Minggu 3 - CV Wira Jaya Rental",
    version: "1.0.0",

    endpoints: [
      "/api/v1/contoh",
      "/api/v1/buku",
      "/api/v1/kendaraan",
      "/api/v1/pelanggan",
      "/api/v1/transaksi",
    ],
  });
});

app.use("/api/v1/contoh", contohRouter);
app.use("/api/v1/buku", bukuRouter);

app.use(
  "/api/v1/kendaraan",
  kendaraanRouter
);

app.use(
  "/api/v1/pelanggan",
  pelangganRouter
);

app.use(
  "/api/v1/transaksi",
  transaksiRouter
);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(
    `Example app listening on port ${port}!`
  );

  testConnection();
});