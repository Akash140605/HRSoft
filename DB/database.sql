-- HR System Database Schema with designation support
-- Run this in MySQL to create all tables

-- Create database
CREATE DATABASE IF NOT EXISTS hr_system_db;
USE hr_system_db;

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    week_off VARCHAR(20) DEFAULT 'Sunday',
    shift VARCHAR(10) DEFAULT 'A',
    hall_id VARCHAR(50) DEFAULT 'H1',
    hall_name VARCHAR(100) DEFAULT 'Hall 1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_shift (shift),
    INDEX idx_hall (hall_id)
);

-- Create halls table
CREATE TABLE IF NOT EXISTS halls (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INT DEFAULT 50,
    color VARCHAR(20) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create entries table
CREATE TABLE IF NOT EXISTS entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    week_off VARCHAR(20),
    shift VARCHAR(10),
    hall_id VARCHAR(50),
    hall_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Present',
    source VARCHAR(30) DEFAULT 'SCAN',
    day VARCHAR(20),
    date DATE NOT NULL,
    time VARCHAR(10),
    hr_code VARCHAR(50),
    hr_action VARCHAR(50),
    override_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_date (date),
    INDEX idx_shift (shift),
    INDEX idx_hall (hall_id),
    INDEX idx_source (source)
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    by VARCHAR(50),
    employee_code VARCHAR(50),
    hall_id VARCHAR(50),
    hall_name VARCHAR(100),
    override_reason TEXT,
    at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_employee (employee_code),
    INDEX idx_at (at)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(50) PRIMARY KEY,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users
INSERT IGNORE INTO users (username, password, role) VALUES 
    ('user1', 'user123', 'USER'),
    ('hr1', 'hr123', 'HR'),
    ('admin1', 'admin123', 'ADMIN');

-- Insert default halls
INSERT IGNORE INTO halls (id, name, capacity, color) VALUES 
    ('H1', 'Hall 1', 50, 'blue'),
    ('H2', 'Hall 2', 50, 'teal'),
    ('H3', 'Hall 3', 50, 'violet'),
    ('H3', 'Hall 4', 50, 'violet');