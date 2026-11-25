-- GramSakhi database  (import in phpMyAdmin → Import, or run in the MySQL console)
-- Safe to import again: tables use IF NOT EXISTS and demo rows use INSERT IGNORE.
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS gramsakhi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gramsakhi;

-- Feature 1 & 2: SHG registration, individual and group digital stores
CREATE TABLE IF NOT EXISTS sellers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind       ENUM('group','individual') NOT NULL DEFAULT 'individual',
  name       VARCHAR(80)  NOT NULL,                 -- the woman / group leader
  phone      CHAR(10)     NOT NULL UNIQUE,          -- login id
  pin_hash   VARCHAR(255) NOT NULL,                 -- bcrypt hash, never the PIN itself
  shg_name   VARCHAR(120) NOT NULL DEFAULT '',
  village    VARCHAR(80)  NOT NULL DEFAULT '',
  story      TEXT         NOT NULL,                 -- shown on the store page and QR
  upi        VARCHAR(80)  NOT NULL DEFAULT '',      -- customers pay this UPI directly
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS members (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id  INT UNSIGNED NOT NULL,
  name       VARCHAR(60)  NOT NULL,
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Feature 3 & 5: products listed by voice, each with a story (reached by QR)
CREATE TABLE IF NOT EXISTS products (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id  INT UNSIGNED NOT NULL,
  name       VARCHAR(120) NOT NULL,
  price      INT UNSIGNED NOT NULL,                 -- whole rupees
  stock      INT          NOT NULL DEFAULT 0,
  category   VARCHAR(30)  NOT NULL DEFAULT '',
  story      TEXT         NOT NULL,
  image      VARCHAR(120) NOT NULL DEFAULT '',      -- e.g. uploads/ab12….jpg
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (seller_id),
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Feature 4: direct orders. One row per product line; the total is calculated by the server.
CREATE TABLE IF NOT EXISTS orders (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id     INT UNSIGNED NULL,                 -- stays NULL-able so history survives if the product is deleted
  seller_id      INT UNSIGNED NOT NULL,
  product_name   VARCHAR(120) NOT NULL,
  qty            INT UNSIGNED NOT NULL,
  total          INT UNSIGNED NOT NULL,
  customer_name  VARCHAR(80)  NOT NULL,
  customer_phone CHAR(10)     NOT NULL,
  customer_addr  VARCHAR(300) NOT NULL,
  pay_method     ENUM('COD','UPI') NOT NULL DEFAULT 'COD',
  status         ENUM('new','packed','shipped','done') NOT NULL DEFAULT 'new',
  cust_token     CHAR(32)     NOT NULL,             -- ties the order to the customer's browser
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (seller_id), INDEX (cust_token),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (seller_id)  REFERENCES sellers(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    INT UNSIGNED NOT NULL,
  rating        TINYINT UNSIGNED NOT NULL,
  review_text   VARCHAR(500) NOT NULL DEFAULT '',
  reviewer_name VARCHAR(80)  NOT NULL,
  cust_token    CHAR(32)     NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_review_per_buyer (product_id, cust_token),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- "Contact us" messages (read them in phpMyAdmin)
CREATE TABLE IF NOT EXISTS messages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80)   NOT NULL,
  message    VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Slows down PIN guessing
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone        CHAR(10)    NOT NULL,
  ip           VARCHAR(45) NOT NULL DEFAULT '',
  attempted_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (phone, attempted_at)
) ENGINE=InnoDB;

-- ---------- demo data (login with phone + PIN 1234). Delete these before real use. ----------
INSERT IGNORE INTO sellers (id, kind, name, phone, pin_hash, shg_name, village, story, upi) VALUES
 (1,'group','सीता देवी','9999999999','$2y$12$HrFuvOzd71Y8QBBwQlxP7O23hxQKt4e8jDnEgvB4U9qdZn2YcoHyy','सखी स्वयं सहायता समूह','रानपुर','हम 10 महिलाएँ मिलकर घर का बना अचार और पापड़ बनाती हैं।','sakhi@upi'),
 (2,'individual','राधा बेन','8888888888','$2y$12$HrFuvOzd71Y8QBBwQlxP7O23hxQKt4e8jDnEgvB4U9qdZn2YcoHyy','','सूरजपुर','मैं घर पर कढ़ाई और मसाले तैयार करती हूँ।','radha@upi');

INSERT IGNORE INTO members (id, seller_id, name) VALUES (1,1,'सीता'),(2,1,'गीता'),(3,1,'रीता');

INSERT IGNORE INTO products (id, seller_id, name, price, stock, category, story, image) VALUES
 (1,1,'आम का अचार',150,20,'अचार','दादी की रेसिपी से, सरसों के तेल में, धूप में पका हुआ।',''),
 (2,1,'मूंग पापड़',80,30,'पापड़','हाथ से बेले गए, बिना मिलावट के।',''),
 (3,1,'बाँस की टोकरी',200,10,'हस्तशिल्प','गाँव की कारीगर महिलाओं ने हाथ से बुनी।',''),
 (4,2,'कढ़ाई वाला रुमाल',120,15,'कपड़े','एक रुमाल बनाने में दो दिन लगते हैं।',''),
 (5,2,'घर का गरम मसाला',90,25,'मसाले','सिल-बट्टे पर पिसा, ताज़ा मसाला।','');
