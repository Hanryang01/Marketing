-- SIHM Local MySQL Schema
-- Updated: 2025-10-23
-- Current database state applied
-- Includes: users, company_history, revenue, notifications, tax_invoice_notification_settings, error_logs, notification_log, expenses

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'default_hash_for_existing_users',
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fax_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `business_license` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `account_info` text COLLATE utf8mb4_unicode_ci,
  `company_type` enum('무료 사용자','컨설팅 업체','일반 업체','탈퇴 사용자','기타') COLLATE utf8mb4_unicode_ci DEFAULT '무료 사용자',
  `approval_status` enum('승인 예정','승인 완료','기간 종료','탈퇴') COLLATE utf8mb4_unicode_ci DEFAULT '승인 예정',
  `is_active` tinyint(1) DEFAULT '0',
  `pricing_plan` enum('무료','기본','스탠다드','프리미엄','엔터프라이즈') COLLATE utf8mb4_unicode_ci DEFAULT '무료',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `registration_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `manager_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_name2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_position2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_mobile2` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_email2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountant_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountant_position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountant_mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountant_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `representative` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `msds_limit` int DEFAULT '0',
  `ai_image_limit` int DEFAULT '0',
  `ai_report_limit` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_company_type` (`company_type`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_email` (`email`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 회사 이력 테이블
CREATE TABLE IF NOT EXISTS `company_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id_string` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pricing_plan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status_type` enum('승인 예정','승인 완료','기간 종료','탈퇴') COLLATE utf8mb4_unicode_ci NOT NULL,
  `active_days` int DEFAULT '0',
  `status_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `mobile_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_approval_history` (`user_id_string`,`start_date`,`end_date`,`status_type`),
  KEY `idx_user_id_string` (`user_id_string`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_status_type` (`status_type`),
  KEY `idx_user_id_status` (`user_id_string`,`status_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 매출 테이블
CREATE TABLE IF NOT EXISTS `revenue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_license` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `payment_method` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_type` enum('무료 사용자','컨설팅 업체','일반 업체','탈퇴 사용자','기타') COLLATE utf8mb4_unicode_ci DEFAULT '기타',
  `item` text COLLATE utf8mb4_unicode_ci,
  `supply_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `vat` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_company_type` (`company_type`),
  KEY `idx_issue_date` (`issue_date`),
  KEY `idx_payment_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 알림 테이블 (서버 기반 알림 시스템)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('end_date_14days','end_date_1day','tax_invoice') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 세금계산서 알림 설정 테이블
CREATE TABLE IF NOT EXISTS `tax_invoice_notification_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `day_of_month` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_company_day` (`company_name`, `day_of_month`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_day_of_month` (`day_of_month`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 에러 로그 테이블
CREATE TABLE IF NOT EXISTS `error_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `error_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processing_date` date DEFAULT NULL,
  `error_details` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_error_type` (`error_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_processing_date` (`processing_date`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 알림 로그 테이블
CREATE TABLE IF NOT EXISTS `notification_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_notification` (`user_id`,`notification_type`,`notification_date`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_notification_date` (`notification_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 지출 테이블
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_license` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_date` date NOT NULL,
  `expense_date` date DEFAULT NULL,
  `item` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_method` enum('세금계산서','영수증','신용카드') COLLATE utf8mb4_unicode_ci NOT NULL,
  `supply_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `vat_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `transaction_type` enum('expense','income') COLLATE utf8mb4_unicode_ci DEFAULT 'expense',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_business_license` (`business_license`),
  KEY `idx_issue_date` (`issue_date`),
  KEY `idx_expense_date` (`expense_date`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
