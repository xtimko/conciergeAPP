-- Concierge: схема для MySQL 8+ / MySQL Workbench
-- Создайте БД: CREATE DATABASE concierge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Затем: USE concierge; и выполните этот файл.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  telegram_id VARCHAR(64) NOT NULL DEFAULT '',
  role VARCHAR(16) NOT NULL DEFAULT 'client',
  first_name VARCHAR(255) NOT NULL DEFAULT '',
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  full_name VARCHAR(512) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(64) NOT NULL DEFAULT '',
  city VARCHAR(255) NOT NULL DEFAULT '',
  delivery_address TEXT,
  address_street VARCHAR(512) NOT NULL DEFAULT '',
  address_house VARCHAR(64) NOT NULL DEFAULT '',
  address_apartment VARCHAR(64) NOT NULL DEFAULT '',
  address_floor VARCHAR(32) NOT NULL DEFAULT '',
  address_entrance VARCHAR(64) NOT NULL DEFAULT '',
  intercom VARCHAR(128) NOT NULL DEFAULT '',
  courier_comment TEXT,
  referral_code VARCHAR(64) NOT NULL DEFAULT '',
  referred_by VARCHAR(255) NOT NULL DEFAULT '',
  bonus_balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
  language VARCHAR(8) NOT NULL DEFAULT 'ru',
  theme VARCHAR(16) NOT NULL DEFAULT 'dark',
  profile_completed TINYINT(1) NOT NULL DEFAULT 0,
  telegram_username VARCHAR(255) NOT NULL DEFAULT '',
  public_id VARCHAR(32) NOT NULL DEFAULT '',
  notify_preferences JSON,
  created_date DATETIME(3) NOT NULL,
  updated_date DATETIME(3) NOT NULL,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_telegram (telegram_id),
  KEY idx_users_referral (referral_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  client_email VARCHAR(255) NOT NULL DEFAULT '',
  client_telegram_id VARCHAR(64) NOT NULL DEFAULT '',
  client_name VARCHAR(512) NOT NULL DEFAULT '',
  item_name TEXT,
  item_size VARCHAR(128) NOT NULL DEFAULT '',
  item_category VARCHAR(32) NOT NULL DEFAULT 'other',
  brand VARCHAR(255) NOT NULL DEFAULT '',
  price DECIMAL(14, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(14, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'RUB',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  estimated_days INT NOT NULL DEFAULT 0,
  estimated_days_range VARCHAR(64) NOT NULL DEFAULT '',
  image_url LONGTEXT,
  notes TEXT,
  referrer_bonus DECIMAL(14, 2) NOT NULL DEFAULT 0,
  referral_bonus DECIMAL(14, 2) NOT NULL DEFAULT 0,
  referrer_email VARCHAR(255) NOT NULL DEFAULT '',
  client_bonus_mode VARCHAR(16) NOT NULL DEFAULT 'add',
  bonuses_applied TINYINT(1) NOT NULL DEFAULT 0,
  created_date DATETIME(3) NOT NULL,
  updated_date DATETIME(3) NOT NULL,
  KEY idx_orders_client_email (client_email),
  KEY idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
