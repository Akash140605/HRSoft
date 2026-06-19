CREATE DATABASE IF NOT EXISTS hr_gate_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hr_gate_system;

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  week_off VARCHAR(20) NOT NULL DEFAULT 'Sunday',
  shift VARCHAR(10) NOT NULL DEFAULT 'A',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS halls (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  color VARCHAR(30) NOT NULL DEFAULT 'slate',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_entries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT DEFAULT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  week_off VARCHAR(20) NOT NULL DEFAULT '-',
  shift VARCHAR(10) NOT NULL DEFAULT '-',
  hall_id VARCHAR(80) DEFAULT NULL,
  hall_name VARCHAR(120) DEFAULT 'Unnamed Hall',
  status ENUM('Present','WO','L','A') NOT NULL DEFAULT 'Present',
  source ENUM('SCAN_OR_MANUAL','HR_OVERRIDE') NOT NULL DEFAULT 'SCAN_OR_MANUAL',
  override_reason TEXT DEFAULT NULL,
  overridden_by VARCHAR(80) DEFAULT NULL,
  day VARCHAR(20) NOT NULL,
  time VARCHAR(20) NOT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code_date (code, entry_date),
  INDEX idx_entry_date (entry_date),
  INDEX idx_employee_id (employee_id),
  INDEX idx_hall_id (hall_id),
  CONSTRAINT fk_attendance_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_hall
    FOREIGN KEY (hall_id) REFERENCES halls(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  related_entry_id BIGINT DEFAULT NULL,
  INDEX idx_related_entry (related_entry_id),
  CONSTRAINT fk_log_entry
    FOREIGN KEY (related_entry_id) REFERENCES attendance_entries(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(60) PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB;

INSERT INTO settings (`key`, `value`) VALUES
('current_user_role', 'HR')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);