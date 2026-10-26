-- KENNETH: log sekaligus reservasi kuota untuk request yang diterima.
CREATE TABLE IF NOT EXISTS api_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pengguna_id INT UNSIGNED NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  status_code SMALLINT UNSIGNED NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_api_log_pengguna FOREIGN KEY (pengguna_id)
    REFERENCES pengguna(id) ON DELETE CASCADE,
  INDEX idx_api_log_pengguna_waktu (pengguna_id, createdAt)
) ENGINE=InnoDB;
