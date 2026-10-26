-- KENNETH: tabel pembelian simulasi dan satu subscription terkini per akun.
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(50) NOT NULL,
  pengguna_id INT UNSIGNED NOT NULL,
  plan VARCHAR(50) NOT NULL,
  amount INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  billing_days SMALLINT UNSIGNED NOT NULL,
  checkout_key VARCHAR(100) NOT NULL,
  status ENUM('pending','paid','cancelled','expired') NOT NULL DEFAULT 'pending',
  expires_at DATETIME(3) NOT NULL,
  paid_at DATETIME(3) NULL,
  confirmed_by INT UNSIGNED NULL,
  period_start DATETIME(3) NULL,
  period_end DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_payment_invoice (invoice_no),
  UNIQUE KEY uq_payment_checkout (pengguna_id, checkout_key),
  INDEX idx_payment_owner (pengguna_id, id),
  INDEX idx_payment_pending (status, expires_at),
  CONSTRAINT fk_payment_owner FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_admin FOREIGN KEY (confirmed_by) REFERENCES pengguna(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pengguna_id INT UNSIGNED NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'premium',
  status ENUM('active','expired') NOT NULL DEFAULT 'active',
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  source ENUM('payment','legacy_migration') NOT NULL DEFAULT 'payment',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_subscription_owner (pengguna_id),
  INDEX idx_subscription_expiry (status, ends_at),
  CONSTRAINT fk_subscription_owner FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE CASCADE
) ENGINE=InnoDB;
