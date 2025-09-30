-- SIHM User Management MySQL Schema
-- PostgreSQL에서 MySQL로 변환

-- Create database
CREATE DATABASE IF NOT EXISTS `sihm_user_management` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `sihm_user_management`;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(100) UNIQUE NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) DEFAULT 'default_hash_for_existing_users',
  `user_name` VARCHAR(100),
  `department` VARCHAR(100),
  `mobile_phone` VARCHAR(20),
  `phone_number` VARCHAR(20),
  `fax_number` VARCHAR(20),
  `address` TEXT,
  `business_license` VARCHAR(50),
  `notes` TEXT,
  `account_info` TEXT,
  `company_type` ENUM('무료 사용자', '컨설팅 업체', '일반 업체', '탈퇴 사용자', '기타') DEFAULT '무료 사용자',
  `approval_status` ENUM('승인 예정', '승인 완료', '탈퇴') DEFAULT '승인 예정',
  `is_active` BOOLEAN DEFAULT FALSE,
  `pricing_plan` ENUM('무료', '기본', '프리미엄', '엔터프라이즈') DEFAULT '무료',
  `start_date` DATE,
  `end_date` DATE,
  `registration_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Manager information
  `manager_position` VARCHAR(100),
  
  -- Accountant information
  `accountant_name` VARCHAR(100),
  `accountant_position` VARCHAR(100),
  `accountant_mobile` VARCHAR(20),
  `accountant_email` VARCHAR(255),
  
  -- Additional fields
  `representative` VARCHAR(100),
  `industry` VARCHAR(100),
  
  -- Usage limits
  `msds_limit` INT DEFAULT 0,
  `ai_image_limit` INT DEFAULT 0,
  `ai_report_limit` INT DEFAULT 0,
  
  INDEX `idx_company_type` (`company_type`),
  INDEX `idx_approval_status` (`approval_status`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revenue table
CREATE TABLE IF NOT EXISTS `revenue` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(255) NOT NULL,
  `business_license` VARCHAR(255),
  `issue_date` DATE,
  `payment_date` DATE,
  `payment_method` VARCHAR(100),
  `company_type` ENUM('무료 사용자', '컨설팅 업체', '일반 업체', '탈퇴 사용자', '기타') DEFAULT '기타',
  `item` TEXT,
  `supply_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `vat` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_company_name` (`company_name`),
  INDEX `idx_company_type` (`company_type`),
  INDEX `idx_issue_date` (`issue_date`),
  INDEX `idx_payment_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User status history table (REMOVED - 기능이 company_history와 중복되어 완전 삭제됨)

-- Company history table (for approval tracking)
CREATE TABLE IF NOT EXISTS `company_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id_string` VARCHAR(100) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `user_name` VARCHAR(100),
  `company_type` VARCHAR(100),
  `pricing_plan` VARCHAR(100),
  `start_date` DATE,
  `end_date` DATE,
  `status_type` ENUM('승인 예정', '승인 완료', '기간 종료', '탈퇴') NOT NULL,
  `active_days` INT DEFAULT 0,
  `status_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `mobile_phone` VARCHAR(20),
  `email` VARCHAR(255),
  `manager_position` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_user_id_string` (`user_id_string`),
  INDEX `idx_company_name` (`company_name`),
  INDEX `idx_status_type` (`status_type`),
  INDEX `idx_status_date` (`status_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification log table (REMOVED - 프론트엔드에서 localStorage 사용)

-- Error log table (for tracking processing errors)
CREATE TABLE IF NOT EXISTS `error_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `error_type` VARCHAR(50) NOT NULL,
  `error_message` TEXT,
  `user_id` VARCHAR(100),
  `company_name` VARCHAR(255),
  `processing_date` DATE,
  `error_details` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_error_type` (`error_type`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_processing_date` (`processing_date`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;