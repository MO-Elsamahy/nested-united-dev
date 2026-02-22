-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 29, 2026 at 04:32 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `rentals_dashboard`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounting_accounts`
--

CREATE TABLE `accounting_accounts` (
  `id` char(36) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('asset_receivable','asset_bank','asset_current','asset_fixed','liability_payable','liability_current','liability_long_term','equity','income','expense','cost_of_sales') NOT NULL,
  `is_reconcilable` tinyint(1) DEFAULT 0,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accounting_audit_logs`
--

CREATE TABLE `accounting_audit_logs` (
  `id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `action` enum('create','update','delete','restore') NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` char(36) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accounting_cost_centers`
--

CREATE TABLE `accounting_cost_centers` (
  `id` char(36) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accounting_journals`
--

CREATE TABLE `accounting_journals` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(10) NOT NULL,
  `type` enum('sale','purchase','cash','bank','general') NOT NULL,
  `default_account_id` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounting_journals`
--

INSERT INTO `accounting_journals` (`id`, `name`, `code`, `type`, `default_account_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
('0f233f1f-fc5d-11f0-9aa8-04bf1b3fe074', 'الرواتب والأجور', 'SAL', 'general', NULL, '2026-01-28 17:21:46', '2026-01-28 17:21:46', NULL),
('22b7d48d-d0aa-4a67-8caf-86f5f5b5c001', 'ادوات مكتبية', '124AS', 'purchase', NULL, '2026-01-27 22:56:47', '2026-01-27 22:56:47', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `accounting_moves`
--

CREATE TABLE `accounting_moves` (
  `id` char(36) NOT NULL,
  `journal_id` char(36) NOT NULL,
  `date` date NOT NULL,
  `ref` varchar(255) DEFAULT NULL,
  `narration` text DEFAULT NULL,
  `state` enum('draft','posted','canceled') DEFAULT 'draft',
  `partner_id` char(36) DEFAULT NULL,
  `amount_total` decimal(15,2) DEFAULT 0.00,
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `attachment_url` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accounting_move_lines`
--

CREATE TABLE `accounting_move_lines` (
  `id` char(36) NOT NULL,
  `move_id` char(36) NOT NULL,
  `account_id` char(36) NOT NULL,
  `partner_id` char(36) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `debit` decimal(15,2) DEFAULT 0.00,
  `credit` decimal(15,2) DEFAULT 0.00,
  `date_maturity` date DEFAULT NULL,
  `reconciled` tinyint(1) DEFAULT 0,
  `full_reconcile_id` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `cost_center_id` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accounting_partners`
--

CREATE TABLE `accounting_partners` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `type` enum('customer','supplier','employee','other') DEFAULT 'customer',
  `tax_id` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` char(36) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `unit_id` char(36) NOT NULL,
  `platform_account_id` char(36) DEFAULT NULL,
  `platform` enum('airbnb','gathern','whatsapp','manual','unknown') DEFAULT NULL,
  `guest_name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `checkin_date` date NOT NULL,
  `checkout_date` date NOT NULL,
  `amount` decimal(12,2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'SAR',
  `notes` text DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `unit_id`, `platform_account_id`, `platform`, `guest_name`, `phone`, `checkin_date`, `checkout_date`, `amount`, `currency`, `notes`, `created_by`, `created_at`) VALUES
('d01aea25-4502-4271-a9ea-54728345af35', '91f324e6-33fc-4b5b-b9f8-8d695a1610ed', NULL, 'manual', 'Reserved', NULL, '2026-01-25', '2026-01-29', 0.00, 'SAR', 'تم التحويل من iCal - Reserved', NULL, '2026-01-29 15:26:47');

-- --------------------------------------------------------

--
-- Table structure for table `browser_accounts`
--

CREATE TABLE `browser_accounts` (
  `id` char(36) NOT NULL,
  `platform` enum('airbnb','gathern','whatsapp') NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `account_email` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `platform_account_id` char(36) DEFAULT NULL,
  `session_partition` varchar(255) NOT NULL,
  `last_notification_at` datetime DEFAULT NULL,
  `has_unread_notifications` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` char(36) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `debug_port` int(11) DEFAULT NULL,
  `user_data_dir` varchar(500) DEFAULT NULL,
  `ws_endpoint` varchar(500) DEFAULT NULL,
  `last_connected_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `browser_accounts`
--

INSERT INTO `browser_accounts` (`id`, `platform`, `account_name`, `account_email`, `notes`, `platform_account_id`, `session_partition`, `last_notification_at`, `has_unread_notifications`, `is_active`, `created_by`, `created_at`, `updated_at`, `debug_port`, `user_data_dir`, `ws_endpoint`, `last_connected_at`) VALUES
('0a459053-5fc3-485f-8e75-8c9862b2e9c3', 'whatsapp', 'THE NEST', NULL, NULL, NULL, 'whatsapp-1765701466884-7ivhtszzg', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-14 08:37:46', '2026-01-29 02:28:02', 51581, 'D:\\rentals-dashboard\\browser-data\\0a459053-5fc3-485f-8e75-8c9862b2e9c3', 'ws://127.0.0.1:51581/devtools/browser/cf48185f-48ea-417a-92ee-74c078d66165', '2026-01-29 02:28:02'),
('27536267-9338-477d-aefd-3a7f3725f24c', 'airbnb', 'حمد العتيبي', NULL, NULL, '8ce9858c-d1a7-466d-b1e1-a9c70159f7f7', 'airbnb-1765639552548-70e8s2su2', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-13 15:25:52', '2025-12-13 15:25:52', NULL, NULL, NULL, NULL),
('3f2a27aa-2662-4600-8c62-565cf6a69e16', 'gathern', 'حمد العتيبي', NULL, NULL, '8ab0eba2-d75c-4ebc-8910-515e1349d362', 'gathern-1765633252890-rgb4adhyy', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-13 13:40:52', '2025-12-13 13:40:52', NULL, NULL, NULL, NULL),
('534f1f79-d649-4b8a-b5f7-a2807b37349e', 'gathern', 'The Nest', NULL, NULL, '4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'gathern-1765632698515-tpc6cbog8', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-13 13:31:38', '2025-12-13 13:31:38', NULL, NULL, NULL, NULL),
('65816581-feaf-407a-99e2-4eb840142026', 'gathern', 'أبو نواف', NULL, NULL, '0986fffc-c919-461a-a374-f712bf7cfccd', 'gathern-1765627371100-0dqwzeinl', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-13 12:02:51', '2025-12-13 12:02:51', NULL, NULL, NULL, NULL),
('69b395d6-446f-43fd-9606-2443ce2bc6b2', 'airbnb', 'سليمان البازعي', NULL, NULL, '400644b5-76a8-4c20-ba43-0a5747a199d0', 'airbnb-1765634082584-4hjhfk7im', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-13 13:54:42', '2025-12-13 13:54:42', NULL, NULL, NULL, NULL),
('6ec50d3d-8f7c-4b9d-aa17-2747c2ff1b1e', 'whatsapp', 'OPNEST', NULL, NULL, NULL, 'whatsapp-1765701393610-p40cdpuv8', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-14 08:36:33', '2025-12-14 08:36:33', NULL, NULL, NULL, NULL),
('7530460e-c2e6-440d-b846-c54c79c20fc5', 'gathern', 'سليمان البازعي', NULL, NULL, '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'gathern-1765633550928-72znplm7t', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-13 13:45:50', '2025-12-13 13:45:50', NULL, NULL, NULL, NULL),
('7e77df92-8c3c-4891-a714-2cdd012a2f02', 'airbnb', 'The Nest', NULL, NULL, 'd28f0fd7-5568-4b7e-953b-3a6e52ab38eb', 'airbnb-1765634322408-zubhpy9cm', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-13 13:58:42', '2025-12-13 13:58:42', NULL, NULL, NULL, NULL),
('9e4febff-75f4-4b6a-9f78-803d9a8ca475', 'airbnb', 'فيصل العتيبي', NULL, NULL, '50c21763-9749-4ed3-b521-3fb218da5269', 'airbnb-1766057601041-4tn94v16t', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-18 11:33:21', '2026-01-29 02:45:21', 60979, 'D:\\rentals-dashboard\\browser-data\\9e4febff-75f4-4b6a-9f78-803d9a8ca475', 'ws://127.0.0.1:60979/devtools/browser/3a9f0c66-3e08-44c2-b5ba-0f28466e1df5', '2026-01-29 02:45:21'),
('ada4193c-9814-48ce-9aae-d481d58e99ef', 'gathern', 'فيصل العتيبي', NULL, NULL, '2f4b54f1-8453-4b51-8b73-f403e61d4868', 'gathern-1766056164868-alkhbtvig', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-18 11:09:24', '2026-01-29 15:28:31', 49748, 'D:\\rentals-dashboard\\browser-data\\ada4193c-9814-48ce-9aae-d481d58e99ef', 'ws://127.0.0.1:49748/devtools/browser/fee5bc3a-ac75-4f94-9dd5-0d7efee43178', '2026-01-29 15:28:31'),
('da29a41d-edad-4bed-b00b-a07e400db145', 'gathern', 'أبو فيصل', NULL, NULL, 'af5f4d20-014c-4bd9-99c2-19a7f100a859', 'gathern-1765627497560-3byd3ciaj', NULL, 0, 1, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-13 12:04:57', '2025-12-13 12:04:57', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `browser_notifications`
--

CREATE TABLE `browser_notifications` (
  `id` char(36) NOT NULL,
  `browser_account_id` char(36) NOT NULL,
  `detected_at` datetime DEFAULT current_timestamp(),
  `notification_type` varchar(100) DEFAULT NULL,
  `is_acknowledged` tinyint(1) NOT NULL DEFAULT 0,
  `acknowledged_by` char(36) DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `crm_activities`
--

CREATE TABLE `crm_activities` (
  `id` varchar(36) NOT NULL,
  `deal_id` varchar(36) DEFAULT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `type` enum('note','call','meeting','email','status_change','log') NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `performed_by` varchar(36) DEFAULT NULL,
  `performed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `crm_activities`
--

INSERT INTO `crm_activities` (`id`, `deal_id`, `customer_id`, `type`, `title`, `description`, `performed_by`, `performed_at`) VALUES
('0acb4fe8-d469-4f65-816e-7a9264e5ea0f', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من proposal إلى contacting', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 14:01:00'),
('0e0bcbf9-4d0c-4195-9fb3-0f6fea94af9c', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من proposal إلى negotiation', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-28 18:00:47'),
('15ee2045-4605-455a-8c12-f4606d500e28', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من won إلى proposal', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 14:00:58'),
('2ec29736-4399-4dba-8cdc-9ebbe21be0d6', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من contacting إلى proposal', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-28 18:00:44'),
('3b62e36f-010e-46ac-bb83-d6c3a85b2978', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من contacting إلى proposal', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 14:01:07'),
('3c486fcc-14d3-479f-bff5-885bd6f1df7d', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من negotiation إلى won', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 14:01:13'),
('6a399e23-e793-4de1-9731-799799bb1910', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'log', 'إنشاء صفقة', 'تم إنشاء الصفقة: ايجار وحدة', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-28 18:00:41'),
('afb05174-fa57-40f2-9277-c90394c1a0b4', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من won إلى lost', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-28 18:00:57'),
('b104dc2d-024b-48a8-a288-f3d645042d73', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تم إغلاق الصفقة', 'تم إغلاق الصفقة', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-28 18:23:00'),
('bcb30e83-df34-4abe-9532-543611031440', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من negotiation إلى won', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-28 18:00:51'),
('db418bd8-1b6d-46fa-929b-3e9d9a8bf592', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تم إغلاق الصفقة', 'تم إغلاق الصفقة', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 14:01:21'),
('e448f6ca-6ee1-4be4-a19e-ca0320197974', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من proposal إلى negotiation', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 14:01:10'),
('ee0b05ea-e337-4afc-9637-57b157fcb71c', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'تغيير مرحلة', 'تم تغيير حالة الصفقة من lost إلى won', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-28 18:00:58'),
('fc9fda3c-f76f-4be2-9633-ec1b8632b462', '1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'status_change', 'إعادة فتح الصفقة', 'إعادة فتح الصفقة', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 14:00:55');

-- --------------------------------------------------------

--
-- Table structure for table `crm_automation_rules`
--

CREATE TABLE `crm_automation_rules` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `trigger_event` enum('deal_stage_change','deal_created','customer_created','activity_created') NOT NULL,
  `trigger_condition` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`trigger_condition`)),
  `action_type` enum('create_notification','send_email','create_activity','update_field') NOT NULL,
  `action_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`action_config`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `crm_automation_rules`
--

INSERT INTO `crm_automation_rules` (`id`, `name`, `description`, `trigger_event`, `trigger_condition`, `action_type`, `action_config`, `is_active`, `created_at`, `updated_at`) VALUES
('788b1342-fc78-11f0-8fef-04bf1b3fe074', 'إشعار عند إتمام صفقة', 'إرسال إشعار تلقائي عندما تصل الصفقة لمرحلة \"تم الاتفاق\"', 'deal_stage_change', '{\"stage\": \"won\"}', 'create_notification', '{\"title\": \"صفقة جديدة!\", \"message\": \"تم إتمام صفقة بنجاح\"}', 1, '2026-01-28 18:37:59', '2026-01-28 18:37:59');

-- --------------------------------------------------------

--
-- Table structure for table `crm_customer_tags`
--

CREATE TABLE `crm_customer_tags` (
  `customer_id` varchar(36) NOT NULL,
  `tag_id` varchar(36) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `crm_customer_tags`
--

INSERT INTO `crm_customer_tags` (`customer_id`, `tag_id`, `assigned_at`) VALUES
('f659b7e6-f615-40f3-956a-8fb523259d7b', '7886ae6e-fc78-11f0-8fef-04bf1b3fe074', '2026-01-29 14:02:34');

-- --------------------------------------------------------

--
-- Table structure for table `crm_custom_stages`
--

CREATE TABLE `crm_custom_stages` (
  `id` varchar(36) NOT NULL,
  `label` varchar(100) NOT NULL,
  `stage_key` varchar(50) NOT NULL,
  `color` varchar(50) DEFAULT 'bg-gray-100',
  `stage_order` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `crm_custom_stages`
--

INSERT INTO `crm_custom_stages` (`id`, `label`, `stage_key`, `color`, `stage_order`, `is_active`, `created_at`, `updated_at`) VALUES
('78823958-fc78-11f0-8fef-04bf1b3fe074', 'جديد', 'new', 'bg-gray-100', 1, 1, '2026-01-28 18:37:59', '2026-01-28 18:37:59'),
('78824ef7-fc78-11f0-8fef-04bf1b3fe074', 'جاري التواصل', 'contacting', 'bg-blue-50', 2, 1, '2026-01-28 18:37:59', '2026-01-28 18:37:59'),
('7882517d-fc78-11f0-8fef-04bf1b3fe074', 'إرسال عرض', 'proposal', 'bg-purple-50', 3, 1, '2026-01-28 18:37:59', '2026-01-28 18:37:59'),
('78825219-fc78-11f0-8fef-04bf1b3fe074', 'تفاوض', 'negotiation', 'bg-yellow-50', 4, 1, '2026-01-28 18:37:59', '2026-01-28 18:37:59'),
('7882529a-fc78-11f0-8fef-04bf1b3fe074', 'تم الاتفاق', 'won', 'bg-green-50', 5, 1, '2026-01-28 18:37:59', '2026-01-28 18:37:59'),
('78825318-fc78-11f0-8fef-04bf1b3fe074', 'خسارة', 'lost', 'bg-red-50', 6, 1, '2026-01-28 18:37:59', '2026-01-28 18:37:59');

-- --------------------------------------------------------

--
-- Table structure for table `crm_deals`
--

CREATE TABLE `crm_deals` (
  `id` varchar(36) NOT NULL,
  `customer_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `value` decimal(12,2) DEFAULT 0.00,
  `stage` enum('new','contacting','qualified','proposal','negotiation','won','lost') DEFAULT 'new',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `expected_close_date` date DEFAULT NULL,
  `assigned_to` varchar(36) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('open','closed','archived') DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `crm_deals`
--

INSERT INTO `crm_deals` (`id`, `customer_id`, `title`, `value`, `stage`, `priority`, `expected_close_date`, `assigned_to`, `notes`, `created_at`, `updated_at`, `status`) VALUES
('1027a083-5554-4ce1-8678-8bb485e9e251', 'f659b7e6-f615-40f3-956a-8fb523259d7b', 'ايجار وحدة', 0.00, 'won', 'medium', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '', '2026-01-28 18:00:41', '2026-01-29 14:01:21', 'closed');

-- --------------------------------------------------------

--
-- Table structure for table `crm_notifications`
--

CREATE TABLE `crm_notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `type` enum('deal_status','new_customer','new_activity','automation','system') DEFAULT 'system',
  `link` varchar(500) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `crm_tags`
--

CREATE TABLE `crm_tags` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(50) DEFAULT 'bg-blue-100',
  `text_color` varchar(50) DEFAULT 'text-blue-700',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `crm_tags`
--

INSERT INTO `crm_tags` (`id`, `name`, `color`, `text_color`, `created_at`) VALUES
('788684c1-fc78-11f0-8fef-04bf1b3fe074', 'VIP', 'bg-amber-100', 'text-amber-700', '2026-01-28 18:37:59'),
('7886abfc-fc78-11f0-8fef-04bf1b3fe074', 'عميل جديد', 'bg-blue-100', 'text-blue-700', '2026-01-28 18:37:59'),
('7886adea-fc78-11f0-8fef-04bf1b3fe074', 'مهم', 'bg-red-100', 'text-red-700', '2026-01-28 18:37:59'),
('7886ae6e-fc78-11f0-8fef-04bf1b3fe074', 'عميل نشط', 'bg-green-100', 'text-green-700', '2026-01-28 18:37:59'),
('7886aee6-fc78-11f0-8fef-04bf1b3fe074', 'عميل محتمل', 'bg-purple-100', 'text-purple-700', '2026-01-28 18:37:59');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` varchar(36) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `national_id` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `type` enum('individual','company') DEFAULT 'individual',
  `status` enum('active','blacklist','archived') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `full_name`, `phone`, `email`, `national_id`, `address`, `notes`, `type`, `status`, `created_at`, `updated_at`) VALUES
('f659b7e6-f615-40f3-956a-8fb523259d7b', 'احمد علي', '01119870082', '', '', '', '', 'individual', 'active', '2026-01-28 17:57:12', '2026-01-28 17:57:12');

-- --------------------------------------------------------

--
-- Table structure for table `hr_announcements`
--

CREATE TABLE `hr_announcements` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `target_departments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`target_departments`)),
  `is_pinned` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `published_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_announcements`
--

INSERT INTO `hr_announcements` (`id`, `title`, `content`, `priority`, `target_departments`, `is_pinned`, `is_active`, `published_at`, `expires_at`, `created_by`, `created_at`) VALUES
('43f893f9-e7fd-4af4-94bc-cea70a92115e', 'إجازة عيد القيامة المجيد', 'كل عام وانتم بخير بخصوص تلك الايام المفترجة أعادها الله علينا وعليكم بالخير واليمن والبركات\nتقبل الله منا ومنكم', 'urgent', NULL, 0, 1, '2026-01-29 15:47:01', '2025-01-07 00:00:00', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 13:47:01');

-- --------------------------------------------------------

--
-- Table structure for table `hr_attendance`
--

CREATE TABLE `hr_attendance` (
  `id` varchar(36) NOT NULL,
  `employee_id` varchar(36) NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `status` enum('present','absent','late','leave','holiday') DEFAULT 'present',
  `late_minutes` int(11) DEFAULT 0,
  `overtime_minutes` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_attendance`
--

INSERT INTO `hr_attendance` (`id`, `employee_id`, `date`, `check_in`, `check_out`, `status`, `late_minutes`, `overtime_minutes`, `notes`, `created_at`) VALUES
('319d93da-a135-4757-9767-62e0a6bec691', '823a8ef5-fc67-11f0-b2c4-04bf1b3fe074', '2026-01-28', '2026-01-28 17:08:12', '2026-01-28 17:08:18', 'late', 608, 128, NULL, '2026-01-28 17:08:12'),
('d76318db-9bff-4d10-a0b7-ee00f2ffdbb5', '823a86a8-fc67-11f0-b2c4-04bf1b3fe074', '2026-01-29', '2026-01-29 13:52:53', '2026-01-29 13:55:00', 'late', 412, 0, NULL, '2026-01-29 13:52:53');

-- --------------------------------------------------------

--
-- Table structure for table `hr_employees`
--

CREATE TABLE `hr_employees` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `employee_number` varchar(20) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `national_id` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `contract_type` enum('full_time','part_time','contract') DEFAULT 'full_time',
  `basic_salary` decimal(10,2) DEFAULT 0.00,
  `housing_allowance` decimal(10,2) DEFAULT 0.00,
  `transport_allowance` decimal(10,2) DEFAULT 0.00,
  `other_allowances` decimal(10,2) DEFAULT 0.00,
  `annual_leave_balance` decimal(5,2) DEFAULT 21.00,
  `sick_leave_balance` decimal(5,2) DEFAULT 30.00,
  `bank_name` varchar(100) DEFAULT NULL,
  `iban` varchar(30) DEFAULT NULL,
  `status` enum('active','inactive','terminated') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `shift_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_employees`
--

INSERT INTO `hr_employees` (`id`, `user_id`, `employee_number`, `full_name`, `national_id`, `phone`, `email`, `department`, `job_title`, `hire_date`, `contract_type`, `basic_salary`, `housing_allowance`, `transport_allowance`, `other_allowances`, `annual_leave_balance`, `sick_leave_balance`, `bank_name`, `iban`, `status`, `created_at`, `updated_at`, `shift_id`) VALUES
('823a80f6-fc67-11f0-b2c4-04bf1b3fe074', '12ba01f1-431d-4743-bdac-f2d3656a6702', NULL, 'عبده', NULL, NULL, 'abdo@nested.com', 'General', 'hr_manager', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8403-fc67-11f0-b2c4-04bf1b3fe074', '1515563a-25dd-49f1-9cce-113b4f8d598e', NULL, 'Lullwah', NULL, NULL, 'lullwah@nested.com', 'General', 'super_admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a84a7-fc67-11f0-b2c4-04bf1b3fe074', '1eab8697-b979-4f6b-87f3-875eca97bc9e', NULL, 'Heba A', NULL, NULL, 'sup1@nested.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a850d-fc67-11f0-b2c4-04bf1b3fe074', '249a8942-353f-448c-911c-2ad3b444d457', NULL, 'ahmed@work.com', NULL, NULL, 'ahmed@work.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a85a2-fc67-11f0-b2c4-04bf1b3fe074', '2a899add-5494-49e1-9854-a2efc72cf54f', NULL, 'Ghala Abd', NULL, NULL, 'quality@nested.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a860b-fc67-11f0-b2c4-04bf1b3fe074', '2c814a01-47cc-49ec-be06-d131aa1fa477', NULL, 'fatimah.nested@gmail.com', NULL, NULL, 'fatimah.nested@gmail.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a86a8-fc67-11f0-b2c4-04bf1b3fe074', '47eed255-46fc-4bce-ad1f-64030b9cde0c', NULL, 'Mustafa A', NULL, NULL, 'emp1@nested.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a871b-fc67-11f0-b2c4-04bf1b3fe074', '548bb74c-658f-4243-a35b-d343549ff5a1', NULL, 'empTest', NULL, NULL, 'emptest@test.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a87b8-fc67-11f0-b2c4-04bf1b3fe074', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', NULL, 'محمد السماحي', NULL, NULL, 'elsamahy771@gmail.com', 'General', 'super_admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8856-fc67-11f0-b2c4-04bf1b3fe074', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', NULL, 'Hadeel', NULL, NULL, 'hadeel@nested.com', 'General', 'super_admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a88cf-fc67-11f0-b2c4-04bf1b3fe074', '74fadfd8-402e-483f-9be1-dd94f246d9d9', NULL, 'Osama', NULL, NULL, 'osama@nested.com', 'General', 'accountant', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a897b-fc67-11f0-b2c4-04bf1b3fe074', NULL, NULL, 'worker@work.com', NULL, NULL, 'worker@work.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a89ff-fc67-11f0-b2c4-04bf1b3fe074', '8ef0a438-15e3-4d76-b120-c83c909b48e3', NULL, 'Abdulrahman O', NULL, NULL, 'Abdulrahman@nested.com', 'General', 'admin', '2026-01-27', 'full_time', 5000.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 17:19:19', NULL),
('823a8ab3-fc67-11f0-b2c4-04bf1b3fe074', '91f79e63-5b01-457b-bcda-af4b305d9260', NULL, 'emp3', NULL, NULL, 'emp3@nested.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8b40-fc67-11f0-b2c4-04bf1b3fe074', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', NULL, 'Fatimah M', NULL, NULL, 'admin@nested.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8c07-fc67-11f0-b2c4-04bf1b3fe074', 'b44fc69c-bc3a-4c7e-9e70-75be2b187444', NULL, 'hadeel.nested@gmail.com', NULL, NULL, 'hadeel.nested@gmail.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8c8e-fc67-11f0-b2c4-04bf1b3fe074', 'd2ca5150-e503-4d4f-9898-f97d36318567', NULL, 'Noran D', NULL, NULL, 'emp2@nested.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8d15-fc67-11f0-b2c4-04bf1b3fe074', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', NULL, 'Mahfouz S', NULL, NULL, 'support@nested.com', 'General', 'maintenance_worker', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8dd0-fc67-11f0-b2c4-04bf1b3fe074', 'eb63fb7d-d362-40fc-9c9d-e758bcc1a580', NULL, 'lullwah.nested@gmail.com', NULL, NULL, 'lullwah.nested@gmail.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8e34-fc67-11f0-b2c4-04bf1b3fe074', 'fb7f2762-b924-4ea3-a222-df962185fc89', NULL, 'mho@work.com', NULL, NULL, 'mho@work.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL),
('823a8ef5-fc67-11f0-b2c4-04bf1b3fe074', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', NULL, 'Mahmoud R', NULL, NULL, 'emp4@nested.com', 'General', 'admin', '2026-01-28', 'full_time', 5000.00, 1000.00, 500.00, 0.00, 21.00, 30.00, NULL, NULL, 'active', '2026-01-28 16:36:34', '2026-01-28 16:36:34', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `hr_payroll_details`
--

CREATE TABLE `hr_payroll_details` (
  `id` varchar(36) NOT NULL,
  `payroll_run_id` varchar(36) NOT NULL,
  `employee_id` varchar(36) NOT NULL,
  `basic_salary` decimal(10,2) DEFAULT 0.00,
  `housing_allowance` decimal(10,2) DEFAULT 0.00,
  `transport_allowance` decimal(10,2) DEFAULT 0.00,
  `other_allowances` decimal(10,2) DEFAULT 0.00,
  `overtime_amount` decimal(10,2) DEFAULT 0.00,
  `absence_deduction` decimal(10,2) DEFAULT 0.00,
  `late_deduction` decimal(10,2) DEFAULT 0.00,
  `loan_deduction` decimal(10,2) DEFAULT 0.00,
  `other_deductions` decimal(10,2) DEFAULT 0.00,
  `gosi_deduction` decimal(10,2) DEFAULT 0.00,
  `gross_salary` decimal(10,2) DEFAULT 0.00,
  `total_deductions` decimal(10,2) DEFAULT 0.00,
  `net_salary` decimal(10,2) DEFAULT 0.00,
  `working_days` int(11) DEFAULT 0,
  `absent_days` int(11) DEFAULT 0,
  `late_days` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_payroll_details`
--

INSERT INTO `hr_payroll_details` (`id`, `payroll_run_id`, `employee_id`, `basic_salary`, `housing_allowance`, `transport_allowance`, `other_allowances`, `overtime_amount`, `absence_deduction`, `late_deduction`, `loan_deduction`, `other_deductions`, `gosi_deduction`, `gross_salary`, `total_deductions`, `net_salary`, `working_days`, `absent_days`, `late_days`, `created_at`) VALUES
('010d27c9-2987-4cd4-b259-7fc61369da19', 'd641566d-6852-4632-8f51-690da6d7656a', '823a80f6-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('125604c8-1e56-4754-b600-be55f71365e7', 'd641566d-6852-4632-8f51-690da6d7656a', '823a897b-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('18d4ef56-91f8-448c-bb53-2c41606072ee', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8dd0-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('246e3202-b393-49de-bc9c-a9fdf8b4d0bc', 'd641566d-6852-4632-8f51-690da6d7656a', '823a850d-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('2f22586b-5310-4121-a1e2-0ee74c54654a', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8b40-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('341f76a6-7371-45ff-a796-7c19743ca636', 'd641566d-6852-4632-8f51-690da6d7656a', '823a89ff-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 487.50, 5000.00, 487.50, 4512.50, 0, 0, 0, '2026-01-29 13:47:27'),
('34ac14b2-9308-46ec-86b4-59a79fc00138', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8ab3-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('3c29bd95-9256-430d-a46d-5caffcb39471', 'd641566d-6852-4632-8f51-690da6d7656a', '823a860b-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('503847df-8124-4053-80d5-1d44d18a42b6', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8c07-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('5578fe42-5429-4019-8930-1cb9833b6fe6', 'd641566d-6852-4632-8f51-690da6d7656a', '823a84a7-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('623b29ab-dc73-4cea-b3fc-eac1ca5b771e', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8403-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('6655b658-6e65-41bf-abb2-7621ab5602e7', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8856-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('8f1b721d-29fc-43c4-9d68-6875e2c3148e', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8c8e-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('91b46d4d-4e6f-4340-a73c-fcc14eac4e66', 'd641566d-6852-4632-8f51-690da6d7656a', '823a88cf-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('987f14d8-c04c-48a7-8ed3-5e9c9226e93c', 'd641566d-6852-4632-8f51-690da6d7656a', '823a871b-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('9f8bd8b2-c25f-47d1-9c95-0c3e4b595006', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8ef5-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 66.67, 0.00, 211.11, 0.00, 0.00, 585.00, 6500.00, 796.11, 5770.56, 0, 0, 0, '2026-01-29 13:47:27'),
('b4219e7d-0b83-4fd4-a8a6-e4cef8d7c63c', 'd641566d-6852-4632-8f51-690da6d7656a', '823a85a2-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('c274f1c1-a0db-424f-a05a-cdc3391f8d1a', 'd641566d-6852-4632-8f51-690da6d7656a', '823a87b8-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('cff72b7a-97a3-4c86-b7e9-2a70e14d01e9', 'd641566d-6852-4632-8f51-690da6d7656a', '823a86a8-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('da06b9f4-6c9d-4952-819b-5a012c3dc591', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8d15-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27'),
('f2e24e08-24c8-44b4-bced-254f62df7a18', 'd641566d-6852-4632-8f51-690da6d7656a', '823a8e34-fc67-11f0-b2c4-04bf1b3fe074', 5000.00, 1000.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 585.00, 6500.00, 585.00, 5915.00, 0, 0, 0, '2026-01-29 13:47:27');

-- --------------------------------------------------------

--
-- Table structure for table `hr_payroll_runs`
--

CREATE TABLE `hr_payroll_runs` (
  `id` varchar(36) NOT NULL,
  `period_month` int(11) NOT NULL,
  `period_year` int(11) NOT NULL,
  `status` enum('draft','processing','approved','paid') DEFAULT 'draft',
  `total_employees` int(11) DEFAULT 0,
  `total_amount` decimal(12,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `approved_by` varchar(36) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `accounting_move_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_payroll_runs`
--

INSERT INTO `hr_payroll_runs` (`id`, `period_month`, `period_year`, `status`, `total_employees`, `total_amount`, `notes`, `approved_by`, `approved_at`, `created_by`, `created_at`, `accounting_move_id`) VALUES
('d641566d-6852-4632-8f51-690da6d7656a', 1, 2026, 'approved', 21, 122668.06, NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 16:05:48', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-29 13:47:27', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `hr_requests`
--

CREATE TABLE `hr_requests` (
  `id` varchar(36) NOT NULL,
  `employee_id` varchar(36) NOT NULL,
  `request_type` enum('annual_leave','sick_leave','unpaid_leave','shift_swap','overtime','other') NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `days_count` decimal(4,1) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `reviewed_by` varchar(36) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewer_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_requests`
--

INSERT INTO `hr_requests` (`id`, `employee_id`, `request_type`, `start_date`, `end_date`, `days_count`, `reason`, `attachment_url`, `status`, `reviewed_by`, `reviewed_at`, `reviewer_notes`, `created_at`, `updated_at`) VALUES
('4e21ee90-9367-4fd2-97a2-ef495bc5ea7a', '823a8ef5-fc67-11f0-b2c4-04bf1b3fe074', 'shift_swap', '2026-01-28', '2026-01-28', 1.0, '....................', NULL, 'rejected', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2026-01-28 19:10:48', 'لا يمكن تبديل الشيفت', '2026-01-28 17:09:01', '2026-01-28 17:10:48'),
('e624f729-2108-484d-bde2-93d63de54aa1', '823a86a8-fc67-11f0-b2c4-04bf1b3fe074', 'sick_leave', '2026-01-30', '2026-01-30', 1.0, 'مريض\n', NULL, 'pending', NULL, NULL, NULL, '2026-01-29 13:54:11', '2026-01-29 13:54:11');

-- --------------------------------------------------------

--
-- Table structure for table `hr_settings`
--

CREATE TABLE `hr_settings` (
  `id` varchar(36) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_settings`
--

INSERT INTO `hr_settings` (`id`, `setting_key`, `setting_value`, `description`, `updated_at`) VALUES
('0eda98b8-fc5d-11f0-9aa8-04bf1b3fe074', 'work_start_time', '09:00', 'وقت بداية الدوام', '2026-01-28 15:21:45'),
('0edaa010-fc5d-11f0-9aa8-04bf1b3fe074', 'work_end_time', '17:00', 'وقت نهاية الدوام', '2026-01-28 15:21:45'),
('0edaa232-fc5d-11f0-9aa8-04bf1b3fe074', 'late_grace_minutes', '15', 'دقائق السماح للتأخير', '2026-01-28 15:21:45'),
('0edaa30e-fc5d-11f0-9aa8-04bf1b3fe074', 'working_days_per_month', '22', 'عدد أيام العمل في الشهر', '2026-01-28 15:21:45'),
('0edaa3c6-fc5d-11f0-9aa8-04bf1b3fe074', 'overtime_rate', '1.5', 'معامل الإضافي', '2026-01-28 15:21:45'),
('0edaa479-fc5d-11f0-9aa8-04bf1b3fe074', 'gosi_employee_rate', '9.75', 'نسبة التأمينات على الموظف', '2026-01-28 15:21:45'),
('0f29a4bd-fc5d-11f0-9aa8-04bf1b3fe074', 'salary_expense_account_id', NULL, 'حساب مصروف الرواتب في الدليل المحاسبي', '2026-01-28 15:21:46'),
('0f29ac42-fc5d-11f0-9aa8-04bf1b3fe074', 'salary_payable_account_id', NULL, 'حساب الرواتب المستحقة (دائن)', '2026-01-28 15:21:46'),
('0f29ae4e-fc5d-11f0-9aa8-04bf1b3fe074', 'salary_journal_id', NULL, 'دفتر يومية الرواتب', '2026-01-28 15:21:46');

-- --------------------------------------------------------

--
-- Table structure for table `hr_shifts`
--

CREATE TABLE `hr_shifts` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `late_grace_minutes` int(11) DEFAULT 15,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_shifts`
--

INSERT INTO `hr_shifts` (`id`, `name`, `start_time`, `end_time`, `late_grace_minutes`, `is_active`, `created_at`) VALUES
('951305d5-5b71-4d34-ba85-ef453671cc72', 'عمرو وردية', '09:00:00', '17:00:00', 12015, 1, '2026-01-29 13:48:58');

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_tickets`
--

CREATE TABLE `maintenance_tickets` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `unit_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  `priority` enum('low','medium','high','urgent') DEFAULT NULL,
  `created_by` char(36) NOT NULL,
  `assigned_to` char(36) DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `worker_notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `maintenance_tickets`
--

INSERT INTO `maintenance_tickets` (`id`, `unit_id`, `title`, `description`, `status`, `priority`, `created_by`, `assigned_to`, `accepted_at`, `worker_notes`, `created_at`, `resolved_at`) VALUES
('311bb344-47e4-40da-9a34-875c9691ec22', 'de1cae26-9e98-4fe8-bd68-af0a69008778', 'موكيت الغرفة الثانيه', 'مطهر سيء و حروقات', 'resolved', 'medium', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '2025-12-31 10:24:33', NULL, '2025-12-31 10:24:29', '2025-12-31 10:24:38'),
('51857652-839f-437f-bcf9-86f85910061e', '0e95fed2-e03c-4f47-81b1-2962e77c5887', 'مقبض الباب ثقيل', 'الباب الخارجي لا يفتح في بعض الاحيان يكون ثقيل', 'resolved', 'urgent', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '2025-12-31 10:20:13', NULL, '2025-12-31 10:20:08', '2025-12-31 10:20:19'),
('593147a0-6e9c-4789-a13c-69c888850f20', '771e5211-e7d9-4123-af91-504128484e53', 'موكيت غرفة السينما', 'حروقات و مظهر سيء', 'resolved', 'medium', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '2026-01-01 10:33:44', NULL, '2026-01-01 10:33:39', '2026-01-01 10:33:49'),
('60a31478-515b-4467-aaa5-7fbfa9cc0639', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', 'بوية الصاله', 'منظر سيء', 'resolved', 'medium', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '2025-12-31 10:21:56', NULL, '2025-12-31 10:21:52', '2025-12-31 10:22:00'),
('ee6e3790-c248-4534-9c13-6a52a39c36f3', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', 'لمبة الصاله', 'لا تعمل', 'resolved', 'urgent', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '2025-12-31 10:23:25', NULL, '2025-12-31 10:23:17', '2025-12-31 10:23:32'),
('fa50dda5-9d5d-4f14-81ba-5039c6b8972e', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', 'برواز المكيف', 'لايوجد', 'resolved', 'urgent', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '2025-12-31 10:22:44', NULL, '2025-12-31 10:22:39', '2025-12-31 10:22:47');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `type` enum('booking_created','booking_updated','booking_cancelled','maintenance_created','maintenance_status_changed','unit_activated','unit_deactivated') NOT NULL,
  `unit_id` char(36) DEFAULT NULL,
  `platform` enum('airbnb','gathern') DEFAULT NULL,
  `maintenance_ticket_id` char(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `audience` enum('all_admins','all_super_admins','all_users','maintenance_workers') NOT NULL DEFAULT 'all_admins',
  `recipient_user_id` char(36) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `type`, `unit_id`, `platform`, `maintenance_ticket_id`, `title`, `body`, `data`, `audience`, `recipient_user_id`, `is_read`, `created_at`) VALUES
('000504eb-d3fe-42f5-a180-572519500912', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 01:45:16'),
('00ad104c-6ebf-4e7d-a357-ccebc902a590', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:23:26'),
('011b7e89-8371-4396-960c-929b9bdd8df8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 03:35:22'),
('019f93ce-848b-4606-964e-89b37f1f63da', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:06:36'),
('01a4d3b3-cafb-44d1-9081-18fb1e57c556', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:28:43'),
('01b810ce-1347-4638-859b-f81f9c66f8cf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 16 حجز من 19 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 03:36:23'),
('01ec9a06-53de-4787-8a63-f76797b2ef10', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:12:48'),
('0203c309-4d35-4e10-8192-87f0200169bc', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 09:38:21'),
('020c1262-85bf-4de9-993c-89f33ac0a6ca', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:20:08'),
('020efbdb-aa2c-48ca-85d2-14ddf4a419bc', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:26:15'),
('0230cf4d-944f-48f1-87ca-4577c7fa5b93', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 09:41:10'),
('0242c73d-b939-476f-86dd-b7086297c3ad', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 01:49:17'),
('025c013e-3e82-4837-b56e-ce8b6314b462', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:19:41'),
('0267435f-2187-4621-a897-5877bcc1be80', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:57:42'),
('027822ed-c2de-46b4-a54e-7ba8c6232b73', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:12:08'),
('027ce339-e1f8-4e60-b0a7-d638786dad1c', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:23:17'),
('02928434-184d-4761-bd8c-aa5294f2faf5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:17:41'),
('037fb314-85f4-4d96-89d4-206c006c61f4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:03:43'),
('039a9e53-0f3a-4d0f-8c98-7f0b2e8340d5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:19:24'),
('04324d1b-d74f-4e51-8729-82815f34bb85', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 02:51:03'),
('04b34860-0201-47b3-b611-2ab912d89710', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 10:06:47'),
('0540a111-01fc-4d81-88a1-6f97666f37c4', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة الصيانة', 'قبل العامل support تذكرة الصيانة للوحدة: شقة رقم 7', '{\"unit_id\":\"de1cae26-9e98-4fe8-bd68-af0a69008778\",\"ticket_id\":\"311bb344-47e4-40da-9a34-875c9691ec22\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"accepted_at\":\"2025-12-31T10:24:33.22+00:00\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:24:33'),
('05418dfd-4944-45b4-a336-3c0162c8716d', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '2a899add-5494-49e1-9854-a2efc72cf54f', 1, '2026-01-01 10:33:45'),
('05c63801-08ee-419a-aea3-16515fdc9923', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:37:38'),
('05cfbb80-fd6d-4958-99c1-03e8100585cd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:21:08'),
('060fe066-58ee-44ac-a977-23cbf76daf15', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:54:26'),
('06571f76-1377-4d82-8dd9-dc07bd24b296', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:23:17'),
('06a06239-f444-48db-b2f1-e1de35ff8153', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:22:45'),
('06c84283-8323-4687-b9af-dda3b8d3ed70', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:08:26'),
('06db9d64-14c4-4e88-89fb-8e39883c8225', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:15:26'),
('06f360a1-9d75-4127-8add-d3710d5f986b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 22:16:47'),
('07359a12-fd4d-4743-b978-b3d6bb6de06b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 02:20:16'),
('07810683-ebfc-4998-ad30-a23d5974e97b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:10:31'),
('07d37ada-0a74-45af-bdbd-2f54693a3e2b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:02:30'),
('0834ef4d-27e7-44bb-b897-9498c6cd2da2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 10:17:08'),
('08b745db-0e5b-4d00-96c4-c0fa49b7a2a1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:38:35'),
('0943a747-2038-4f02-83b8-20d43857ecd0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 02:31:49'),
('09ea24e5-fd9a-4625-b5f6-cafdcebfe201', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:53:21'),
('0a12692d-b0de-4a47-9aaa-da00252c17c5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 04:56:30'),
('0a24c933-1554-473d-a924-d423249cf09b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:54:42'),
('0a34639a-8f26-4be3-b8ed-3b4e857b6abc', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 14:20:26'),
('0a577e1d-8a0f-44c4-a078-2fd4321ba809', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:22:45'),
('0a67637b-5a19-4005-a428-790022987406', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 01:01:02'),
('0ad7d995-0ced-4698-b589-273d4d2c6b0f', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:21:57'),
('0b12d8c7-a3c9-4264-a3cc-e46f3471f5f8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 35 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:12:12'),
('0b2443fc-6990-4030-ace9-4ac9496dae99', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:07:57'),
('0b359c5e-70f8-4f0b-a2b3-f639c5628beb', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:24:29'),
('0b72c1a9-15f5-44e2-b11d-3f6ba38edaf2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:05:38'),
('0bfcb2fc-07ec-42e9-b5f7-c9d57249a0ef', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:22:43'),
('0bfdbf11-8e87-48e3-86f2-112bf4c18376', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 35 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:46:09'),
('0c1bb3df-0061-4609-b3b1-0a16c75c94fe', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 08:40:30'),
('0c8ba58b-40fb-4ad3-bcc6-e52620b1ea0a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:23:28'),
('0cb96e69-1c4d-47b3-8dd9-8e3ecfe0e9f1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 15:23:45'),
('0cdcd027-06f1-4122-9d9c-e116a9c34d80', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2026-01-01 10:33:40'),
('0d4ea810-edb0-45d8-906f-b7d8b8960662', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:22:40'),
('0d96d42b-dae6-4aab-b24e-48ec9262bd6d', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:21:57'),
('0dde45bc-9e77-4066-ae5d-2c4c77e9e323', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 26 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:36:54'),
('0dde9330-8f28-470d-af43-e8d1553f47db', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:35:17'),
('0e0fe9f2-6ef6-48c2-a592-d4f71ec70ec9', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة للوحدة: شقة رقم 4', '{\"status\":\"open\",\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"priority\":\"urgent\",\"ticket_id\":\"fa50dda5-9d5d-4f14-81ba-5039c6b8972e\"}', 'all_admins', NULL, 1, '2025-12-31 10:22:39'),
('0e3364f0-5698-4aa5-a0b1-04d2a8466c18', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:45:18'),
('0f3d5ba5-ecb1-4b8f-9b0f-03902da04531', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:07:02'),
('0f69d11b-08e9-48ab-af78-bb1c9b5f36d9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 11:13:09'),
('0fa87991-dd66-4e2b-ba03-a6014cc29d30', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 24 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 08:29:59'),
('0fdcc343-a271-49d0-90ad-791993549555', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:08:42'),
('10337c77-e654-47e7-b6e0-2f92b42f4e4f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 15:46:41'),
('10696e44-7654-43cb-b4bc-432d372cd878', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 08:14:52'),
('10743064-c3ef-41d1-b666-bdb37b019214', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:52:31'),
('10814cb6-5791-43ca-ad50-721b6df46def', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 16:06:23'),
('10c2ef68-3851-47f7-a164-f1b79859999b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 10:50:11'),
('1119cc44-a9af-45a2-91ec-41580f0db3ca', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 22:50:37'),
('119cc458-5053-49e3-91b6-3271ee533330', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 10:12:59'),
('11bef3be-f742-4e55-8310-22b6653d122f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:23:42'),
('122b5fee-2ac4-4db1-ad3f-16add209b0f3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 05:23:45'),
('1244a9b5-e815-4ef2-a053-8e437eac7679', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:59:50'),
('12912a08-b350-466c-8f12-4566e3e30339', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 20:32:53'),
('12c3d157-ca83-4e82-a564-584e4441f97e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:01:21'),
('12d1a0f4-0bd4-4a7b-9322-a318ee44f753', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:42:35'),
('12fa1f3d-7106-445d-b853-0f59541d2514', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:21:52'),
('134e9868-b128-432e-8e6d-cff22e6ecfa8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 07:46:44'),
('13775c39-1556-410d-b46b-ecb06073fa88', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:21:57'),
('1383b238-3914-4a90-98c4-c9d2893b0957', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:20:40'),
('13e98850-2d40-4a7c-a756-0a74f56071ad', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 23:45:40'),
('14141dc2-9b08-4841-9af6-0fd4facec015', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 07:05:23'),
('1484fb9d-48f2-48ec-a10f-8822af9a3b1d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 06:17:41'),
('14e00f1f-883f-4254-b030-e7dc6513a36c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 15:13:02'),
('14e1a870-0dd5-4d11-91ac-9546e50ccda7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:11:47'),
('15405561-86b2-42de-81f2-a1582e66b43c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:20:24'),
('15b4047f-aae6-4a78-aabf-10ec65016af8', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:20:08'),
('15d1c5e2-2419-4e27-8601-c7cab0071221', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة للوحدة: شقة رقم 3', '{\"status\":\"open\",\"unit_id\":\"0e95fed2-e03c-4f47-81b1-2962e77c5887\",\"priority\":\"urgent\",\"ticket_id\":\"51857652-839f-437f-bcf9-86f85910061e\"}', 'all_admins', NULL, 1, '2025-12-31 10:20:08'),
('164e8989-aece-4f8e-ad4b-178ecec56cae', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 5 الروضة إلى: قيد التنفيذ', '{\"unit_id\":\"771e5211-e7d9-4123-af91-504128484e53\",\"ticket_id\":\"593147a0-6e9c-4789-a13c-69c888850f20\",\"new_status\":\"in_progress\",\"old_status\":\"open\"}', 'all_admins', NULL, 1, '2026-01-01 10:33:44'),
('16b5ae8b-b83a-440a-93ae-fc8d582b17f2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:00:06'),
('16e43b4f-e18f-47d3-aa45-400b623669f0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 05:33:00'),
('172e55c1-abd5-40ee-831e-56d998ba343d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:54:31'),
('17b4a32d-73a0-407a-b718-9b670a81a535', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:20:08'),
('185dc361-53bd-4828-9ca1-ecbd97884e02', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 15:32:57'),
('18e0bcb1-2005-47af-b1f2-401aa2851f5d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:38:52'),
('1942edb9-e813-4be5-be56-bed27995d923', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 14:37:19'),
('19610bfe-53cf-45c6-85e0-c4cd842ec43b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:35:04'),
('1967a0f5-8605-487a-b689-6c5ae064a4ae', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:08:44'),
('1a70d8ab-3904-40de-9700-321cc8c81065', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:49:31'),
('1ac5d725-575c-49aa-bb33-9639309edf56', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:16:45'),
('1b33bea9-89c7-4fb0-8ea3-6881306bba44', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 08:11:44'),
('1b693cda-1e2e-4d06-a3a1-5b7ba7e56e5f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:22:29'),
('1b6b6f9b-d965-45c6-a493-4a1517965898', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:03:00'),
('1bcdd457-ef23-4643-aaaa-4bc6f4b7201a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 10:17:19'),
('1beead51-0c18-43d6-ba8c-491945b328d7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:47:03'),
('1c0545c0-f5bc-42b2-888e-6b150ecba7c4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 16:57:20'),
('1c07f9d5-40df-429f-b568-ab6cf054dbac', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:20:14'),
('1ca0b234-4b06-451f-8a9d-94e4991dd633', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 08:52:45'),
('1caf534c-f069-44e1-9f95-5b59cbddb0a2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 11:57:17'),
('1cb239b1-db10-4578-96bc-7ed6669d412a', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:20:14'),
('1cd3b9a1-b371-4082-8321-1b13614dca67', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:33:37'),
('1d29823f-a504-4c3c-84a2-4d49ce5bb18b', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:24:29'),
('1d3202d2-dd48-43c9-9563-55f32390af42', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:56:38'),
('1d873413-456c-409d-9814-155bc78b74b2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 00:05:19'),
('1dae5d8c-f140-4cca-a09f-1d76d376c3d6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 05:03:09'),
('1db647c4-185c-498e-9c75-262259665d35', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 08:13:50'),
('1db66e85-c99b-4185-bfc5-c916ea3e9a64', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:36:08'),
('1dd039ad-7d9d-47e1-8e40-3889bfdd76d7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 15:16:40'),
('1dd33302-6310-45ac-aead-ba0e6a279345', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:56:26'),
('1dee0748-981f-4837-82db-ae0b78366de8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 35 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:18:31'),
('1e30abff-894d-43c9-ace7-58ddbc2bd627', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 10:50:07'),
('1e814e10-b9a4-4881-9f63-0e07b907bd66', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:20:57'),
('1eb195ae-1f65-43eb-ba6f-db7879347842', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2026-01-01 10:33:40'),
('1ec24efd-eb92-4249-9b39-2c968d23b7a7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:16:50'),
('1ef2f559-7581-4dee-9d8e-ced09792e6b1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 03:57:22'),
('1efb28b6-2224-4943-9804-76469eb177bb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 02:52:58'),
('1efda0b4-b259-4e99-84a3-26d80a4305ca', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 14:31:18'),
('1f011c7f-a994-4fb3-bcd2-080ae6e2c8aa', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:12:22'),
('1f357e2c-ae3d-486a-833f-0e6099b1e500', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:06:19'),
('1fc5cdf7-c052-436f-b2a6-46ffddb58a11', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:57:52'),
('1fee36f7-92da-4719-9cb0-bd4299281bc6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:44:37'),
('1ff4ba6a-a53f-44d9-99dc-3bc2423d84af', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:21:52'),
('1ffe4287-7955-4fcc-8159-ba005961ea24', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:28:13'),
('20245eb4-6977-4f1b-976c-ac1c7bcd4a44', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:22:13'),
('203c0a89-165e-4c1c-94be-0f93866e1622', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 2 حجز من 1 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-11 03:22:50'),
('2052812f-2484-4f93-98fe-917a1e7599d3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:06:10'),
('205c6830-6d18-42f7-b250-9d72b0e672e3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 07:50:39'),
('209115ee-4533-41dc-b526-c416eb4fb7e7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:21:25'),
('20be480f-14d5-4e42-9836-5af00d034ace', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:30:10'),
('20be670f-b534-4bf0-a5fe-1127f7fb9223', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:43:32'),
('20eac892-d0e4-42d6-b0ca-227abbf47b0c', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:22:40'),
('20f92958-a988-4826-9b37-b7610fb0b371', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:38:11'),
('2179f2d4-5bc6-40a2-87a8-2dc80742eb43', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:22:40'),
('2191360b-47ca-4370-8485-d20b16289054', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 20:43:08'),
('21a928b4-2ab3-479c-ba52-a59f29aa24c9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 20:56:06'),
('225b9b4d-be38-4d7c-a739-bce42d231bf9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 01:37:28'),
('226f0f76-3d65-458a-af90-d811b6d5ac45', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:20:14'),
('22d517f2-c653-491a-a3a6-5aafb74e8f33', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:33:19'),
('2310984e-7abf-4bcf-8bf0-5c0814a18438', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:21:57'),
('232eb3fd-ada8-4e3b-8eb0-f926def69087', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:07:18'),
('23554c0b-35a0-463f-89b4-f27b11e9349f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 36 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:55:04'),
('23556907-82b2-4d73-8548-ac8797371adf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:07:01'),
('239a03ac-9768-455f-b8df-e0a1fabff6b7', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة لك', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة. يمكنك قبولها من صفحة الصيانة.', NULL, 'all_users', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2026-01-01 10:33:40'),
('23d2175a-2c84-4e73-8d24-8ecc42fcc840', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 16:58:40'),
('23e42d3c-3ddf-4a29-9316-6eb3cdecd14a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 23:56:38'),
('249eb7c2-b39a-49a3-909f-5fbef55317d9', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:24:33'),
('254b42ac-0a1d-4511-a66c-51059917d9c3', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:21:57'),
('261b17e7-6865-4509-b79d-c7c21e7a6e59', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:21:25'),
('26358fa5-129c-42f7-b5a2-f0eac34c36f1', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2026-01-01 10:33:45'),
('263ae4c9-30af-4545-acb9-ce8ddc44b84a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 09:31:20'),
('26778840-2d1f-4dbf-a0fd-058ed47df4e4', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة الصيانة', 'قبل العامل support تذكرة الصيانة للوحدة: شقة رقم 4', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"fa50dda5-9d5d-4f14-81ba-5039c6b8972e\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"accepted_at\":\"2025-12-31T10:22:44.434+00:00\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:22:44'),
('26a1fe31-93f6-49a3-a29d-6193e7afae00', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 01:00:59'),
('26a827bd-486a-4197-9373-adba77d6d27a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 05:13:32'),
('26cc178d-0f0d-4bc2-8ad4-cd3b0898e229', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 06:58:39'),
('26e95c66-f298-4104-b9ee-7217651f2ea4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 10:09:57'),
('27c060aa-0c27-4375-939a-7d86a5a33f94', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2026-01-01 10:33:40'),
('28bd2674-f391-4558-adc5-8a25bd7459d1', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:23:26'),
('28fb7809-0369-4dec-9dfc-4f33700c1846', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 14:25:25'),
('2901bb4d-b965-4c6f-b7fd-e885c5276a10', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 00:31:33'),
('293bd7c0-e4cc-4300-b3a2-a95b2a2be790', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:23:17'),
('29649825-c3e2-4404-b7e1-5eab54da828f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:24:06'),
('2983108b-b3d8-4b04-90d5-957ef2432016', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم تعيين تذكرة صيانة', 'تم تعيين تذكرة صيانة للوحدة شقة رقم 4 إلى العامل: support', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"ee6e3790-c248-4534-9c13-6a52a39c36f3\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:23:25'),
('29b17a98-0b89-4bde-ad5b-bc50e4471704', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:24:16'),
('2a659a4e-4610-45eb-9a31-f4c96abe5fa8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:11:07'),
('2a66c0df-ac9c-4133-a3fd-d2802a6f271a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 14:49:23'),
('2a77ea71-b615-43a7-ad08-b7c6325af7ec', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 11:25:10'),
('2ac14108-3da8-4282-8836-634d6349382c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 19:58:37'),
('2adc829e-5e8d-4015-bac6-fb97d36c112e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 01:04:28'),
('2b768d05-57ae-43cf-8864-46531719ccce', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:29:32'),
('2c052c11-6383-4328-a27c-4578e16f3562', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 03:49:11'),
('2c0cb2ec-6c4f-4805-834c-b80feb7cfb21', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 36 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:48:51'),
('2c361d92-f0e6-4253-acbb-5a97c2d5f8a3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:05:20'),
('2c4bff0f-b630-4fd0-97e4-329b593a79cb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:27:05'),
('2cb72419-f6f9-48cc-96f6-78666b1d46b4', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم تعيين تذكرة صيانة', 'تم تعيين تذكرة صيانة للوحدة شقة رقم 7 إلى العامل: support', '{\"unit_id\":\"de1cae26-9e98-4fe8-bd68-af0a69008778\",\"ticket_id\":\"311bb344-47e4-40da-9a34-875c9691ec22\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:24:33'),
('2cda292c-4cf6-4ec1-8f27-59aaf0dc7cac', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:22:45'),
('2d22e8a4-3705-46fe-aa87-492e969c5994', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 08:59:15'),
('2d6e2a10-1b92-42eb-ac46-68622b56c357', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:29:37'),
('2d83fce1-3f85-4e80-8d4b-ae8afe04ec45', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 38 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 15:59:35'),
('2e6eae57-f283-41d9-bb48-9f3a1526a99b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:30:45'),
('2e89af7f-dcd3-4302-97d2-afb77fc719f2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:06:40'),
('2e9198ac-e9b1-4d44-92df-a9ca3a94bf7f', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة لك', 'تم تعيين تذكرة صيانة للوحدة: شقة رقم 5 الروضة إليك', '{\"unit_id\":\"771e5211-e7d9-4123-af91-504128484e53\",\"priority\":\"medium\",\"ticket_id\":\"593147a0-6e9c-4789-a13c-69c888850f20\"}', 'all_admins', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2026-01-01 10:33:44'),
('2f19e365-0a34-4463-badd-e18497332f98', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 15:01:42'),
('2f552c17-258c-4132-9152-b712c380fb93', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:34:49'),
('2f77f39a-9f10-494f-8103-107c7de79aa8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 07:56:58'),
('2fd5dee5-eb16-4c09-a041-bab3a37990ff', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 14:28:54'),
('3066acda-4532-4c19-8fe2-3eeb164ce958', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:15:20'),
('30c5a6e3-cca4-4ffc-9235-5e0ca86928de', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:31:44'),
('30cc9bcf-ffd3-4197-ba26-7567d039caeb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:48:18'),
('30eb14e4-343a-4feb-b861-88f7a35f4e10', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 18:34:53'),
('31162a0a-d679-473a-b7b8-792a4305d831', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:22:40'),
('31189279-176e-4d4f-a9d8-33679cb2c46d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:38:31'),
('313fec3f-0925-485d-bfec-74cdd258223e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:41:53'),
('318dcbc3-4cd0-4af3-a738-3226a523d128', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 19:08:29'),
('31b310a4-ea1a-4b3b-9dab-171f9c6d17a1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:47:39'),
('31bb4143-debe-4f18-838e-75a69bbacdf6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:18:23'),
('31bc16d4-fd2e-4a4d-937f-19cdea01c8ba', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:24:33'),
('31c71670-d5b8-4b72-8182-ae1b5d6d88a2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:33:04'),
('32345e7a-7e8a-4a06-b8a9-bde17c92b6a8', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة لك', 'تم تعيين تذكرة صيانة للوحدة: شقة رقم 4 إليك', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"priority\":\"medium\",\"ticket_id\":\"60a31478-515b-4467-aaa5-7fbfa9cc0639\"}', 'all_admins', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:21:56'),
('323b3a42-be20-4e5b-8486-9017cb7a5465', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:20:08'),
('32e52028-098f-4ef9-b826-e1d3d3b7c174', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 07:24:32'),
('33307217-8b25-487c-8848-c4f50fd8e0a5', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة للوحدة: شقة رقم 4', '{\"status\":\"open\",\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"priority\":\"urgent\",\"ticket_id\":\"ee6e3790-c248-4534-9c13-6a52a39c36f3\"}', 'all_admins', NULL, 1, '2025-12-31 10:23:17'),
('33a8e7dc-b32f-4389-b4df-3686ec8f9363', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:20:21'),
('33e20b12-d4f0-4c82-b324-68d7b5e26520', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:44:43'),
('33e9bce5-43f0-401f-81bc-41a82a5ea6b3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 04:24:03'),
('349d62fe-b328-4db8-9bf2-7453cbdc07ff', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 4 إلى: محلولة', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"fa50dda5-9d5d-4f14-81ba-5039c6b8972e\",\"new_status\":\"resolved\",\"old_status\":\"in_progress\"}', 'all_admins', NULL, 1, '2025-12-31 10:22:47'),
('3528c08a-dc6c-4fd8-9a91-d8087d86136d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:39:57'),
('35dc9963-c2ec-415c-8898-1a2d58061a88', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 4 إلى: قيد التنفيذ', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"fa50dda5-9d5d-4f14-81ba-5039c6b8972e\",\"new_status\":\"in_progress\",\"old_status\":\"open\"}', 'all_admins', NULL, 1, '2025-12-31 10:22:44'),
('36608b92-a0ef-48fa-a540-cf1c9b713ca6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:50:40'),
('366c2fad-5944-4a9d-a1d6-9ebe2a9e65b8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 15:35:41'),
('3805cf72-7358-42d2-894f-9890c72475a1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:17:29'),
('38337835-2ece-4994-ad37-debc01b5e0a0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:09:52'),
('3866eaf1-844a-4cb1-ac09-c3b64c197a2c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 13:01:42'),
('389f71db-dbb5-41a9-93cd-3948fb855e64', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 07:45:34'),
('38bc7edf-105b-462d-b8fe-585659a24c91', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:46:59'),
('3953fe52-d6dd-45a5-8a1d-4af7801d9c99', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:35:06'),
('398f1b65-dfbf-43fe-83b4-f55fd7c872a8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:31:15'),
('3a1d0b11-e0b2-4dac-b159-e98fbd0a0cdf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:35:48'),
('3a389a99-e99f-41f0-8969-7baf74d20042', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:27:25'),
('3ac0b8d1-2736-4b2b-8d03-819bcd4eb01c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:25:33'),
('3b19e0d9-b615-461b-831c-8c18d1d39cd3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 01:47:57');
INSERT INTO `notifications` (`id`, `type`, `unit_id`, `platform`, `maintenance_ticket_id`, `title`, `body`, `data`, `audience`, `recipient_user_id`, `is_read`, `created_at`) VALUES
('3b649d85-4c8d-44fb-857d-d24de493a0be', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:21:57'),
('3b9158f5-fd41-443a-b1a0-dfa28e930838', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:50:36'),
('3bb7d6e0-5f27-46cc-8cf8-06ec6bc671ac', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:36:19'),
('3c2964c4-e100-4931-90ea-59b388e9b6da', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:25:31'),
('3c9ceebc-f40c-448b-bbbe-0eae439fac99', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:42:37'),
('3cf43b2e-3b87-448d-8d4a-d050a9dfa464', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم تعيين تذكرة صيانة', 'تم تعيين تذكرة صيانة للوحدة شقة رقم 4 إلى العامل: support', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"fa50dda5-9d5d-4f14-81ba-5039c6b8972e\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:22:44'),
('3d400c94-6487-4df7-93b1-96130a862d24', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:32:43'),
('3d5d5a5c-e073-4c3a-84f3-5a372189136d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:28:09'),
('3d866b96-1922-45ad-9a7b-d735384dfd19', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:21:57'),
('3d99d274-e460-47e3-a452-127ff55c3552', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 14:51:38'),
('3da560d0-6ac6-4538-b471-b458c0f49607', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:19:10'),
('3db60793-6efa-492d-8897-51bca0b1ac49', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:04:13'),
('3dbb946d-0244-4613-9eb2-0c6e84736963', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 15:43:21'),
('3eb2c174-fee1-4dd7-91da-606df2d22d3f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:03:53'),
('3ecd9f9b-16a1-4bfa-88e6-23980eaea214', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:32:17'),
('3f167935-b800-4b00-8354-94b78efd0705', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 01:57:10'),
('3f3a290f-73a2-4ebf-b508-d9b7ba29b74a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:44:09'),
('3f6f33b9-02a9-43e7-bd45-d1ab64d9b147', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:22:40'),
('3fbf31c6-432d-4bc2-a450-856d89d99c7f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:33:22'),
('402e8123-7510-4d8e-ae30-91a4cf670489', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 18 حجز من 19 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:30:35'),
('40645994-9059-4c05-b504-bdb419386055', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:31:14'),
('4073ae58-1b78-49ed-8439-b0852ccb05cf', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:24:29'),
('40c94c25-2941-4cb0-98a9-4b0026436c76', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:21:57'),
('40e8fefc-8e90-401a-84a5-42b60b827d20', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:45:08'),
('40f0cbf2-9ca0-4d6c-96ea-76fc9ab396c7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:33:14'),
('4143a2be-27cb-4182-b3e0-0e96cedd9e32', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:56:33'),
('414518f5-d821-48a1-a414-acf0d2499350', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 04:44:37'),
('41f5f8a2-d73c-4644-9471-ca9f5764629f', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:20:14'),
('42b8ffeb-e9ed-431b-bdc1-097839206882', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:06:15'),
('42c09e77-c54e-42ef-bb2c-e676e20b4f2b', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:21:57'),
('43a1ef20-6f8b-4b0e-874f-d86de5efee2d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 01:33:55'),
('43b91213-8b4f-4b19-bffd-492c0e52c926', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 21:39:35'),
('44e9e42b-af12-4608-bdbb-1ffd7997c47b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:32:48'),
('44f38183-3d49-42e3-906e-85ea1e298f7a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:17:07'),
('45f0260f-92f7-4aec-bfd1-fc2ec9ffc220', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 20:31:07'),
('463caa24-1f63-42ae-87dc-ad1f216b9186', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 21:24:26'),
('46698b20-586f-414c-a176-0d687ab11a7a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:42:45'),
('469495ac-2111-4d14-93b3-c8b6ecfb4807', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 16:43:14'),
('4717c67a-a9e6-4494-922e-987470b9fa01', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:43:48'),
('475bdb4b-97c8-4869-99d2-27d7dea88cde', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:33:50'),
('47d234c8-fa91-44f7-a23d-0cf63748dea9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:24:37'),
('484e2fe4-53fc-4342-a53e-e3e0e5e3bd7b', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:24:29'),
('48612e3b-cd5b-4969-a901-efc09aa3908d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 02:14:05'),
('4871b590-77ee-4fa8-912d-fc67f1806b35', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 25 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 08:41:10'),
('48b850ba-2741-4322-be46-3cfb3f7f1dff', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 09:45:09'),
('48fa2bac-28f3-4d0c-add9-4942d2f5c5fb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 02:20:15'),
('4906855e-0e2a-40bb-b0a0-22da4d016b71', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:04:48'),
('49128c85-cb75-490d-9cc5-4a8771f3ddd8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 11:58:42'),
('49676483-9e19-4c70-84d9-97993f727f22', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 18:32:32'),
('49876aba-9cb2-4ccd-ae9e-e1d65a0e8a66', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:21:52'),
('49e3d4e2-eb7c-403a-bc62-efd36930891a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 09:28:35'),
('49f0828d-99b8-49dc-9da6-43b73ef79552', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:44:56'),
('4a97be00-0e71-4ff4-b230-c07996b526af', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:08:22'),
('4ade6a64-1fea-49ab-a832-115547b9e03e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 23:18:48'),
('4b2460a3-f486-4803-9a58-f8659de1ea64', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 13:58:23'),
('4c412cb8-cdc4-4b27-9016-07e966476e2b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 12:08:58'),
('4c53ac14-d6f6-4d05-9cb1-609b1f1f79ec', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 00:40:22'),
('4c551b5a-901d-453a-ac96-9d3b87e5d5d9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:14:34'),
('4cab3e22-401e-4bdb-a421-ba6b6d2bba8b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:13:26'),
('4ce9d180-7021-4971-bcf7-f36ed0bf0211', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 05:50:53'),
('4d22d3bd-dff0-48c3-a041-610dd08fec57', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 04:52:59'),
('4d59ca8f-edb3-427e-bc55-d706e74b1008', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 11:14:09'),
('4de907fd-e01f-43da-80a4-ecc1b1468f29', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:10:31'),
('4debd131-c92c-4098-9fd7-8cbaf6cf3924', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:39:56'),
('4e17f208-ff40-4b01-9131-d0fc06ea0e97', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 14:40:10'),
('4e24fbd9-8791-463b-9622-6d1f77510caf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:20:10'),
('4e4e4e37-a9e6-46be-805d-5f3dfd0d12ca', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 02:02:08'),
('4e94a293-77d7-46f2-88f5-00c7075c139b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 35 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:23:17'),
('4ed65520-0cfa-4b01-a845-425d2389ee39', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:07:01'),
('4fa1c4dd-f381-40a7-8334-a1fd9f4e0fed', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:43:33'),
('505d84cf-8d95-435f-a4a3-cc0f673a4761', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:52:58'),
('50782432-63b7-4567-a5a8-e42b17e1896c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 07:48:23'),
('50ec7405-d4bb-4867-a9e2-e9cd8d0a2c55', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:24:29'),
('519ef960-4ff9-49b5-808c-5a99605698f4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 11:58:47'),
('51f9945f-2056-423a-843b-a22648a33fa0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 26 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:59:59'),
('523e4734-6ef9-48fe-9cc2-dd49ced7289f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:01:08'),
('525f831b-26ea-4d27-8ee9-31547ba6c063', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 08:32:36'),
('52710592-1377-42d0-bdb5-e17386d644e9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 04:33:38'),
('52b11a12-6ad2-4419-805e-86b2d5c34b2b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:58:40'),
('52b30396-c860-441a-9492-4be23dbaf00a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 18 حجز من 19 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:27:53'),
('52ca155a-da3e-42d2-a9d9-6fa2a818b1b2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:01:02'),
('5338e53c-6435-467a-bd4f-3c308cee967b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:28:06'),
('53b54d28-daa0-40a0-a0f9-8bca1b40023f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:54:55'),
('542c1880-80d3-41d8-a358-a6757f2a5174', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 15:24:42'),
('54e43aa1-a286-4d3f-bd24-ba53b878aa3f', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:20:08'),
('55096018-2a96-4f62-99d4-e7e53b957b97', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:05:41'),
('559795b1-37ef-49fb-b812-78b885361479', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 13:54:36'),
('562c9535-a550-45d3-87c2-b9e1ada228cf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:30:22'),
('564be3b9-d2f0-4549-962a-970d0205372f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 10:39:16'),
('565654c9-f7f8-4f9d-a68c-037157ba6072', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:17:08'),
('56baec26-c7ca-40e1-abc5-a34097887efd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 08:33:51'),
('56dc821d-cc69-413e-bf85-edf4ee2e6649', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 13:11:08'),
('56decbdf-f873-4b7c-8f0c-3fe32962a983', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 23:22:59'),
('56e2d61c-b490-4f20-89be-a81d3cc577d3', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2026-01-01 10:33:45'),
('57c48528-b381-4140-8974-c8b0588ffdaa', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:41:58'),
('582f3a34-0ed9-4052-b631-d621b1811208', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:20:37'),
('58a1e950-f161-402a-9a8b-0561bc74357a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 13:32:52'),
('58b016f1-39f9-4224-80b1-6b719404871a', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2026-01-01 10:33:40'),
('58c20cb1-66dd-400d-8536-dd1ac3008de6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:53:01'),
('592f639c-381b-423f-8518-28104e66960d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 01:13:07'),
('593b26dd-2b9a-4bd7-8982-6db209c03bd7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 10:01:07'),
('5994fd90-2802-46a4-9f9a-a8cf2b6aa582', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:21:52'),
('5a94cdb9-1859-441f-97ba-54a0d432031a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 13:00:01'),
('5accf334-3f68-450f-927c-10109d961c62', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2026-01-01 10:33:40'),
('5b138976-d374-4ae9-80fe-4c64f3bb683b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:29:14'),
('5b4887ae-4dfc-488a-8f2f-1fe489f6db23', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:21:04'),
('5b57bafe-eeed-4107-b3aa-a6faea0e338a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:52:02'),
('5b63e8c2-02a5-405b-8f0e-a4ed4fd6b69b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:30:36'),
('5b749d78-2dfa-4cc8-a4dc-379713f9a25f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:06:29'),
('5b8cb44a-1ccb-40fe-995e-ce832eb4bbff', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:58:45'),
('5bb0ee3d-7aae-4847-ace3-198f695a6e35', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:08:24'),
('5c185475-3721-4669-9ae9-0b195327791e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 18:57:06'),
('5c3b3472-e390-400b-85db-50e3d00f113e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 15:19:18'),
('5c960e69-d6f0-4eed-b347-4a5cccb34cfe', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 09:41:58'),
('5d033117-a707-45df-995f-8af3d92765b0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 01:58:36'),
('5d6ef834-af8b-45cb-a5c0-9b058e38d57e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 18 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:16:55'),
('5d8e344b-8b14-44c7-ae69-d1d9b2af5756', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:29:49'),
('5e2f2074-c827-4c7a-a2ec-80ac109ce1f4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 14:18:36'),
('5e36df58-90ce-4f43-bc3a-ae341ecc23d9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:25:39'),
('5e60682d-11c7-4394-8c8d-0b6ce514aeba', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 00:53:29'),
('5ea45a87-980c-4c68-8642-6b33b60778d4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:44:42'),
('5f5040ab-b608-49e6-99a6-e30e2534fb08', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2026-01-01 10:33:40'),
('5fe1e4e5-9ddc-4584-b062-2eee64a20e63', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:32:10'),
('5fe56cbd-d2fb-4c17-9673-46a58caf02c0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:11:51'),
('600775f1-2f07-433a-880b-728e7e0616cd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 22:27:44'),
('608e90b8-c24d-4a0b-884b-d712c46cc3ef', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:22:45'),
('60925c21-64c7-4155-a889-5746466d070b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:17:39'),
('609d4558-e820-49cd-8a4b-0a85416e8813', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:18:04'),
('60cae2cb-9996-4c78-9b3b-4cdf052acddd', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة الصيانة', 'قبل العامل Mahfouz S تذكرة الصيانة للوحدة: شقة رقم 5 الروضة', '{\"unit_id\":\"771e5211-e7d9-4123-af91-504128484e53\",\"ticket_id\":\"593147a0-6e9c-4789-a13c-69c888850f20\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"accepted_at\":\"2026-01-01T10:33:44.744+00:00\",\"worker_name\":\"Mahfouz S\"}', 'all_admins', NULL, 1, '2026-01-01 10:33:44'),
('6135f028-cc6d-4d87-8460-664ffa24d9e8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:33:31'),
('6156ede7-9423-43eb-8aac-db24f14e5ce0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 19:14:34'),
('6158e618-531f-4fcb-9055-a1d1cee670dd', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 5 الروضة إلى: محلولة', '{\"unit_id\":\"771e5211-e7d9-4123-af91-504128484e53\",\"ticket_id\":\"593147a0-6e9c-4789-a13c-69c888850f20\",\"new_status\":\"resolved\",\"old_status\":\"in_progress\"}', 'all_admins', NULL, 1, '2026-01-01 10:33:49'),
('61edd75e-30a9-41ed-a9d9-83ab84e79005', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 09:50:45'),
('62199dec-a1bc-4d5b-abc7-ae6db3be25a7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:34:10'),
('6231b4e8-ae43-4bdb-8c77-db4f49a88e72', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:21:05'),
('626df87f-7fde-41ec-80ff-ade790077f8d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:01:01'),
('62d75b5f-9f44-476d-b5b2-262a8a63f803', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 12:29:17'),
('6343283e-74fc-4ec8-89aa-9714ea4f758e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:03:36'),
('634bb35d-a7a0-4b6a-b544-587076faf0ce', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 15:02:42'),
('635267d6-b8e6-41c2-a47a-025db8fce124', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 11:55:21'),
('63561fe1-832a-4713-837a-1874ee739446', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 4 إلى: محلولة', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"ee6e3790-c248-4534-9c13-6a52a39c36f3\",\"new_status\":\"resolved\",\"old_status\":\"in_progress\"}', 'all_admins', NULL, 1, '2025-12-31 10:23:32'),
('63be519d-fa65-4ba9-a486-4f5b8f88a02c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:16:25'),
('63dcc51c-dd46-4fd6-88a6-b5ab3f98885d', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة الصيانة', 'قبل العامل support تذكرة الصيانة للوحدة: شقة رقم 3', '{\"unit_id\":\"0e95fed2-e03c-4f47-81b1-2962e77c5887\",\"ticket_id\":\"51857652-839f-437f-bcf9-86f85910061e\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"accepted_at\":\"2025-12-31T10:20:13.961+00:00\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:20:14'),
('6409ba19-66c8-4372-8be1-9e9a3d6700f5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 24 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 08:18:39'),
('64172272-557d-4933-aa15-931e5514d2e0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 03:25:56'),
('641f4f88-c18c-4cf4-83cb-854eabfd4bfa', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:10:55'),
('6440465f-d976-4415-9fba-d72b6193e388', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:07:37'),
('6446de0b-385b-4601-a088-4977e3b7a6e2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 09:39:23'),
('64975f6d-53d6-402e-b344-f5946f936444', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:23:17'),
('64d76b62-0151-4463-b095-88cb80803f79', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 15:22:59'),
('6513860d-c160-4275-ae6f-bf3520c1d2e8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 08:20:29'),
('654b7f43-48a2-4e57-aac9-21d196c13fcb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:34:16'),
('65d1192f-0c41-4abe-975a-52f028e220f0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:57:59'),
('65fbfc0b-b0b4-423a-a4df-b31dd7b5771b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:58:46'),
('66029dd1-53a7-4cb8-ab03-7cec0983b5e7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:29:37'),
('6632a22a-a99d-4330-8671-e93ca72d8e69', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:41:37'),
('6638eaf0-cba2-4606-afa1-c8cf8cbfbf42', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 06:26:33'),
('663bb8c0-fabc-4fea-ad79-01ad63bd908c', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2026-01-01 10:33:45'),
('664312ff-15ef-4486-b1df-97679aeaaab9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 16:38:08'),
('67604563-db0f-47f5-9a82-d150f81d0c61', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:52:33'),
('677bbfec-ef28-4375-ba74-2556dc5b4aa2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:08:00'),
('677c261a-d294-464b-9ec0-12e487cca22a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:56:22'),
('6796d6d7-018e-46a5-995d-be058c1bd5a3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:05:56'),
('67dcb015-7d65-4202-91e6-333881bca7b1', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:22:40'),
('67f747fa-06bd-4074-8f38-ee78dd8c308e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 15:11:19'),
('681674cd-5841-43d8-b9c0-e5b6944b2fee', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:04:21'),
('6831dde5-930f-4647-8833-cb51806ef42b', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة لك', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3. يمكنك قبولها من صفحة الصيانة.', NULL, 'all_users', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:20:08'),
('687018a7-a294-4c9c-aec0-956b8dd2975d', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2026-01-01 10:33:40'),
('68a037e2-03da-42ab-be6e-560ffe91c964', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:20:08'),
('691891e3-f722-44dc-b5f6-181dab3078be', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 00:21:04'),
('6a5f180c-6210-4c0e-8e06-99c191334df0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 35 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:08:07'),
('6aadd2ea-2c91-4660-9a0e-8f194b555f1c', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 4 إلى: قيد التنفيذ', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"60a31478-515b-4467-aaa5-7fbfa9cc0639\",\"new_status\":\"in_progress\",\"old_status\":\"open\"}', 'all_admins', NULL, 1, '2025-12-31 10:21:56'),
('6b0b4f1d-388d-410a-8919-78dd79da78cf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:35:26'),
('6b0f9089-0f83-4121-84e3-c76eea3afead', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة لك', 'تم تعيين تذكرة صيانة للوحدة: شقة رقم 4 إليك', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"priority\":\"urgent\",\"ticket_id\":\"ee6e3790-c248-4534-9c13-6a52a39c36f3\"}', 'all_admins', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:23:25'),
('6b58008a-a557-4ff5-99a4-dc67f59c3fcc', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:10:47'),
('6b861e7a-9d91-4122-a88b-2e6c99657698', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 19 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 14:07:44'),
('6bcc3a79-fc53-4d4b-81b0-26896ba5e9e0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 06:15:01'),
('6c64559a-2643-4d20-a3b2-47b5b23f5974', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2026-01-01 10:33:40'),
('6c816ad1-8b1f-4b2e-8aa9-cd490815f506', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 03:47:04'),
('6d450a9b-532a-4262-b397-a57f7ddfbc4d', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:20:14'),
('6d46629a-2e32-4e27-8350-e617d81f2121', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:15:25'),
('6d6f6a34-c8ba-4d61-9b0d-67cdf4f17fbd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 09:14:47'),
('6db63310-704c-4914-9f1f-e134e91a5a33', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:58:32'),
('6db676ce-8ae7-4f26-b4ec-a343d1a18d95', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:10:29'),
('6ddf9c60-e55a-4bc5-9988-16fd0f3df968', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 16:35:00'),
('6e23035f-6fd8-4b73-aa94-255d4608ab68', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:22:45'),
('6e95ab50-7003-439d-935c-4663d60cfdc0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 01:11:51'),
('6ebc1e8b-a508-4595-819c-53ba4dd3d586', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 04:10:25'),
('6f0c59bc-a7bd-4795-8952-8071f9746746', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:18:40'),
('6f2c3fb5-ca46-43e9-850f-4d08b4d2bdaa', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:36:03'),
('6f3629b2-0594-4788-9f2e-4134e731b237', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:43:59'),
('6f6a27b8-160a-4090-9f29-2e9acf0a6845', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 4 إلى: قيد التنفيذ', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"ee6e3790-c248-4534-9c13-6a52a39c36f3\",\"new_status\":\"in_progress\",\"old_status\":\"open\"}', 'all_admins', NULL, 1, '2025-12-31 10:23:25'),
('6f94585d-09ea-4229-af31-3b4ed40230d4', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:24:29'),
('6f955c37-4e25-4f5b-a478-a4558466bf9f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 05:50:27'),
('6fd0b818-5a7d-4bf8-9302-0b01a0728b37', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:48:12'),
('7021cb61-0dbb-459d-bf8d-0c3cc47d2108', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:50:56'),
('706f5c3c-2fea-4881-9347-5e769c1d1353', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 10:34:11'),
('707b5e07-2d85-476c-a42f-b5e08e376832', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:50:32'),
('707bab96-8ccc-4f8c-9937-a2c867202c24', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:20:51'),
('71020c59-f66c-457b-a724-122ef2ae5c9c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 05:40:09'),
('715cb100-25f7-4fb5-98f0-720fbe9c2b31', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:15:49'),
('71df6bdf-7340-481c-85dd-fcb320d16d61', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 09:34:22'),
('722a0d2e-7740-4f24-ab5b-6251eca2ac04', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:22:45'),
('727d4bd5-d2fb-438a-8134-9b4a5e7fb98b', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:22:40'),
('732014e6-6284-48c7-a8eb-43ab087f78f8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 12:51:55'),
('7343b188-b180-4977-9c3d-90ba63b8483d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 38 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 15:59:57'),
('734a49b4-d24e-443f-8c99-cd2f38157e6e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 06:44:07'),
('735e4ce1-b72b-4d30-8122-81b19a90b00f', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:22:40'),
('73691429-677e-43c2-99c6-2df554493977', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 15:34:06'),
('73c02c73-d122-402a-b583-513770a427d6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 13:46:22'),
('7442974a-451c-418e-bb83-fd6f857be5c3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 08:46:55'),
('745a841b-bd92-46dc-a8e5-eedbf214a239', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 23:12:33'),
('74c34952-fa81-4209-9250-bc50e58dd606', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 01:57:57'),
('75127cbb-59fe-4d45-80d7-1dd484e484eb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 18 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:13:31'),
('75ce5a76-058d-4e2e-83a2-76b41c7a3585', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 04:09:14'),
('75da23d8-1331-4c56-a7d6-9d70ae541798', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:09:41'),
('76194420-b4aa-473a-ad8b-c8868edc8b17', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 23:54:14'),
('761bc5ce-16f3-4f3c-b56a-231fe7761ca8', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:22:45'),
('766cd1c9-0b25-469c-b562-ff1bf1761e31', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:23:16'),
('767542fb-c6e8-4695-af90-9b07de1006da', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:48:10'),
('76a55ef9-a992-4d41-b0af-c4677fdbde5c', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:21:52'),
('76a8c47b-a3ea-4c28-b4b3-8c93b8da4720', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 19:43:11'),
('76ff9239-d3c2-49d3-a700-7c13dbe2eae8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 01:34:29'),
('7761c8e7-5ef7-486d-95a6-2a6f1f48c0d0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 00:02:20'),
('79232702-b9c2-4efe-b8b9-30f56981cf43', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:05:46'),
('79257d9d-6df8-4b5b-a627-3bf684817b61', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:54:38'),
('796089e6-b9e0-4e8b-883c-828e7ab5bbbb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:05:40'),
('7a503d05-1abe-42d9-aec1-1b9311a5e957', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:21:52'),
('7aa48cdc-bee1-4439-ba41-3ee639519f60', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:14:57'),
('7aece4a3-71ea-4312-9328-1687d3be2f4c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 07:52:08'),
('7b3575cf-df3d-4dd8-96b8-35c059d0128a', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:23:17'),
('7b554c77-6f7f-4b14-8afd-0efbb665e44c', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:23:17'),
('7b9477cd-5599-4a7b-941f-d79e713aa05a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 08:12:12'),
('7ba93875-6001-4287-a66e-1509846cbf86', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة لك', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4. يمكنك قبولها من صفحة الصيانة.', NULL, 'all_users', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:23:17'),
('7bbf0933-4bc9-4795-9902-1a770933c22a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 09:55:19'),
('7bd7b655-2bd9-4408-aca4-61687e65fb4b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 35 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:40:08'),
('7bfbaf90-69bd-4ae3-bde6-1f5588f4714e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:08:25');
INSERT INTO `notifications` (`id`, `type`, `unit_id`, `platform`, `maintenance_ticket_id`, `title`, `body`, `data`, `audience`, `recipient_user_id`, `is_read`, `created_at`) VALUES
('7c664b83-c93d-4bd7-addd-4908833cc5a4', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:23:26'),
('7c66751e-216c-49fd-90e0-8a8814dcc394', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:56:19'),
('7c8668a3-331e-472c-92e9-7550449ed52f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 04:20:33'),
('7c90a314-b280-4834-ac9c-e40e50700356', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 05:34:22'),
('7ca065bf-2840-463d-8587-ec5affc07286', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 09:52:42'),
('7ca2c428-302e-4d95-aa36-b1a5f338fe04', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:10:35'),
('7ce89c74-30be-46f5-8cac-fbc8f6bb9aa6', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة لك', 'تم تعيين تذكرة صيانة للوحدة: شقة رقم 4 إليك', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"priority\":\"urgent\",\"ticket_id\":\"fa50dda5-9d5d-4f14-81ba-5039c6b8972e\"}', 'all_admins', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:22:44'),
('7db31240-688e-456b-a13f-ffce0e84eccc', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 08:06:37'),
('7e5a8378-142d-4c86-ae65-7b1522eab42e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 16:48:14'),
('7e804442-3aa8-4a30-a5e1-bc2640aff7ae', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:50:42'),
('7eb6822d-62fe-475b-900e-eee568ec67ad', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:45:40'),
('7f2f0d62-ae16-496c-b26a-62f552e2dd69', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:57:57'),
('7f3594e3-404d-4713-b37f-b19ff7581538', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2026-01-01 10:33:45'),
('7ff0a22c-c77c-4db9-816f-1b68013dbc3f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 14:09:29'),
('803d02dc-782f-4811-a981-4302f46a05aa', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 02:08:37'),
('80e0973c-b74a-418e-9a77-1f16be1ffebd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:07:46'),
('80eec54c-3480-4edf-b65b-cdab1215cce2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 02:08:44'),
('8131cf42-d8b7-4d0a-ae68-8e6561880615', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 03:15:02'),
('81507637-7a38-4b84-96e3-08a23225b97b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:09:30'),
('815f9c1e-c69e-4b9c-8969-39a9b26a180a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 01:23:39'),
('81966ac9-ad71-47fb-a42d-8d3a96b0d0f0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 15:54:26'),
('81c314b0-04e1-417f-9606-9ee856cff99d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:49:44'),
('8257d75c-1202-4581-a547-2a54cbe71615', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 15:22:19'),
('827cd891-5f76-4f26-abc6-14b481d266e1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:02:46'),
('8294543e-f2b6-4012-ba95-c6131e9e2370', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:45:23'),
('82bccb15-cf70-426b-a449-0bbd4b9db412', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2026-01-01 10:33:45'),
('82e47074-51dc-422b-b0ed-28ee6b6eafc8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:27:57'),
('83535287-5275-4faa-a92d-ee33f1c14dc5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 14:30:26'),
('836358f4-8e42-4546-aa20-5f647a656f3d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 07:02:17'),
('836e1ee9-aa8e-4339-9b01-41fdf99af3f6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:36:15'),
('83f9774e-7d2c-459b-8f79-275ae4e60158', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 15:00:25'),
('844e36bd-703c-4743-9b38-61c430fed3ea', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 11:12:57'),
('84804920-3b66-4a10-a92f-da080572efc9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 16:27:09'),
('84fbe92f-7f44-4019-864c-f4579f9efb80', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 17:08:28'),
('85176206-ac59-4880-b270-166b0f67240a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:48:14'),
('8593ca93-731d-4679-888e-6b7cdd9e6774', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:43:05'),
('85b8e555-6ef7-4380-95d0-691121cfc670', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 09:10:02'),
('85b90d8c-07c4-4910-bcf5-83a50d59ddbf', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2026-01-01 10:33:45'),
('86ce24da-f85a-4f6c-b414-c5a1d6747056', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 38 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 15:32:18'),
('86db5577-6ac8-4d8c-920d-021c47237d4a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 05:07:05'),
('876aeedf-f642-40be-bc13-733f5bdbc89a', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة لك', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4. يمكنك قبولها من صفحة الصيانة.', NULL, 'all_users', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:21:52'),
('87765b0b-15e7-4743-9db0-b54aef9ddca7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 13:12:19'),
('8791d778-021e-46a5-bd96-ee25eb28158d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 22:05:40'),
('87a42313-4f8e-4a4c-bb17-c3ae69fbb273', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 02:31:47'),
('87c20ba9-0790-4319-b61c-b2f1a3bcea22', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:24:29'),
('87e22795-1316-4d89-ab03-4b41c0fa3a62', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 18 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:15:59'),
('87f78e7d-de5d-47cc-9295-2d667a2a11ab', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 20:45:14'),
('8826c09a-b3ae-4f18-92bc-4b257bbcdbc6', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:23:17'),
('8912b63b-cc1c-454d-8c35-6ce1541110c2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 09:55:28'),
('891f2847-3b19-4409-a82a-eb20e8e96092', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 14:47:48'),
('8946bfc2-1f23-49b5-a8f2-fdb932b2226b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 11:59:27'),
('897bc3c4-dac2-4b93-bb8f-cebcdba8e2bf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:46:05'),
('89829ed6-2a3b-40e2-b061-2067f45b7597', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 00:38:56'),
('89e24bbb-25bf-4d68-99ec-cbd48e80e4d2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 07:13:27'),
('8a07dd6c-85a7-44c3-8d62-d24f90ead908', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:30:28'),
('8a31d41f-552e-4003-a8d3-e2cc2eb6a093', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 16 حجز من 14 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 13:45:03'),
('8a321886-dc23-4a0c-8f28-e7fec3373087', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 06:04:44'),
('8a791503-c195-4281-9d1b-714010dc1552', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 03:03:11'),
('8aa51506-1aa3-4b28-81ca-52be0de41fc3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:37:14'),
('8aa7641d-2fd2-432b-ac46-33dfe35575c5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:38:21'),
('8b198aa6-c796-4763-8823-a8ed08a7630d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:25:31'),
('8b6946bd-7121-4c85-aea8-d7a921a83593', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:36:03'),
('8bd64dbb-4932-4112-ba27-fbab99f205b9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 36 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:59:47'),
('8bf0f029-321b-45f1-bd2b-f639e3656af8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 23:42:21'),
('8c19a8f2-e4b5-421b-a40c-b47745317705', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:47:09'),
('8c3401f0-baf2-49a4-9c4d-014055b0ea29', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:34:13'),
('8c92d933-ab75-45ce-bf82-8fd70db3760a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 13:10:53'),
('8cd5d154-67e2-4c25-97c4-cc114d5a1869', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:17:25'),
('8d677e27-8cbc-40f6-b926-cbb4de905fb5', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:24:33'),
('8e485f2a-dfea-4387-8d66-5a9dcdb96eef', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:56:22'),
('8e79d51c-d5ff-4575-8cdb-cd06f6a10ecd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:25:04'),
('8ec795b2-c1a6-4f37-9f36-20efb373f97e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:28:47'),
('8fbc7001-55f3-4677-940c-3032c3642334', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 15:07:56'),
('9042d261-6d0c-48de-9a6b-8ed386b3bae5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 02:20:27'),
('907a09f4-675d-4c39-a668-dd4b2b2901b0', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:24:33'),
('90adcc78-e78d-45fb-9bca-df245fde34b9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:05:46'),
('90b90a6d-0cd3-4db2-9a27-94576e9c8e78', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة للوحدة: شقة رقم 7', '{\"status\":\"open\",\"unit_id\":\"de1cae26-9e98-4fe8-bd68-af0a69008778\",\"priority\":\"medium\",\"ticket_id\":\"311bb344-47e4-40da-9a34-875c9691ec22\"}', 'all_admins', NULL, 1, '2025-12-31 10:24:29'),
('90d9abbc-3bd6-4ee0-89e6-8cba636bb348', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:04:00'),
('91104d0b-b9da-46b5-837f-5a84bac5ac41', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:48:51'),
('911fccdc-9789-4598-ab0d-99762ffab207', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 01:38:06'),
('91f828cb-bedb-49a0-84ce-340cfe8169d8', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة للوحدة: شقة رقم 4', '{\"status\":\"open\",\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"priority\":\"medium\",\"ticket_id\":\"60a31478-515b-4467-aaa5-7fbfa9cc0639\"}', 'all_admins', NULL, 1, '2025-12-31 10:21:52'),
('921a06dc-9f62-44e0-be4d-dc0f4dfdcd3d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 07:39:43'),
('925a6ec1-e3b8-45b8-9dcc-e1990dee682d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 10:13:37'),
('92912c1a-95bd-42fd-9ea6-be530e4e4a8f', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:23:26'),
('92cf7c94-bc74-4b21-bfb3-fcf4a83d4a3d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 14:07:06'),
('931cfaa6-3486-46fb-b89f-a6169debf060', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 6 حجز من 7 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 13:20:16'),
('93340eea-697b-4fe7-a667-2a81d8daa655', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة لك', 'تم تعيين تذكرة صيانة للوحدة: شقة رقم 3 إليك', '{\"unit_id\":\"0e95fed2-e03c-4f47-81b1-2962e77c5887\",\"priority\":\"urgent\",\"ticket_id\":\"51857652-839f-437f-bcf9-86f85910061e\"}', 'all_admins', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:20:14'),
('93940c78-ff3e-4753-a01a-f89ba4b1f0ab', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 06:38:06'),
('9412c6f9-5f17-41d0-8f36-b7097fbcb1ff', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:09:07'),
('941d85a4-aecb-4342-8431-1fb8321473bf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 15:55:17'),
('9432fac0-af9f-45f4-82b4-19e802fbcc93', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:40:24'),
('9539df83-c630-4dd2-bc5e-9ea0d50abfb2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 02:40:17'),
('95d9b89a-d4ef-4b76-be27-43377ab156f6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 03:25:18'),
('960f45a5-d143-4efd-941b-f0096f14bea0', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:21:52'),
('96310f9c-2fa3-45b3-bddf-fcd9228dca77', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 13 حجز من 12 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 13:39:07'),
('965a480c-5db9-4222-8fe0-6e3b653d2c28', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:36:55'),
('96d5bc72-c08b-4d30-8737-9bbcbc50d4e0', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:20:14'),
('96dc6e08-55ab-469f-b708-0e973835ccce', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:21:52'),
('96e7fd08-81cb-446c-b7a3-bc9f973a66ec', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:22:40'),
('96ef1d3d-3855-4a49-8e87-0438e4517f07', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 15:13:39'),
('96f5c5f6-7844-4dd0-bcdb-b3984026994c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 23:08:01'),
('97045a6b-0e42-4b54-b9be-ca72b7e2ba10', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:40:42'),
('97475d4a-e937-48f7-ab77-010bdfca73bb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 10:05:48'),
('9779856e-57d6-446b-93bd-acbbb725b493', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 18 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:01:12'),
('97ba38d3-1d90-4868-9bec-aefb7be1d63a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:30:50'),
('97d9d147-28ee-44cf-8995-f63da6f67a20', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:02:26'),
('97db0f0a-4e15-4e09-bca7-aacc648d7df1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:03:01'),
('98031b0d-a7a2-43fd-8ca5-516458bfe08b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:03:19'),
('9850a853-3246-4f79-9c7c-ce18606ede4e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 18:45:27'),
('9862ded1-c46e-4b6d-9c22-1e19ba6e7721', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 06:36:48'),
('98690a95-19d3-4e68-8947-e65085301028', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:58:20'),
('98e0136a-b0fd-4711-80f5-f5bc226987cc', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:23:26'),
('98e39d01-d3c7-4986-9ab2-db55c5b0258d', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:23:17'),
('992511ed-f091-481a-93c6-26271a3f0468', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:40:37'),
('9a78044b-5904-4757-b422-6ed568694bc5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:54:16'),
('9a86b334-e387-4687-93e1-15c963f0b2cf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 09:43:35'),
('9ac1630f-1789-4fe0-b8cb-d414a11a3004', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 36 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:47:43'),
('9ace622f-8007-4584-a640-8a39797e5e26', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:59:19'),
('9c3e091a-0ff9-42c3-9f45-715f9d912110', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:15:22'),
('9cacba60-26c8-4c6b-9a16-a90e493970e5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:58:33'),
('9d0aab10-e594-4bd0-9ede-f766c2b45bf1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 19:33:26'),
('9d25808e-ccc6-40f7-a135-bf343d607a8a', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 3 إلى: محلولة', '{\"unit_id\":\"0e95fed2-e03c-4f47-81b1-2962e77c5887\",\"ticket_id\":\"51857652-839f-437f-bcf9-86f85910061e\",\"new_status\":\"resolved\",\"old_status\":\"in_progress\"}', 'all_admins', NULL, 1, '2025-12-31 10:20:19'),
('9d365e27-214c-46e2-b744-54cf81195f8c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 11:13:32'),
('9d79479f-c8e9-4954-bcfd-528c694d6df6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 08:56:49'),
('9dab6b58-f43e-47a0-90ef-e676c6f8c559', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 05:31:38'),
('9defe4c5-fd91-41e3-9e66-7e8ca4a6e802', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 09:45:23'),
('9df676d5-bae0-4497-8125-ad9d033bd849', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 36 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:50:15'),
('9e24844b-74bd-456a-a749-4eac7bf6aa32', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 01:15:47'),
('9e47744b-0e19-4c0c-8222-756521ff2b7b', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة الصيانة', 'قبل العامل support تذكرة الصيانة للوحدة: شقة رقم 4', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"ee6e3790-c248-4534-9c13-6a52a39c36f3\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"accepted_at\":\"2025-12-31T10:23:25.708+00:00\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:23:25'),
('9f4c8513-d3dd-45fb-947c-bcac9258cf36', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:24:33'),
('9f8a5f58-081a-4817-bce9-dbff51949c49', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:43:38'),
('9fd54c61-7176-4a5f-adcb-ea7df8ae0b00', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:57:13'),
('a0b9580d-b682-4543-9ae7-f4a6d2e8fca0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 14:06:10'),
('a0d328c4-02d3-494a-9845-16a4fccfa0da', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:47:47'),
('a19bf0d1-2e75-4896-8955-230bbb246ebb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 02:51:54'),
('a1a299c8-5fc7-4ffb-97d2-ac95afe2f4a4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:05:46'),
('a1a40078-baac-4207-8cac-2472162fc9a0', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 3 إلى: قيد التنفيذ', '{\"unit_id\":\"0e95fed2-e03c-4f47-81b1-2962e77c5887\",\"ticket_id\":\"51857652-839f-437f-bcf9-86f85910061e\",\"new_status\":\"in_progress\",\"old_status\":\"open\"}', 'all_admins', NULL, 1, '2025-12-31 10:20:14'),
('a1a40ad6-acec-4fa0-9ebc-42dc3238ffdf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 13:11:59'),
('a1a82618-985d-4b1f-917d-8b9262b29ce8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:58:37'),
('a1bef1ee-e039-40de-aefa-ee0ab346f02c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:14:30'),
('a2110a4f-de9b-4339-a3b1-a0adabf4ef9d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 17:15:48'),
('a26b76d4-2485-4164-b9e9-9b0ae0071f4c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 08:48:19'),
('a29a240d-fced-420a-9495-e22cf58c8e93', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:40:13'),
('a3351e02-fc68-40a0-a244-588aab9e2ce8', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:23:26'),
('a3b80138-c659-47af-b540-7d2e2dd13b88', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:04:40'),
('a3cf27a5-20a9-45fd-bfb6-275d2ed77e41', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 35 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:34:08'),
('a566c188-ab2d-4be7-be98-cdcff1810c00', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 4 إلى: محلولة', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"60a31478-515b-4467-aaa5-7fbfa9cc0639\",\"new_status\":\"resolved\",\"old_status\":\"in_progress\"}', 'all_admins', NULL, 1, '2025-12-31 10:22:00'),
('a57be835-42d1-409e-9836-9b4d4543a0f9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 00:17:20'),
('a5aed100-e928-474d-84d9-542c9e456f62', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 09:24:09'),
('a5c2796e-3dfe-4131-8ff9-26058151446d', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:23:26'),
('a5d13e83-478d-469c-9199-8b0ea14ce1c1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:46:05'),
('a5f695c1-ec75-4ac2-985f-d06c92e77d19', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 16:18:23'),
('a677cd4a-5f36-4266-800c-98ca71be22ef', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:50:58'),
('a749c23b-667d-483d-b7fa-b30017495252', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:51:08'),
('a74ca1d8-1545-4021-8b44-1bd92cb877c8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:37:37'),
('a7970500-bff6-40df-a214-416df6859928', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:18:49'),
('a79a9293-84ea-44bb-8979-74d923a6badf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:41:45'),
('a7b7fff3-ab74-48e3-8b47-18d9ac5e9ecb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 05:08:04'),
('a7ea7213-b4a3-4c7a-808a-4b5c3e07c2a4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 20:56:34'),
('a802b41b-692c-44b8-adf4-5845c67be3cd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 08:45:34'),
('a811dc8a-44d1-4437-9694-5a7885b55076', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:20:08'),
('a8439669-43b1-4ab9-af60-484729c24ee5', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:24:33'),
('a88b3754-ffeb-480d-954f-4bd8bb6e6cf5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 02:09:59'),
('a88c8c53-9e4f-495a-9a85-1cb15db79fd5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:44:06'),
('a8bbe145-b83e-4747-9b2c-37431286ecd0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 00:09:06'),
('a8e9ad6a-8478-405d-8fb0-775eb564e0ca', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 11:59:16'),
('a9205d8e-64e5-4517-9475-bb4f0d8cf1b5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 06:01:08'),
('a95b8884-aa2d-459c-88a8-32acb1cfcb5c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 12:36:07'),
('a9c1fa00-9e1a-46dd-bd9a-71516ec2a146', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 23:34:15'),
('a9cb15ad-81bf-4a5b-9ca3-87f847ea8590', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:53:59'),
('a9fd72f7-f380-45fb-87a7-5432b7a3e557', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 18 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 14:06:09'),
('aab7718e-8744-4e9e-b11a-2b5aeedb772e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:26:55'),
('ab86e686-723e-43b6-b5d1-f3f8156ecf0d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:39:51'),
('aba19a43-f3d9-4fbc-a7eb-5cbda5bd7ef9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 18:23:58'),
('ac26b5bd-bb5e-4ce7-82d1-30eb130d1d0c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:46:51'),
('ac709372-54eb-49a4-bbfc-fa64d5c1bfde', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:09:52'),
('ac7a214f-cc57-482a-9edb-ab015fb0fff9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 08:49:03'),
('ad272a07-6783-45d4-aa5b-19bea54b7844', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 3 حجز من 2 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 13:12:41'),
('ad35165d-ce32-4a44-8a1f-be8e9654abf0', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '1515563a-25dd-49f1-9cce-113b4f8d598e', 1, '2025-12-31 10:23:17'),
('ad52ba4a-cab9-475a-be02-1d5f7d2bb270', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:21:52'),
('ad563c5e-56cd-4cdc-8c0c-7d7bcf2bcb76', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2025-12-31 10:23:26'),
('ad5e73c3-c7e8-4f61-8024-8d079b80c1d0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:42:26'),
('adf4bae4-298f-4895-b4d1-c9bf61722a6f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 04:12:11'),
('ae000b62-ccc7-44f7-b963-8a6376ac911c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:29:41'),
('aeffc168-9e16-4496-b225-75b0df6cc2c2', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2026-01-01 10:33:45'),
('af82fca0-ce0f-4725-9b5d-71664061b975', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 21:27:44'),
('affdf2e2-e240-42f8-bd16-5469f605f92a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:29:42'),
('b0063b92-e03f-46ad-b1cd-302afdae2153', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:59:46'),
('b068d435-75b9-411a-b7b8-2cb54d11482b', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2026-01-01 10:33:45'),
('b0756e42-331b-4318-a436-c33592b755b7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:55:35'),
('b1202545-cbbf-4246-bed9-7c14698dcca3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:40:43'),
('b14b4122-758f-4a27-a9f5-4b1330c91ecd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:29:17'),
('b1a3cd32-8544-4d43-9f6a-4609ebee60a6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:02:23'),
('b26b5774-8423-4069-bab2-4b29928719ea', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:45:25'),
('b2bc7cac-1bbd-40a8-be5c-f819637e8e6b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 08:32:18'),
('b2bc9416-5ae3-4e21-ba95-7ba82572028f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 01:16:52'),
('b2c1d59d-d8a7-4029-b5cc-cbc92f49921a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 00:42:06'),
('b2e40e3d-a3f3-4b97-9229-874253a00446', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 02:30:12'),
('b333d796-6882-4a5c-87b5-88606005990a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 14:09:19'),
('b3554dbb-689e-4bb1-8e92-c9143137ab2f', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:23:26'),
('b39eff85-1011-4139-8763-9803acd2c097', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 11:01:10'),
('b3eca1e4-a1ef-4776-b405-825d1982ba07', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 08:25:28'),
('b417c75e-9ffa-4791-b29f-75f8d0fcadc3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:31:31'),
('b4a6c9d6-6bb8-41c4-93fd-ce1329068ef5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 08:01:43'),
('b4d34609-ec59-4489-bab2-1ae4538eedb5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:06:10'),
('b527034a-d36d-4d38-a992-d23f33649a96', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:52:44'),
('b577f546-581f-4e42-a2cc-3c3e81ab4742', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:16:11'),
('b58ef661-8c1b-464f-a9c2-fcc9317d461c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 16:29:26'),
('b5eed2ae-6102-4951-990a-467cee277789', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:24:33'),
('b6cad973-62c9-42ca-9e68-7f21717b743e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:38:52'),
('b6eebbc3-8b74-4adc-a6aa-4eaf55bc3a43', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 06:16:49'),
('b7b1d41e-c922-41c4-907e-c3e580615e73', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:39:34'),
('b7cbed92-2394-47fb-83ca-42abbe8a508e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:17:32'),
('b7fb9522-951c-4792-8c24-1a332934c1e6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 04:42:21'),
('b8307d77-8e3b-473d-9926-c9988933bd35', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 13:43:26'),
('b8388896-bbf6-47eb-b0ca-47973904e449', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:20:14'),
('b890d521-4eee-4d93-83da-eae8a3589f9a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 14:42:12'),
('b8c752a6-17ea-4d80-aa2f-cd591993fcb3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:30:17'),
('b97da80b-6b53-4148-908e-49e29eb16e4e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 21 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 08:14:07'),
('baa0d296-6923-43cf-92c1-eb33cb7d6541', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 19 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:47:46'),
('baf7b5ba-9f6e-4192-8cb0-c7aec3ae9da0', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة الصيانة', 'قبل العامل support تذكرة الصيانة للوحدة: شقة رقم 4', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"60a31478-515b-4467-aaa5-7fbfa9cc0639\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"accepted_at\":\"2025-12-31T10:21:56.58+00:00\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:21:56'),
('bb2d870e-b6d3-4bc7-8612-21bc35b41f92', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 09:52:05'),
('bb82f15d-fbcb-4f99-9960-01af1fe04338', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 10:59:05'),
('bb84bc7c-535f-44ee-a4ee-1e719152428f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 13:34:20'),
('bb924a1a-584d-4d38-9fc0-7bdceefc03a0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:24:00'),
('bc177018-bd88-46cb-bdd7-cacb95ed9cc5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 6 حجز من 2 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-11 12:16:21'),
('bc6895b0-b0a2-4b05-a027-4ea66f26886f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:20:50'),
('bcb946af-1b6e-4864-8411-1c7478cf91ea', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 06:06:08'),
('bd201fb2-33fa-47c3-8f77-21573bbd1311', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 07:34:37'),
('bda1f5eb-5481-444d-9574-afc343e78ba9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 16:05:39'),
('bdd53e3f-3de6-48c2-b33b-428a9a8821e1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:23:17'),
('bdeec9f8-7a90-40f3-86e6-665ad7a56892', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:35:54'),
('be2a178a-d691-4bee-b134-70676f538fce', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:48:58'),
('bf5c1e8a-9f50-4362-88c2-c1bce2cdbf40', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:52:00'),
('bf94ed3c-102e-4fb2-bf37-40c98155578a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:41:28'),
('c040f66f-b59f-488e-8345-a034ce96192d', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"لمبة الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:23:26'),
('c064c301-f70f-4367-8498-b61cb8418728', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 14:17:11'),
('c0d02a28-5eaa-4702-a8f9-5d3b9130e8c8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 19:25:41'),
('c0e37d91-8af7-485d-9548-3844ab20f32b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 21:52:35'),
('c10fbc1b-c25b-494c-b563-88fb090e1d54', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:49:19'),
('c111e442-023f-4ddf-a072-37246798faed', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:11:41');
INSERT INTO `notifications` (`id`, `type`, `unit_id`, `platform`, `maintenance_ticket_id`, `title`, `body`, `data`, `audience`, `recipient_user_id`, `is_read`, `created_at`) VALUES
('c184d4ab-c67a-4d5f-ae10-4f3f95a8006f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 16:16:06'),
('c19aea58-3b35-40ad-9d0c-7bd8a760c2a3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:18:09'),
('c27e3e82-d647-4941-b0d2-663685ac1c89', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم تعيين تذكرة صيانة', 'تم تعيين تذكرة صيانة للوحدة شقة رقم 5 الروضة إلى العامل: Mahfouz S', '{\"unit_id\":\"771e5211-e7d9-4123-af91-504128484e53\",\"ticket_id\":\"593147a0-6e9c-4789-a13c-69c888850f20\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"worker_name\":\"Mahfouz S\"}', 'all_admins', NULL, 1, '2026-01-01 10:33:44'),
('c370491c-e2ae-427e-b2ac-22e98a491881', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:00:30'),
('c3a4f56b-5bbc-4ad7-bdd7-dfe3f7ba05d8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 10:58:46'),
('c3b6b165-0ce0-4f79-98c9-6548d2b1996e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 09:39:13'),
('c3d7b373-ce85-49e9-bef5-7c50e32a6b71', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 02:55:19'),
('c4a2acb4-7a98-432c-be17-d978ec3b2b77', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 00:49:39'),
('c4ee884c-470a-4e65-afef-10ae713f9559', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:21:16'),
('c523f350-d6e8-4e54-8044-6b109ff711b8', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة لك', 'تم تعيين تذكرة صيانة للوحدة: شقة رقم 7 إليك', '{\"unit_id\":\"de1cae26-9e98-4fe8-bd68-af0a69008778\",\"priority\":\"medium\",\"ticket_id\":\"311bb344-47e4-40da-9a34-875c9691ec22\"}', 'all_admins', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:24:33'),
('c52befe2-cf8c-4a76-b83d-0c0beeb0f536', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 04:30:49'),
('c5dca1b1-4dac-448f-9b40-ce4ebb1c5acd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:20:10'),
('c5eee4e4-34f5-44ba-8a7c-7432f8e76542', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 00:44:07'),
('c5fbb8d2-1ace-4fa9-9ba8-62c57e097ef9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:34:40'),
('c677c860-d140-4f02-b5d6-a354dd71f987', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2026-01-01 10:33:40'),
('c6cb8997-24f0-41ac-a15c-0bc7db15afba', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:36:52'),
('c6e42316-0682-49e1-9ef0-c3b52257abe9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:41:54'),
('c73154bc-f8f3-4517-a934-12b5838fec83', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 08:35:39'),
('c74b946d-46e2-4b70-89e8-caa2e3c9840b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 00:54:45'),
('c7661bbc-be43-4a07-9e0b-1b9fb7492cba', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 14:51:59'),
('c76c0e87-92e0-4350-aefb-7df838cc146d', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:20:08'),
('c76e4853-c231-44c9-ba18-1082fe49fb9f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 03:59:09'),
('c77a072b-a7df-49b4-8c39-f13f9d18b485', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 19:21:44'),
('c7d4e887-7485-4a8c-bae0-c6c36ac2d9ab', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 18 حجز من 19 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:30:27'),
('c7e7e47c-adba-489e-ac06-3f19a25c667b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 02:42:14'),
('c888cdf8-58f3-47d2-b194-9745d5999a7a', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"بوية الصاله\" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', 'd2ca5150-e503-4d4f-9898-f97d36318567', 1, '2025-12-31 10:21:57'),
('c8b35532-4a07-421d-9a32-c1824d880641', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 08:06:18'),
('c9a9b19f-e619-4dd6-a0a9-db003929346a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 05:54:15'),
('ca48edfa-bec8-4d88-acd5-b91c55812f1a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:02:04'),
('ca96a19e-fec9-4f04-8983-64dc8d987145', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 03:06:40'),
('cb612e67-4925-4bc8-8548-f0ca4b7e7ef8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:44:28'),
('cbb4ba6e-bb72-4c09-879e-77e78f95d5e2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 01:22:35'),
('cc16d5ed-dea3-47f7-8301-5844139580f8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:07:59'),
('cc7a60dd-3ca4-43de-8e30-2d56cd752589', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:34:08'),
('cc964cc7-9bfb-492c-85a1-e044bcd59986', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:32:46'),
('ccbf0929-5758-4d39-b1a0-c82532ae032b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 35 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 20:38:04'),
('ccc1bf2f-2d81-4a49-a5a7-5f1271686a43', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:42:20'),
('ccd28f0c-e787-4047-9cf6-d36628f1f51c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:30:26'),
('cce43eb0-0acc-46c9-a94d-99eea76fc25f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:47:43'),
('ccfab478-5564-4b53-9c40-efe0c6635e8c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 21:33:39'),
('cd613a24-19f9-4089-bc1b-c52bc80a459c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 06:42:21'),
('cdb7a048-7a0f-4a2e-a05b-488abb5b937d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 21 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 14:11:00'),
('ce461173-0c72-434a-a988-a273f31cea83', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:24:29'),
('ce729cec-7f7d-41f7-87e5-b0bcbf8a0043', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 17:19:03'),
('ce7db528-6808-4558-a161-8a1d561fab57', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 10:02:30'),
('cef3781d-f5b2-443f-bea0-f9b2e1c31499', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:32:38'),
('cf4ce8ba-498a-4020-b25a-b1c9f8fe3576', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 19:31:10'),
('cf62448c-018d-4c9a-82af-df4a4100d4cb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 00:32:33'),
('cf768b26-7597-4141-91cc-be37af7c075b', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:24:33'),
('cfa46464-f407-40c8-bfd4-89a7986f3eca', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 00:27:53'),
('cfc66f1b-7e75-4a62-a342-9069510c77a8', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:22:45'),
('cffc1d6e-32aa-45eb-b34b-a464e5fd64e4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 05:29:52'),
('d0172cc0-be0d-4f3d-bee2-4e6e4cab4e19', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:20:08'),
('d0446eca-745f-4cd6-bd35-58e047957580', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:16:40'),
('d09ba47f-1180-48e4-9e0c-753be1c791bb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 20:44:05'),
('d0ff6c95-b991-4c9a-9b2c-faee7cca656a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 03:37:09'),
('d108597e-b679-4140-ba4f-491fe03fd263', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:27:08'),
('d181b097-3d51-4a84-bd37-bb7bd99f8d8f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:58:29'),
('d182a7f0-a163-49dc-925a-a49292d4755b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 18:47:57'),
('d196a146-aef0-4619-9152-0c575303f50e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 12:36:48'),
('d19ddd97-c474-4086-a5c6-215774f093ec', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:14:11'),
('d1b18d24-d440-4eaa-b4d7-2a9c2e0cd6c6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 03:47:24'),
('d229a047-23b4-4e63-b728-48ae28dbdffe', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 22:14:52'),
('d2eb537d-8504-4fad-8f42-0e370053e503', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 01:45:56'),
('d31b22a9-9c25-44bc-900c-5c265595f21a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:47:24'),
('d3ebc367-1450-41d9-b225-eff868ad68f3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:55:18'),
('d4938ee0-82c7-4717-8e28-66fb40d1dccb', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:24:33'),
('d4c19a3d-4a98-43d4-b519-51f33e2454cf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 23:30:25'),
('d594cc6d-6fb4-4e79-b467-c28d359b5ebe', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 19:54:23'),
('d5ae26d8-b266-4727-be92-93766e5d4c4b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 00:28:16'),
('d5c01fe0-04be-4730-8fca-4566a87b6544', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 15:31:04'),
('d695e626-c169-42c7-ac0a-a6bc7f49cc0c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:50:20'),
('d6f016b0-69c4-494e-a81f-6bd867e3a539', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:07:20'),
('d6ffa050-a959-47bd-b5aa-2a3817e18949', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:17:16'),
('d7f8017f-c1c8-43a3-b481-719580549d03', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:20:00'),
('d8476dae-3eb4-4489-95dd-b231e070b08d', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:20:14'),
('d896a822-c1f2-449d-8e54-2a6cf384cea5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 8 حجز من 9 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 13:28:58'),
('d92618d1-b412-48bb-a0b9-0548a006453f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 03:02:55'),
('d9560816-c825-4183-a45f-abda7b021309', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:50:38'),
('d9bc5416-8329-4935-afa5-8b1aaa1c2412', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 23:01:49'),
('daf2814f-1a4f-4651-b5f2-7a34fed39968', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 17:01:23'),
('dc12d0d3-d3c1-41af-89b2-4d8dd42e71aa', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 19:19:26'),
('dc2e263d-1339-498e-9183-201fc3e0410c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:28:44'),
('dc89b960-3fee-470b-9caa-f3ade44690ed', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 05:06:35'),
('dceb1891-0e85-4178-959e-5bc3a1e31772', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:47:00'),
('dd0e8c21-485d-4c2c-8918-b69cd7858fb8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 20:50:08'),
('dd3e35b1-2f31-42d3-a8b1-ee1501e8ba5e', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '1eab8697-b979-4f6b-87f3-875eca97bc9e', 1, '2025-12-31 10:22:45'),
('dd70fe78-985e-4788-802a-b9a2972587ae', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 23:57:47'),
('dd8ac15c-ab88-4d69-837a-df80f04c1c24', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 12:39:49'),
('ddc91455-83da-463b-8a60-c50c88d3106d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:49:01'),
('dde6bbc8-111b-47f5-89a4-85ab635ba67b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:56:08'),
('de1d12cd-1fdb-454e-8210-3d0700a7f627', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:33:30'),
('de48b32a-5b4a-4b7f-ba93-1a12cdca839d', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:24:29'),
('de9abfc9-a79e-4272-bfcf-e6f9d037b272', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:29:27'),
('ded31bdd-cea6-4a9a-8cb4-f32e9b3784cf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 14:57:49'),
('dedeba3c-e188-4008-8bdb-211870346e0f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 12:20:43'),
('defd0900-02ce-4042-a175-9b85bfd696bd', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 18:06:18'),
('df1eabca-5739-4b1d-967b-0c16f0916099', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:23:03'),
('df29d49b-c005-4935-ae85-d2de00d7d1dd', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 7 إلى: محلولة', '{\"unit_id\":\"de1cae26-9e98-4fe8-bd68-af0a69008778\",\"ticket_id\":\"311bb344-47e4-40da-9a34-875c9691ec22\",\"new_status\":\"resolved\",\"old_status\":\"in_progress\"}', 'all_admins', NULL, 1, '2025-12-31 10:24:38'),
('df538cf9-b69a-406d-8c0e-5fce00d769f9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:47:22'),
('df7e83be-63df-43ef-aa6c-60d7ca348d93', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 04:00:11'),
('dfda7179-5377-4117-b9ba-66e3f48c5780', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:30:14'),
('e000bd79-f59c-4f94-aa47-c713d8b0381e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:07:53'),
('e05634d3-f7dc-4074-9ea9-007091228ad1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:08:33'),
('e09345ea-db49-4dbc-bda9-4ce3c30fc34b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 23:08:13'),
('e0b49f48-3c0c-44b7-80b4-2560a5bcfd03', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 19:21:34'),
('e0bb9296-2278-47bf-8a69-b522ae3ad2bd', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:24:29'),
('e0e3ac2a-feaa-41a4-91bd-b12ad6c8ad94', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:13:08'),
('e113f013-edfa-4ab3-8b3b-9fe690bf696c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 10:03:22'),
('e1412341-bb75-4a5e-99e1-605be3303bd6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 22:39:37'),
('e146d2a3-0304-4833-9801-cc722d9e1b54', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 15 حجز من 18 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:04:10'),
('e17d8b33-0f1f-4029-b9cf-a60390030567', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 06:11:43'),
('e19c3bd8-d2cb-4f62-956d-742338a28feb', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 14:17:04'),
('e1a3c737-7372-4be1-ad4d-e9fe7beddbb6', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تحديث حالة الصيانة', 'تم تغيير حالة تذكرة الصيانة للوحدة شقة رقم 7 إلى: قيد التنفيذ', '{\"unit_id\":\"de1cae26-9e98-4fe8-bd68-af0a69008778\",\"ticket_id\":\"311bb344-47e4-40da-9a34-875c9691ec22\",\"new_status\":\"in_progress\",\"old_status\":\"open\"}', 'all_admins', NULL, 1, '2025-12-31 10:24:33'),
('e1f42319-7946-4c27-887b-61ef26b6e9d9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 20:20:41'),
('e256b729-4264-4c33-b93c-766a0ad3d358', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 14:31:12'),
('e34045f7-ebd7-4388-952e-ef6513d7768e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 03:14:46'),
('e388a57c-344f-4b5b-8698-aa8ce0a5d473', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 05:18:33'),
('e4232e29-b928-4ecb-9b21-795eb379d57c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 16:46:44'),
('e42c6a02-61fc-4371-a5bd-1cf9c4af44c1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 13:21:31'),
('e473f7f2-93bb-42b8-8366-e7aea4ecd55c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 19:36:13'),
('e47e991a-ddd9-499d-a162-94cc504763de', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 09:19:26'),
('e5387693-ea38-4433-8d9f-6f9cd5c6cbc8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:17:41'),
('e53cd31b-0929-497a-8e48-7b0a38fa4a22', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 01:27:07'),
('e5634e5a-7be4-4ccd-9c39-35799c08b59f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:49:04'),
('e5d355ba-ec0a-49b8-9842-aa83f6e763df', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"برواز المكيف \" من قبل support - الوحدة: شقة رقم 4', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:22:45'),
('e6e803ee-e049-4940-9b2a-57fee3e78e46', 'maintenance_created', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تذكرة صيانة جديدة لك', 'تم إنشاء تذكرة صيانة جديدة: موكيت الغرفة الثانيه - الوحدة: شقة رقم 7. يمكنك قبولها من صفحة الصيانة.', NULL, 'all_users', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:24:29'),
('e71c0524-41e9-400d-bfd1-f37a6b55fa3f', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'ee6e3790-c248-4534-9c13-6a52a39c36f3', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: لمبة الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:23:17'),
('e7860042-aa16-4814-8ec2-e27b47cd68b0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 19:03:31'),
('e7a0655d-4090-49b5-914f-40f75da29d46', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 03:02:17'),
('e87af38e-9637-4351-a7d5-9eae4f17c271', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:32:01'),
('e9432933-f6b9-482d-9539-e41b3593de74', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 03:13:25'),
('e9ff24b4-43c0-4eb4-abaf-93dae5a9f955', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 19:48:15'),
('ea0c8ced-ff45-46a6-96f7-aded66cabec7', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:32:29'),
('ea0d93d0-2322-4f29-8c23-d2d21a36f5d1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 12:49:36'),
('ea14d4ce-3e79-4d9e-b266-8bd40aad35d9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:26:22'),
('ea44c2ce-da25-4914-843b-f47724e18e56', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 15:57:41'),
('eb89e4f2-e035-4048-98b3-95237757d9b0', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة لك', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4. يمكنك قبولها من صفحة الصيانة.', NULL, 'all_users', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 1, '2025-12-31 10:22:40'),
('eb938fca-6e0b-4299-98ab-c8a2a9cab7b6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:10:20'),
('ebb594da-7497-4c4e-aa9d-afa8639acf42', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2026-01-01 10:33:45'),
('ebdd7268-f355-47a0-81d2-c124ba7fb1e4', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:43:43'),
('ec164a49-0543-416e-8747-cf1543c30118', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 19:47:23'),
('ec1df7dc-d020-4769-9787-26b4b92620c0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 07:42:50'),
('ed204456-4b4c-4d11-ace5-ffe96428e05d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 11:54:32'),
('edbf8d32-5d8c-42e1-a568-3ffcc50de447', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 31 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:03:23'),
('eed29d3f-a570-4111-a3a5-44dc450d2864', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:31:55'),
('eef42924-3236-49e4-9526-da3d5e98c307', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:01:10'),
('ef39f145-6983-4d6e-97e5-90f527ac94e9', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 17:19:48'),
('ef9779b4-e4ad-4061-8302-464f73f7050c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:59:14'),
('f0280482-3704-44e4-9010-fc7603fe8765', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم تعيين تذكرة صيانة', 'تم تعيين تذكرة صيانة للوحدة شقة رقم 3 إلى العامل: support', '{\"unit_id\":\"0e95fed2-e03c-4f47-81b1-2962e77c5887\",\"ticket_id\":\"51857652-839f-437f-bcf9-86f85910061e\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:20:14'),
('f0fd1fab-1f3d-43ca-8540-35ca94b873c1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 21 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 06:08:27'),
('f139ef2d-3e45-4312-8179-9c8b50e43ed3', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 11:20:12'),
('f1b16c73-3416-46d6-8fa7-10f916cbbe0c', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 25 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 21:18:18'),
('f205f346-9b2d-4ad0-b069-83240bb3020a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 18:18:22'),
('f2767f60-0b9b-4c36-afd1-f79f3aebf8ca', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 17:53:55'),
('f2a2784d-d332-415a-9757-7f52780fd005', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:32:06'),
('f2ab168e-d549-4571-a666-c8cca84a94b0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 13:15:33'),
('f2d69523-1873-40fd-b5f4-d051fdfedadf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 05:44:43'),
('f319f7df-3579-4432-b90b-e7252972aa8b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:51:26'),
('f3b0c38f-d663-49fa-b699-7c186b35e21a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 05:47:06'),
('f43827eb-63b5-4748-8557-f19c5be7b5b1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:46:18'),
('f43e56ea-a9a2-4b21-b520-125c10265119', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 21:07:08'),
('f45a9102-2b7e-43ec-ac7e-3078e6459071', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:33:23'),
('f5020325-364f-4fc0-a47d-ee156127f5cd', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, 'fa50dda5-9d5d-4f14-81ba-5039c6b8972e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: برواز المكيف  - الوحدة: شقة رقم 4', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:22:40'),
('f533f545-c86f-411f-91d8-918b0f337b62', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 06:29:01'),
('f56b9ab9-2dfc-4a71-abef-b9f1145ae0c3', 'maintenance_status_changed', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تم تعيين تذكرة صيانة', 'تم تعيين تذكرة صيانة للوحدة شقة رقم 4 إلى العامل: support', '{\"unit_id\":\"1e617acf-3ce5-4d97-a5a4-a652191e63d3\",\"ticket_id\":\"60a31478-515b-4467-aaa5-7fbfa9cc0639\",\"worker_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"worker_name\":\"support\"}', 'all_admins', NULL, 1, '2025-12-31 10:21:56'),
('f56fcc94-74e3-4e92-ac68-075995480e12', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', '548bb74c-658f-4243-a35b-d343549ff5a1', 1, '2025-12-31 10:20:14'),
('f5896de9-729c-481a-a301-5a52e7aed6d1', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 34 حجز من 25 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 14:21:51'),
('f5e799cf-3ce4-454a-9f40-1eecaa05b23f', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة للوحدة: شقة رقم 5 الروضة', '{\"status\":\"open\",\"unit_id\":\"771e5211-e7d9-4123-af91-504128484e53\",\"priority\":\"medium\",\"ticket_id\":\"593147a0-6e9c-4789-a13c-69c888850f20\"}', 'all_admins', NULL, 1, '2026-01-01 10:33:39'),
('f6133ed3-a540-42d9-addb-00830c6fd012', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 08:58:42'),
('f616b781-9976-4d38-9810-e0362da1f248', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 08:32:22'),
('f6b26cf7-2e0a-4361-9031-4716bd31857e', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 23 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 21:52:40'),
('f70f36d3-b903-4536-80c5-06466d5aa6df', 'maintenance_status_changed', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"مقبض الباب ثقيل\" من قبل support - الوحدة: شقة رقم 3', NULL, 'all_admins', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 1, '2025-12-31 10:20:14'),
('f715636a-1755-4881-9bd1-4ffe5f7e1a40', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 38 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-13 15:50:29'),
('f7204a80-251f-418c-b379-57df7a7ca11b', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-18 02:25:06'),
('f74f28a9-297a-4d1d-b829-357b90677675', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 22 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 21:09:16'),
('f75aa7c1-11e6-4750-b977-8579a3af8478', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:36:26'),
('f7b78c74-75b4-4882-8ff6-3249aa2e8f55', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 30 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:28:58'),
('f7d250c8-a8f5-4ad6-b63b-13443a22d851', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 16:17:30'),
('f7d2e90c-0a86-4df2-ab5e-832c58e25cbf', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 11:23:24'),
('f814cbb1-272a-4997-abec-3c5facf6bc04', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:11:41'),
('f82496d2-a5a0-44b1-92ed-3887bdce146d', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 20 حجز من 20 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 22:40:07'),
('f8ac8ddb-5f0a-4b47-9d6a-766127fb2aac', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 12:23:17'),
('f8b9c208-1b84-403f-9937-ae920f13cf5d', 'maintenance_status_changed', 'de1cae26-9e98-4fe8-bd68-af0a69008778', NULL, '311bb344-47e4-40da-9a34-875c9691ec22', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت الغرفة الثانيه\" من قبل support - الوحدة: شقة رقم 7', NULL, 'all_admins', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 1, '2025-12-31 10:24:33'),
('f8bd0581-70cb-49f6-b46d-b3f36514a1f5', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:27:36'),
('f8be9c98-e9b7-4947-8594-296867dbecd6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 14:10:48'),
('f928f489-a7d9-48f9-b4ac-bbb2f98b611b', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', '91f79e63-5b01-457b-bcda-af4b305d9260', 1, '2025-12-31 10:20:08'),
('f9927587-814a-4516-82b9-51d2648512f7', 'maintenance_created', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', NULL, '60a31478-515b-4467-aaa5-7fbfa9cc0639', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: بوية الصاله - الوحدة: شقة رقم 4', NULL, 'all_admins', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', 1, '2025-12-31 10:21:52'),
('f9eddf7e-1f35-4729-b8b2-31bdfbf88398', 'maintenance_created', '0e95fed2-e03c-4f47-81b1-2962e77c5887', NULL, '51857652-839f-437f-bcf9-86f85910061e', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: مقبض الباب ثقيل - الوحدة: شقة رقم 3', NULL, 'all_admins', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 1, '2025-12-31 10:20:08'),
('fa4bf637-53c5-4462-954d-7a974f139c9a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 08:19:41'),
('fa71c446-afb1-4fe1-9404-18b8b82e7299', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 02:43:38'),
('fb119741-b403-48cb-8cb1-68fb6efcb1e6', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 12:25:19'),
('fb229a69-e10d-4b32-8a48-cb396bfe763a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 19:38:44'),
('fb2ac24f-d573-44c1-a124-b7b3ba41f7f0', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 26 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 15:41:41'),
('fb537242-3e81-4558-bad3-568efd9ce0e2', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 29 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 13:23:20'),
('fc0e1b6f-3c50-4871-b605-112b97d71626', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 13:42:43'),
('fc581d2e-b5f1-4e55-a147-d5d79780c77f', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 24 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-17 06:10:17'),
('fc8906ee-bc6b-4578-ab1f-b066253a33cc', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 01:05:00'),
('fcdb55f2-6c8d-4e7f-a96c-04b58ded69de', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '2a899add-5494-49e1-9854-a2efc72cf54f', 1, '2026-01-01 10:33:40'),
('fce87f0d-6a90-4288-bcbe-6cef790210c2', 'maintenance_status_changed', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تم قبول تذكرة صيانة', 'تم قبول تذكرة الصيانة \"موكيت غرفة السينما\" من قبل Mahfouz S - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2026-01-01 10:33:45'),
('fd35e8b7-2435-4e0b-86f3-77ef38627404', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 01:26:53'),
('fe2c2a1b-042a-4119-bc9a-d9516ea79735', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 09:38:01'),
('fe9f5f3f-f43f-4ba3-a709-694f3e938031', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 27 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 22:52:55'),
('feb01239-60c6-4e50-a047-a60c880fe1d8', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 00:12:50'),
('fedf530a-0b7c-4a46-a1d7-bc0653e23518', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 16:28:48'),
('feff3def-1c5f-4cf3-8a8d-5eaf09454374', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 32 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-16 20:11:33'),
('ff675e20-4598-453f-ac9c-5d8606ba6820', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 14:40:59'),
('ffef0c89-e42c-4829-a6d4-d1c3166760af', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 33 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-14 13:05:39'),
('fff062c2-a068-432b-8c76-f60fb16e1a2a', 'booking_created', NULL, NULL, NULL, 'مزامنة جديدة', 'تم تحديث 28 حجز من 27 وحدة', NULL, 'all_admins', NULL, 1, '2025-12-15 03:25:41'),
('fff92cb8-b4fd-4155-82fc-4ec29f6bfc22', 'maintenance_created', '771e5211-e7d9-4123-af91-504128484e53', NULL, '593147a0-6e9c-4789-a13c-69c888850f20', 'تذكرة صيانة جديدة', 'تم إنشاء تذكرة صيانة جديدة: موكيت غرفة السينما - الوحدة: شقة رقم 5 الروضة', NULL, 'all_admins', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 1, '2026-01-01 10:33:40');

-- --------------------------------------------------------

--
-- Table structure for table `platform_accounts`
--

CREATE TABLE `platform_accounts` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `platform` enum('airbnb','gathern','whatsapp','general') NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_by` char(36) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `platform_accounts`
--

INSERT INTO `platform_accounts` (`id`, `platform`, `account_name`, `notes`, `created_by`, `created_at`) VALUES
('0986fffc-c919-461a-a374-f712bf7cfccd', 'gathern', 'أبو نواف', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:32:25'),
('1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'gathern', 'سليمان البازعي', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:32:44'),
('2f4b54f1-8453-4b51-8b73-f403e61d4868', 'gathern', 'فيصل العتيبي', NULL, '70b73b11-9e63-413d-a664-67e4c3d8d4d4', '2025-12-16 20:36:07'),
('400644b5-76a8-4c20-ba43-0a5747a199d0', 'airbnb', 'سليمان البازعي', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:33:23'),
('4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'gathern', 'The Nest', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:34:33'),
('50c21763-9749-4ed3-b521-3fb218da5269', 'airbnb', 'فيصل العتيبي', NULL, '70b73b11-9e63-413d-a664-67e4c3d8d4d4', '2025-12-16 20:35:44'),
('8ab0eba2-d75c-4ebc-8910-515e1349d362', 'gathern', 'حمد العتيبي', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:33:43'),
('8ce9858c-d1a7-466d-b1e1-a9c70159f7f7', 'airbnb', 'حمد العتيبي', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:33:52'),
('940d6260-9c03-47c4-b113-e4d6d58f8818', 'whatsapp', 'واتساب1', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-10 14:03:03'),
('9b25acf0-2122-454c-b6d1-1ac424807e4a', 'airbnb', 'أبو فيصل', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:34:17'),
('af5f4d20-014c-4bd9-99c2-19a7f100a859', 'gathern', 'أبو فيصل', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:34:08'),
('d28f0fd7-5568-4b7e-953b-3a6e52ab38eb', 'airbnb', 'The Nest', NULL, '54ac9a1a-f434-446d-9e6e-8455ea761cb3', '2025-12-12 05:34:42');

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `unit_id` char(36) NOT NULL,
  `platform` enum('airbnb','gathern') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `summary` text DEFAULT NULL,
  `raw_event` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_event`)),
  `is_manually_edited` tinyint(1) DEFAULT 0,
  `manually_edited_at` datetime DEFAULT NULL,
  `is_manual_edit` tinyint(1) DEFAULT 0,
  `suspected_fake` tinyint(1) DEFAULT 0,
  `last_synced_at` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp(),
  `platform_account_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservations` (`id`, `unit_id`, `platform`, `start_date`, `end_date`, `summary`, `raw_event`, `is_manually_edited`, `manually_edited_at`, `is_manual_edit`, `suspected_fake`, `last_synced_at`, `created_at`, `platform_account_id`) VALUES
('02a32eb5-d5df-40d2-958b-273bed92c1be', 'd4fd7924-3a63-4fe0-a12f-a09d460f1868', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019135258994@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10191352 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:32', '2026-01-28 17:07:02', 'af5f4d20-014c-4bd9-99c2-19a7f100a859'),
('03f85734-08fe-4b57-8cd4-095ac59e422c', '0e95fed2-e03c-4f47-81b1-2962e77c5887', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1020354645442@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10203546 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:28', '2026-01-28 23:39:07', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('0cb9fa74-632b-4172-918c-d57139348479', '91f324e6-33fc-4b5b-b9f8-8d695a1610ed', 'gathern', '2026-01-29', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"reservation-1014098377801@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10140983 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-28 17:06:55', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('0e9e79e7-836e-4108-bf45-315ce6d7bd07', 'ed6686e6-c553-4e77-9a12-fcb7bab3d91f', 'gathern', '2026-01-27', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1017010286723@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10170102 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-28 17:06:55', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('18d2a6aa-c0e7-4dac-b582-e70042be439a', 'ed6686e6-c553-4e77-9a12-fcb7bab3d91f', 'gathern', '2026-01-29', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"reservation-1015619537506@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10156195 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-28 17:06:55', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('19c22395-30a6-4ed7-aee2-024167bc31bb', '3403a222-bf01-4ca0-8e83-66d6054bf812', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1018965876121@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10189658 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:29', '2026-01-28 17:06:59', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('1c323e64-2775-4e25-a222-9d6944f87eb1', 'd9d4e851-d29f-4e57-ad25-968abc13c014', 'gathern', '2026-01-29', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"reservation-1016180394974@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10161803 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-28 17:06:55', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('25e48b07-ec48-4671-aa31-57d3ea707929', 'bc40f306-8c05-43f1-87ed-56377c125e6a', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019757975978@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10197579 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-28 17:06:55', '8ab0eba2-d75c-4ebc-8910-515e1349d362'),
('2bad1612-498c-4546-b534-0ef37f4e6a7e', '93f7f409-ab2b-4fc6-93c6-99491554b221', 'gathern', '2026-01-27', '2026-01-30', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-30\",\"summary\":\"Reserved\",\"uid\":\"reservation-1015657088112@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10156570 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:31', '2026-01-28 17:07:01', 'af5f4d20-014c-4bd9-99c2-19a7f100a859'),
('2c69877c-69c2-4323-854b-92ba12ce3450', '771e5211-e7d9-4123-af91-504128484e53', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019251212151@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10192512 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:31', '2026-01-28 17:07:01', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('33ed99ac-7fda-4a39-aeda-a0af999dab3a', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019082441837@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10190824 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:28', '2026-01-28 17:06:59', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('36791ef6-8502-4522-94bb-5c96e172c818', 'de1cae26-9e98-4fe8-bd68-af0a69008778', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1017366011128@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10173660 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:32', '2026-01-28 17:07:03', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('3b0758e6-421c-4f04-85b7-724d6915277d', '9fc6dda0-9c28-46c4-aed6-1e033fdba783', 'gathern', '2026-01-30', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-30\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"reservation-1020785968042@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10207859 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:31', '2026-01-29 02:30:08', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('3f2c8cc6-f112-47d5-9c00-d7a76b5e95a4', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', 'gathern', '2026-01-29', '2026-01-30', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-30\",\"summary\":\"Reserved\",\"uid\":\"reservation-1016882926169@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10168829 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:28', '2026-01-28 17:06:59', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('445700a8-394e-467d-8488-2ef25d1c3a0a', 'd4fd7924-3a63-4fe0-a12f-a09d460f1868', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1018157652580@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10181576 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:32', '2026-01-28 17:07:02', 'af5f4d20-014c-4bd9-99c2-19a7f100a859'),
('45862f82-28e7-4559-ab02-a26720adeb9f', '1174e625-e6fc-43b7-8375-1b861455b908', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1017209819755@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10172098 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:24', '2026-01-28 17:06:53', '2f4b54f1-8453-4b51-8b73-f403e61d4868'),
('4c00b558-79ad-4f92-a3b1-5db2c323d065', '567709a1-ddb4-4816-bd0d-6ca67cdfed22', 'gathern', '2026-01-29', '2026-01-30', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-30\",\"summary\":\"Reserved\",\"uid\":\"reservation-1021220347389@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10212203 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-29 15:25:15', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('5309f3e5-6d48-434e-950a-53610df55277', 'ed6686e6-c553-4e77-9a12-fcb7bab3d91f', 'gathern', '2026-02-01', '2026-02-16', 'Reserved', '{\"start\":\"2026-02-01\",\"end\":\"2026-02-16\",\"summary\":\"Reserved\",\"uid\":\"reservation-1014516135433@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10145161 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-28 17:06:55', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('55877227-3e63-45f2-89cf-c7cb596aa2fd', 'd4fd7924-3a63-4fe0-a12f-a09d460f1868', 'gathern', '2026-01-29', '2026-01-30', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-30\",\"summary\":\"Reserved\",\"uid\":\"reservation-1021468422001@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10214684 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:32', '2026-01-29 15:25:22', 'af5f4d20-014c-4bd9-99c2-19a7f100a859'),
('567b515f-3b51-4d1e-abc5-fe9b820c338c', '9fc6dda0-9c28-46c4-aed6-1e033fdba783', 'gathern', '2026-01-27', '2026-01-30', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-30\",\"summary\":\"Reserved\",\"uid\":\"reservation-1016895739186@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10168957 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:31', '2026-01-28 17:07:01', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('56a333de-2585-4f0e-85f3-cab280c841f6', 'f8249659-bd63-432e-b562-ff464dc66fb6', 'airbnb', '2026-01-26', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-26\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"1418fb94e984-189dfc0d03a4654455a2c0196ec720f1@airbnb.com\",\"status\":null,\"transparency\":null,\"description\":\"Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM43MK3MFQ\\nPhone Number (Last 4 Digits): 5665\"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-28 17:06:56', '400644b5-76a8-4c20-ba43-0a5747a199d0'),
('57063664-4985-4f8b-a94b-9cd9f90a792b', 'de1cae26-9e98-4fe8-bd68-af0a69008778', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019190882183@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10191908 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:32', '2026-01-28 17:07:03', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('61878aba-248e-4763-9831-1e28aed3435f', '0041bde4-4058-4fad-80ef-605b8b392478', 'gathern', '2026-01-29', '2026-01-30', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-30\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019108674275@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10191086 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:27', '2026-01-28 17:06:56', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('63c3f422-2290-469e-a97b-6c1afd272d93', '91f324e6-33fc-4b5b-b9f8-8d695a1610ed', 'gathern', '2026-02-08', '2026-02-11', 'Reserved', '{\"start\":\"2026-02-08\",\"end\":\"2026-02-11\",\"summary\":\"Reserved\",\"uid\":\"reservation-1015748498616@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10157484 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-29 00:59:27', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('68540917-a2b1-4eb9-b316-f073517e7f2a', '0e95fed2-e03c-4f47-81b1-2962e77c5887', 'gathern', '2026-01-29', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"reservation-1021027945977@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10210279 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:28', '2026-01-29 15:25:18', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('7007e3f1-3947-433c-b4b7-276858f3dd1f', '567709a1-ddb4-4816-bd0d-6ca67cdfed22', 'airbnb', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"1418fb94e984-1e51da0c3fda3eb7c66c1ad08b93a77a@airbnb.com\",\"status\":null,\"transparency\":null,\"description\":\"Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMKHX4WEBX\\nPhone Number (Last 4 Digits): 1323\"}', 0, NULL, 0, 0, '2026-01-29 16:28:30', '2026-01-28 17:07:00', '400644b5-76a8-4c20-ba43-0a5747a199d0'),
('7145c2d3-1926-47d9-ace8-4165658f8177', '75fd42a6-6472-4a44-9af2-5f93d8f559ae', 'gathern', '2026-03-18', '2026-03-25', 'Reserved', '{\"start\":\"2026-03-18\",\"end\":\"2026-03-25\",\"summary\":\"Reserved\",\"uid\":\"reservation-853355788672@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 8533557 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-29 00:59:27', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('7a8ac2ae-a6cc-400d-88d0-b916bed52499', '75fd42a6-6472-4a44-9af2-5f93d8f559ae', 'airbnb', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"1418fb94e984-aebfa6e199757e818e8746c50e2942c3@airbnb.com\",\"status\":null,\"transparency\":null,\"description\":\"Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMFMPRJXKQ\\nPhone Number (Last 4 Digits): 3139\"}', 0, NULL, 0, 0, '2026-01-29 16:28:30', '2026-01-28 17:07:01', '400644b5-76a8-4c20-ba43-0a5747a199d0'),
('7eba5638-cfef-4a25-b49d-968e48843a33', '771e5211-e7d9-4123-af91-504128484e53', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1016542687298@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10165426 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:31', '2026-01-28 17:07:01', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('829266a6-f2ee-4c34-ba29-5cacf582d407', '44ba8f4a-72ca-4b2f-87df-0640ee62f7f4', 'airbnb', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"1418fb94e984-6804dae06a81bf2cf43129b894907a20@airbnb.com\",\"status\":null,\"transparency\":null,\"description\":\"Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMXQRDFDXZ\\nPhone Number (Last 4 Digits): 4641\"}', 0, NULL, 0, 0, '2026-01-29 16:28:24', '2026-01-28 17:06:54', '400644b5-76a8-4c20-ba43-0a5747a199d0'),
('8c0e1ab0-f0eb-49c3-886c-1fdc3f705301', '75fd42a6-6472-4a44-9af2-5f93d8f559ae', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1020370571488@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10203705 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-28 23:39:04', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('911f05eb-3a8e-4af3-b7ad-36ba9652063a', 'f8249659-bd63-432e-b562-ff464dc66fb6', 'airbnb', '2026-01-29', '2026-02-02', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-02-02\",\"summary\":\"Reserved\",\"uid\":\"1418fb94e984-ddf69c96e6616fac18678ad9e5ec2dd9@airbnb.com\",\"status\":null,\"transparency\":null,\"description\":\"Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMASM2PA5Z\\nPhone Number (Last 4 Digits): 0449\"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-28 17:06:56', '400644b5-76a8-4c20-ba43-0a5747a199d0'),
('943474b1-c70b-45e5-804e-0139534ba109', '0769a926-05cf-4bda-ade2-c5048a3c5aff', 'gathern', '2026-01-29', '2026-01-30', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-30\",\"summary\":\"Reserved\",\"uid\":\"reservation-1018485314985@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10184853 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:23', '2026-01-28 17:06:52', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('94b3df9c-7486-41d3-8cbb-d0ff1e92cf31', 'd9d4e851-d29f-4e57-ad25-968abc13c014', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1018678751313@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10186787 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:26', '2026-01-28 17:06:55', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('96308d4f-536f-4061-b364-e39cc1550863', '39ecc931-9c1d-4143-910d-0058bcbeb2d6', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1018352212463@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10183522 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:24', '2026-01-28 17:06:53', '8ab0eba2-d75c-4ebc-8910-515e1349d362'),
('983f5390-6a7e-407d-8e3a-507c32e0dc52', '91f324e6-33fc-4b5b-b9f8-8d695a1610ed', 'gathern', '2026-01-25', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-25\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1014163791969@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10141637 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-29 15:27:02', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('9dbd7dea-0977-4a30-8635-836d22cc7b79', '06c0bed2-0b35-4fe8-a9d5-6726455a71ef', 'gathern', '2026-01-24', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-24\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1011210490848@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10112104 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:22', '2026-01-28 17:06:52', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('a56fdf31-ac79-4f90-aad8-d6279d5a5b99', 'd9d4e851-d29f-4e57-ad25-968abc13c014', 'gathern', '2026-02-02', '2026-02-05', 'Reserved', '{\"start\":\"2026-02-02\",\"end\":\"2026-02-05\",\"summary\":\"Reserved\",\"uid\":\"reservation-1021574829954@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10215748 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-29 15:25:16', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('aae7fe2c-4619-4731-8af1-39bf016e3f2c', '62bc1dc4-577b-4592-be5b-47d5c083cd9a', 'airbnb', '2026-01-27', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"1418fb94e984-3548eafc44a075733462430653d2f985@airbnb.com\",\"status\":null,\"transparency\":null,\"description\":\"Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMESPDA8YH\\nPhone Number (Last 4 Digits): 0665\"}', 0, NULL, 0, 0, '2026-01-29 16:28:30', '2026-01-28 17:07:00', '50c21763-9749-4ed3-b521-3fb218da5269'),
('b32d19ec-4cc0-4cb6-b234-42d9844a4d99', '0eb7fd83-9516-4883-b27a-176a299fac67', 'gathern', '2026-02-01', '2026-02-02', 'Reserved', '{\"start\":\"2026-02-01\",\"end\":\"2026-02-02\",\"summary\":\"Reserved\",\"uid\":\"reservation-1021638122185@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10216381 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:23', '2026-01-29 16:28:15', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('b48f1fbe-39d0-414d-a52b-bde02bda1d84', '91f324e6-33fc-4b5b-b9f8-8d695a1610ed', 'gathern', '2026-02-01', '2026-02-02', 'Reserved', '{\"start\":\"2026-02-01\",\"end\":\"2026-02-02\",\"summary\":\"Reserved\",\"uid\":\"reservation-1017730390650@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10177303 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-28 17:06:55', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('c776fd57-868f-48d2-981e-9bf02326e7bc', 'd9d4e851-d29f-4e57-ad25-968abc13c014', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019357171884@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10193571 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-28 17:06:55', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('c9bfd587-b6e9-4744-a605-25383aa3f3de', '567709a1-ddb4-4816-bd0d-6ca67cdfed22', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1020398260058@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10203982 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-28 23:39:03', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('ca03fe77-2385-45b0-894c-e4e1e65e2bd5', 'bc40f306-8c05-43f1-87ed-56377c125e6a', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1018364188869@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10183641 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:26', '2026-01-28 17:06:55', '8ab0eba2-d75c-4ebc-8910-515e1349d362'),
('d187154c-65d5-4a27-a03e-28fa9a7e082f', '0769a926-05cf-4bda-ade2-c5048a3c5aff', 'airbnb', '2026-02-04', '2026-02-07', 'Reserved', '{\"start\":\"2026-02-04\",\"end\":\"2026-02-07\",\"summary\":\"Reserved\",\"uid\":\"1418fb94e984-511c08ff67c9d5e440ae8ba61d575e71@airbnb.com\",\"status\":null,\"transparency\":null,\"description\":\"Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM83EFNKYD\\nPhone Number (Last 4 Digits): 7259\"}', 0, NULL, 0, 0, '2026-01-29 16:28:27', '2026-01-28 17:06:57', 'd28f0fd7-5568-4b7e-953b-3a6e52ab38eb'),
('d3cb5d31-4a0a-4653-893f-e4834310598a', 'ed6686e6-c553-4e77-9a12-fcb7bab3d91f', 'gathern', '2026-01-31', '2026-02-01', 'Reserved', '{\"start\":\"2026-01-31\",\"end\":\"2026-02-01\",\"summary\":\"Reserved\",\"uid\":\"reservation-1010630864951@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10106308 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-28 17:06:55', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('d4025a8d-bedc-482f-a39a-e1550a801878', '0769a926-05cf-4bda-ade2-c5048a3c5aff', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019618687567@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10196186 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:23', '2026-01-28 17:06:52', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('da19614a-8592-492a-b0ae-ebd97af36a78', '0e95fed2-e03c-4f47-81b1-2962e77c5887', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1017655642792@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10176556 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:28', '2026-01-28 17:06:58', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('db6684c9-f5ff-460c-8572-b37889f48f51', '0eb7fd83-9516-4883-b27a-176a299fac67', 'gathern', '2026-01-27', '2026-01-28', 'Reserved', '{\"start\":\"2026-01-27\",\"end\":\"2026-01-28\",\"summary\":\"Reserved\",\"uid\":\"reservation-1016567457067@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10165674 Guest: \"}', 0, NULL, 0, 0, '2026-01-28 21:02:24', '2026-01-28 17:06:53', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('dbd4f72c-5f4f-467a-8fb7-b909fdd2698b', '06c0bed2-0b35-4fe8-a9d5-6726455a71ef', 'gathern', '2026-01-29', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"reservation-1012132878104@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10121328 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:22', '2026-01-28 17:06:52', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('e3603bdb-fbb2-4044-9771-b373b79bcadc', '771e5211-e7d9-4123-af91-504128484e53', 'gathern', '2026-01-29', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"reservation-1018019257336@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10180192 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:31', '2026-01-28 17:07:01', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('e425d8f8-a907-46f6-947c-567730e96f69', 'de1cae26-9e98-4fe8-bd68-af0a69008778', 'gathern', '2026-01-29', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019470388870@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10194703 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:32', '2026-01-28 17:07:03', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('e63e6abd-4729-436e-8e92-d82a8f2b634b', '1174e625-e6fc-43b7-8375-1b861455b908', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1020091584429@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10200915 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:23', '2026-01-28 19:09:11', '2f4b54f1-8453-4b51-8b73-f403e61d4868'),
('e691a73e-85d9-485b-9010-3c14a82a59e2', 'd9d4e851-d29f-4e57-ad25-968abc13c014', 'gathern', '2026-02-11', '2026-02-12', 'Reserved', '{\"start\":\"2026-02-11\",\"end\":\"2026-02-12\",\"summary\":\"Reserved\",\"uid\":\"reservation-1010892124354@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10108921 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:26', '2026-01-29 00:59:28', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17'),
('e8196596-6ead-42ed-9140-103b39b1a1ef', 'a27e421a-3d72-47b0-a7fe-63fb4c15f4ba', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1019360490348@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10193604 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-28 17:06:55', 'af5f4d20-014c-4bd9-99c2-19a7f100a859'),
('eafbe23d-9872-43ac-9b9f-d7a1cbe3e290', '0eb7fd83-9516-4883-b27a-176a299fac67', 'gathern', '2026-01-28', '2026-02-01', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-02-01\",\"summary\":\"Reserved\",\"uid\":\"reservation-1016868292068@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10168682 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:23', '2026-01-28 17:06:53', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('eb6713d9-6959-4a4d-a7f7-03c41b0b358b', '62bc1dc4-577b-4592-be5b-47d5c083cd9a', 'airbnb', '2026-01-29', '2026-01-31', 'Reserved', '{\"start\":\"2026-01-29\",\"end\":\"2026-01-31\",\"summary\":\"Reserved\",\"uid\":\"1418fb94e984-680ff497f3690f5962eb9ae40c4b2e47@airbnb.com\",\"status\":null,\"transparency\":null,\"description\":\"Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMH2N9AFHR\\nPhone Number (Last 4 Digits): 3505\"}', 0, NULL, 0, 0, '2026-01-29 02:45:22', '2026-01-28 17:07:00', '50c21763-9749-4ed3-b521-3fb218da5269'),
('ebc43c2c-220b-4603-9c39-889fde66a422', '0041bde4-4058-4fad-80ef-605b8b392478', 'gathern', '2026-01-28', '2026-01-29', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-01-29\",\"summary\":\"Reserved\",\"uid\":\"reservation-1018103315107@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10181033 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:27', '2026-01-28 17:06:56', '0986fffc-c919-461a-a374-f712bf7cfccd'),
('ee7c4bd4-2742-445d-b7b8-fce3327f4357', '91f324e6-33fc-4b5b-b9f8-8d695a1610ed', 'gathern', '2026-02-06', '2026-02-08', 'Reserved', '{\"start\":\"2026-02-06\",\"end\":\"2026-02-08\",\"summary\":\"Reserved\",\"uid\":\"reservation-1017617691316@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10176176 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:25', '2026-01-29 00:59:27', '1f495aa4-3068-41ab-b41d-44a2a85ce98a'),
('f61684c5-86fc-489f-bc5c-68c25147f9c3', '39ecc931-9c1d-4143-910d-0058bcbeb2d6', 'gathern', '2026-01-28', '2026-02-01', 'Reserved', '{\"start\":\"2026-01-28\",\"end\":\"2026-02-01\",\"summary\":\"Reserved\",\"uid\":\"reservation-1015325291904@gathern.co\",\"status\":null,\"transparency\":null,\"description\":\"Booking ID: 10153252 Guest: \"}', 0, NULL, 0, 0, '2026-01-29 16:28:23', '2026-01-28 17:06:53', '8ab0eba2-d75c-4ebc-8910-515e1349d362');

-- --------------------------------------------------------

--
-- Table structure for table `role_system_permissions`
--

CREATE TABLE `role_system_permissions` (
  `id` char(36) NOT NULL,
  `role` varchar(50) NOT NULL,
  `system_id` varchar(50) NOT NULL,
  `can_access` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_system_permissions`
--

INSERT INTO `role_system_permissions` (`id`, `role`, `system_id`, `can_access`, `created_at`, `updated_at`) VALUES
('08bba84c-4b3c-4351-975b-8980a6de0f6e', 'admin', 'accounting', 0, '2026-01-29 15:24:11', '2026-01-29 15:24:12'),
('32d2e32a-f98e-4ce3-a83c-a2fd6e905b0f', 'maintenance_worker', 'rentals', 1, '2026-01-27 23:57:27', '2026-01-27 23:57:27'),
('3d9f7d0b-5c6b-4391-a86d-e807fde359ca', 'accountant', 'accounting', 1, '2026-01-28 00:04:48', '2026-01-28 00:04:48'),
('4d8a6c3f-8d69-415c-915f-09f771bd5191', 'hr_manager', 'crm', 1, '2026-01-28 19:55:12', '2026-01-28 19:55:12'),
('86b77e62-ccf2-4109-99c9-5bb6aeaa23ad', 'maintenance_worker', 'hr', 1, '2026-01-28 00:04:56', '2026-01-28 00:04:56'),
('949c5c09-98fd-4301-9951-be10875dd93c', 'admin', 'rentals', 1, '2026-01-27 23:56:49', '2026-01-27 23:56:49'),
('98aab26f-1f92-4cd5-8ce0-a1f1cd1ff101', 'employee', 'accounting', 0, '2026-01-29 15:24:15', '2026-01-29 15:24:16'),
('a6c85b00-3a16-4b63-80f4-760700f40b9a', 'employee', 'rentals', 1, '2026-01-28 19:06:30', '2026-01-28 19:06:30'),
('a9781aba-0e72-4d3f-95e5-5d70eb888f5f', 'hr_manager', 'rentals', 1, '2026-01-28 00:05:01', '2026-01-28 00:05:01'),
('bd836ce6-2d20-4d85-bebe-9f636a715e37', 'hr_manager', 'hr', 1, '2026-01-28 00:05:02', '2026-01-28 00:05:02'),
('d92a4270-2fc9-466f-b6a1-0e95fb93e453', 'employee', 'crm', 1, '2026-01-28 19:55:09', '2026-01-28 19:55:09'),
('db7b84b7-057d-4e43-9d48-631f8053903f', 'accountant', 'hr', 1, '2026-01-28 00:04:50', '2026-01-28 00:04:50'),
('e978053c-872f-4bd9-97fa-f36605881e42', 'admin', 'hr', 1, '2026-01-28 00:04:53', '2026-01-28 00:04:53'),
('f690fe45-89b1-4758-b6af-03fe69d23fac', 'admin', 'crm', 1, '2026-01-28 19:55:06', '2026-01-28 19:55:06'),
('fdab8689-0389-447f-9566-109639d29c50', 'employee', 'hr', 1, '2026-01-28 19:06:32', '2026-01-28 19:06:32');

-- --------------------------------------------------------

--
-- Table structure for table `sync_logs`
--

CREATE TABLE `sync_logs` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `run_at` datetime DEFAULT current_timestamp(),
  `status` enum('success','partial','failed') NOT NULL,
  `message` text DEFAULT NULL,
  `units_processed` int(11) DEFAULT 0,
  `errors_count` int(11) DEFAULT 0,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sync_logs`
--

INSERT INTO `sync_logs` (`id`, `run_at`, `status`, `message`, `units_processed`, `errors_count`, `details`) VALUES
('00a973fd-062b-400f-b8ce-8541e3e05dc1', '2025-12-14 12:28:06', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('00c730f9-5aa8-40b3-bcb1-a91a4c7dee23', '2025-12-13 14:06:09', 'success', 'تمت معالجة 18 وحدة، 22 حجز، 0 أخطاء', 18, 0, '{\"errors\":[]}'),
('0131797e-2084-4e0c-b844-4fe380802810', '2026-01-28 00:18:10', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('020fa5d2-3bad-48dc-af7a-a884a6030ca1', '2026-01-29 15:25:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('051599d6-f87e-4d70-ac44-95a071bf5cb8', '2026-01-27 21:15:14', 'success', 'تمت معالجة 37 وحدة، 11 حجز', 37, 0, NULL),
('060df50b-09d9-4231-9d72-366121fa7873', '2026-01-27 21:37:38', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('0782a736-1ba5-4261-ba1c-ad3f47a1319c', '2026-01-28 17:10:36', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('0966ae81-1478-4aab-a5dc-65295631d9bb', '2026-01-29 00:33:52', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('0a3b3ff0-2b58-4da2-8d63-d80d5baf083f', '2025-12-14 11:55:21', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('0ae50951-d967-48b0-9366-b336c6a591e4', '2026-01-28 15:34:04', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('0c64e149-130e-463f-aada-bb31142b6168', '2026-01-28 17:04:13', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('0cb40468-1ca9-43f4-b4f9-c700db34fc99', '2026-01-29 15:41:21', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('0dcb3f7a-ba77-4d84-afef-dfef6beb7bec', '2025-12-14 10:13:37', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('106ce9d8-2ea9-44eb-a5ff-b8722fda43d9', '2026-01-28 17:57:05', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('1091fffe-4e58-419d-be8a-7563bfadeeb2', '2025-12-14 08:46:55', 'success', 'تمت معالجة 27 وحدة، 27 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('1095ee3d-8079-49d0-b446-fe03a01c1954', '2025-12-13 15:59:57', 'success', 'تمت معالجة 27 وحدة، 38 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('10b003b4-c13c-4a02-884c-bf90bd91d6bf', '2026-01-29 15:53:39', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('13099004-cd9b-46dd-9508-d7bb40e5512d', '2025-12-14 12:09:52', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('13edcf61-ee8b-44fe-babb-5c1f19b2d861', '2025-12-14 08:59:15', 'success', 'تمت معالجة 27 وحدة، 27 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('14c27d63-7305-4647-807b-ed124dd67e95', '2025-12-14 08:58:42', 'success', 'تمت معالجة 27 وحدة، 27 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('151cb474-1df4-4b4a-b1da-c698dc2f13f8', '2026-01-29 01:13:42', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('15aeb951-9d96-432d-9772-913ae07ee576', '2025-12-14 13:33:31', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('15bcc5ea-37a4-4dc0-8f5b-fb3bf21c5921', '2026-01-27 21:59:52', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('16680e28-3fa9-4f60-9eb6-0d7de8fb28fc', '2025-12-14 13:28:44', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('1719411a-6526-4e65-8e0f-98c354b22293', '2026-01-28 17:10:26', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('172db4eb-d38f-4532-a18c-0d34e5713d73', '2026-01-28 23:39:15', 'success', 'تمت معالجة 37 وحدة، 4 حجز', 37, 0, NULL),
('17848e52-c571-4e50-8e2c-e591ea61ceab', '2026-01-29 15:57:09', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('17d7aa7e-5dc5-40ae-9ab2-59d062b0a4fc', '2025-12-14 12:56:22', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('19247b3a-705f-4e44-af2e-554a3c55138a', '2026-01-28 17:05:01', 'success', 'تمت معالجة 37 وحدة، 50 حجز', 37, 0, NULL),
('1b448bd3-55bc-4643-afa3-008815622905', '2026-01-29 02:45:25', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('1b846887-2dc0-4ce2-a206-8dfc43e892ee', '2026-01-29 15:55:30', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('1cbab7a5-31c6-4f72-8f75-1bebc5ee4f02', '2026-01-28 00:06:54', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('1dab1f57-fa62-43b1-b57f-db8c33f564bb', '2026-01-28 16:59:06', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('1fedf72d-8fe6-4cac-9b9e-88d3b95f39b6', '2026-01-27 22:04:53', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('1fee830d-1e30-4896-ac08-9c5be25ecb77', '2026-01-29 00:45:23', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('236abc13-1668-41a4-8aab-a2813b0eb024', '2026-01-27 23:29:39', 'partial', 'تمت معالجة 36 وحدة، 2 حجز', 36, 1, '{\"errors\":[\"شقة 202 الطائف: Duplicate entry \'567709a1-ddb4-4816-bd0d-6ca67cdfed22-airbnb-2026-01-27-2026-0...\' for key \'unique_reservation\'\"]}'),
('2370607a-5313-41f3-931b-585f4c43aac2', '2026-01-29 02:19:38', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2786c448-40b3-4576-8993-2a16498883b3', '2026-01-28 17:07:07', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2830c1fa-5890-4e42-8c88-f6b035a2b743', '2026-01-29 15:53:44', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2894c6e2-9189-4caf-942f-46f84aa5e998', '2026-01-29 15:25:54', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2940037d-b590-4a4e-afa1-41ae76268a36', '2025-12-13 13:39:07', 'success', 'تمت معالجة 12 وحدة، 13 حجز، 0 أخطاء', 12, 0, '{\"errors\":[]}'),
('29a33d5f-ddc3-446f-aba1-bb624cd9ae90', '2025-12-14 13:45:40', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('2a73e0ac-3b83-4460-8e3c-3fd683176462', '2026-01-29 15:32:32', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2ada2ddb-54fc-49d2-bfa0-bad84ddc58f9', '2026-01-29 01:08:45', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2b52d423-952e-4e5d-a5e6-c2414672e359', '2026-01-29 15:55:30', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2beee976-0518-4284-bbe3-c46a6153dd28', '2025-12-14 12:40:13', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('2c4aa963-aacb-43cc-bb88-9efc5e1d83b7', '2025-12-14 12:13:08', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('2cda1e3f-05ed-45c9-8e90-e2f31dfe747a', '2026-01-27 22:35:21', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2d08cac3-38e4-40f1-9023-c835b95be0f8', '2025-12-14 12:17:16', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('2d7f9b20-4932-4a8f-a2f1-8c3f82c396ce', '2025-12-14 13:03:23', 'success', 'تمت معالجة 27 وحدة، 31 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('2d8c8013-ab4f-400d-8f31-73fe8d485a1b', '2026-01-27 23:29:45', 'success', 'تمت معالجة 37 وحدة، 1 حجز', 37, 0, NULL),
('2da65949-770a-4728-b807-0c2bbefbbfd3', '2026-01-29 00:39:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2e4f997c-8309-4fcf-9fc1-96359b241452', '2026-01-28 00:17:12', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('2ffaf2c1-2580-4c6b-b4da-352d4ceb6702', '2026-01-29 02:22:22', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('305c94cb-f0e5-45f5-b7e4-55371d217d46', '2025-12-13 13:45:03', 'success', 'تمت معالجة 14 وحدة، 16 حجز، 0 أخطاء', 14, 0, '{\"errors\":[]}'),
('30ed272b-6290-4d59-98ca-61fb760e6f64', '2026-01-28 20:47:38', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('31a2ef30-0d7e-45d0-854e-03ce226d2ec1', '2025-12-13 15:59:35', 'success', 'تمت معالجة 27 وحدة، 38 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('350eb379-816e-46f7-8323-ad5751b09d41', '2026-01-28 00:09:07', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('364fc81f-267a-45e1-a12b-1d7b1fbbd868', '2026-01-28 23:46:10', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('372d41f2-1ac1-4c35-9014-bce4e4c3b38f', '2025-12-14 12:23:03', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('37f2f305-1a9c-4b1f-941e-7fd53b26d7c8', '2025-12-14 09:34:22', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('389f229c-42ba-4825-a4af-73d1090713fb', '2026-01-29 15:57:15', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('3bda2ed1-9f5a-4672-b637-58c9789846a4', '2026-01-29 00:16:31', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('3d7e1db3-68bc-41d6-8fdb-59d4c2c36341', '2025-12-14 13:11:41', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('3dccee97-a24e-4e18-b095-81563cfbf120', '2026-01-29 00:06:30', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('3e69cf08-8ba7-4777-9b01-e2f8fcbec8fd', '2025-12-14 12:07:02', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('3fa66319-2161-4db3-b242-6444d77a9953', '2026-01-28 15:23:11', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('4064b4ac-8504-4ecf-a316-30f572e2f61a', '2025-12-13 13:12:41', 'success', 'تمت معالجة 2 وحدة، 3 حجز، 0 أخطاء', 2, 0, '{\"errors\":[]}'),
('41250b0c-bdf6-4315-99e7-279374e212e9', '2026-01-29 00:48:12', 'partial', 'تمت معالجة 10 وحدة، 0 حجز', 10, 27, '{\"errors\":[\"Boho Nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"Garage Nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"ستديو 8D الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 2 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 38 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 211 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة  201 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 8B الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 304 ينبع [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"ستيديو 37 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"Retro nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"The Lounge [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 213 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة المروة 1-1: Unknown column \'platform_account_id\' in \'field list\'\",\"Garage Nest: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 3 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 4 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"استديو 0-1 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 1 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة  201 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 5 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 301 ينبع: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة المروة 2-أ: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 ينبع: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 7 الروضة: Unknown column \'platform_account_id\' in \'field list\'\"]}'),
('41b24635-25e1-452d-8680-6b00e7223b47', '2026-01-28 23:57:06', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('45662a86-175a-43c9-8cb2-7254caa49398', '2025-12-14 12:29:14', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('4658c555-54a0-4723-abe9-f860cb73eb87', '2025-12-14 10:06:47', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('47e144d6-d280-4682-b8ef-b7c1e7fb4f66', '2026-01-29 02:18:01', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('48435335-a9e4-440c-9ff5-7b7f03063ec0', '2025-12-14 08:49:03', 'success', 'تمت معالجة 27 وحدة، 27 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('4859ef40-499a-4e55-8888-de3f026fe622', '2025-12-14 12:20:57', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('4968ba4d-efcc-4253-bb6a-db1cc24e5aee', '2026-01-27 21:49:51', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('49dfe9aa-ce39-4ebe-9369-daaa1207e487', '2026-01-29 02:14:25', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('4ad0a925-6310-45b2-aa0f-5678b785ff74', '2026-01-27 21:35:02', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('4ee6a6a7-4e62-41c4-925c-cdd156a99733', '2026-01-28 15:05:04', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('51ab5a94-ca20-41a4-b3db-8a48a8dc5ae6', '2026-01-29 15:53:40', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('52ef6fcd-55c9-46e6-ac74-4895be02f7c8', '2026-01-27 23:31:28', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('532879db-ba7e-4888-bd7d-125769f92a57', '2025-12-14 09:38:20', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('53a1b02f-4818-424e-8a68-702487db5769', '2026-01-27 21:42:37', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('5453ab01-f5ee-4a88-bc9f-4e419190330d', '2026-01-28 21:02:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('56328e3b-ff04-4917-a296-46d70cac7495', '2026-01-28 19:09:23', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('567f10f9-dace-4af7-9b16-daa410c76cc8', '2026-01-28 00:06:54', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('57142153-04e5-40b6-9d20-ceebb4d080af', '2025-12-14 13:34:13', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('57b71d26-cda7-4f81-ae68-95aa65cd0ddb', '2026-01-29 02:09:46', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('58606e02-3e06-4fc1-950d-28d88a5307d3', '2026-01-28 23:49:31', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('5a6c93d7-84dd-4235-bce4-999a03d21798', '2025-12-14 13:30:22', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('5b1327ca-d7b9-4e2d-864a-fa2c20b8a24c', '2026-01-29 02:45:26', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('5b144407-41df-45b4-8901-59b29f8f9a3c', '2026-01-28 00:20:12', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('5c0e8f2a-1291-4287-8fe7-d39189af5a3e', '2025-12-14 12:29:27', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('5cf9a345-10cc-4f83-bdc2-6b7d5c79df0f', '2026-01-27 21:37:37', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('60507c23-181e-4adc-a368-8ab12c4762fa', '2025-12-14 12:23:17', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('621f8cad-9666-4a6a-81ff-5e47c0489471', '2026-01-28 16:53:10', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('622b681d-0883-4dfb-b270-9b31750e475d', '2026-01-28 00:20:12', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('6276fece-612f-4b1f-80c9-d8a401a3f8a2', '2025-12-14 12:32:29', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('62e90b9f-c38a-40fc-8fff-fad5d3d2f320', '2026-01-28 19:09:31', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('6305f472-c072-4f91-9d1c-5d7497af3a79', '2026-01-29 02:22:31', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('6488eaea-cfc3-4101-bbac-becbcee4fe9e', '2025-12-14 13:27:36', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('655dfc03-6a55-454f-b96c-78cfd3e09322', '2026-01-28 17:57:00', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('67929460-4025-4832-8dd7-ed142990cfc6', '2026-01-28 00:11:47', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('68dba9bd-3646-4f60-930b-4783d1865316', '2026-01-28 19:09:24', 'success', 'تمت معالجة 37 وحدة، 1 حجز', 37, 0, NULL),
('6de0e419-10be-4781-85a6-797016c8a0b2', '2026-01-29 00:58:13', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('6dfad047-a85d-4d27-bd8b-fe57d7e4da8b', '2026-01-29 00:33:47', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('6e893d21-aead-4eed-badd-c1960d06ccfb', '2026-01-28 15:28:13', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('6ed98331-099e-4bc2-b218-643a5450f43e', '2026-01-28 15:13:13', 'success', 'تمت معالجة 37 وحدة، 1 حجز', 37, 0, NULL),
('6f9809df-9bcd-43c4-93c4-a819ec669ef5', '2025-12-13 13:20:16', 'success', 'تمت معالجة 7 وحدة، 6 حجز، 0 أخطاء', 7, 0, '{\"errors\":[]}'),
('6ffc9531-b363-413e-b5dd-a55cb36fa04f', '2026-01-29 15:27:10', 'success', 'تمت معالجة 37 وحدة، 1 حجز', 37, 0, NULL),
('707ed903-cd11-454e-8d3f-13c5851cd2db', '2026-01-29 15:25:23', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('70e8a9c6-d631-491f-aa70-341f93a41245', '2026-01-28 17:07:03', 'success', 'تمت معالجة 37 وحدة، 50 حجز', 37, 0, NULL),
('725b3e36-ea33-4a20-9c05-71c692604dec', '2025-12-14 12:21:05', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('73a13117-b2ef-413c-af3a-b58f5f5a18fb', '2026-01-29 02:35:08', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('744304b1-041a-4f87-aad8-fb5f87bb94a9', '2026-01-28 16:54:10', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('759b0b61-b88d-4157-b56f-b502f02d501e', '2026-01-29 16:28:32', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('76e8cde9-c5a1-4978-b9de-5879eda0f6a7', '2025-12-11 12:16:21', 'success', 'تمت معالجة 2 وحدة، 6 حجز، 0 أخطاء', 2, 0, '{\"errors\":[]}'),
('77300529-2dc7-4d21-95be-b5be9cdce069', '2026-01-29 16:28:24', 'success', 'تمت معالجة 37 وحدة، 1 حجز', 37, 0, NULL),
('77cd90cf-80cb-4c52-aec4-26cbec6bfa6e', '2026-01-29 00:17:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('7a8afd62-cadc-43eb-95c2-17ae87223975', '2026-01-28 15:13:49', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('7a97c457-ba37-4a0b-aebc-345982b61a1b', '2026-01-29 01:21:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('7ce68219-5838-436c-a4b7-9650d4edf177', '2026-01-29 16:28:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('7fb18bc9-169a-4412-a81e-d3fb984a183a', '2026-01-29 00:02:04', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('80afba70-da9e-49d0-936b-ec2717544419', '2026-01-29 00:06:22', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('80b8f696-3146-4294-95b4-d7366ef1f726', '2025-12-14 12:17:41', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('8316ea73-217e-4870-9025-b8ae044c24aa', '2025-12-14 13:18:40', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('84000f72-fdfa-4e72-8c6f-efcbf25f3c6c', '2026-01-27 22:09:52', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('84589cb5-0fef-4a34-9c61-bcdaa872a437', '2026-01-29 02:19:15', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('853eccf2-c688-4168-a264-848855b9209f', '2025-12-14 11:57:17', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('86c90593-7a4a-4eff-8961-6079659aa61e', '2026-01-29 00:11:35', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('8a3791ac-96e5-45e7-bdfb-48457a5c071a', '2026-01-28 23:39:16', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('8af7f2a0-89e3-4197-9423-aa7463800f73', '2026-01-29 15:25:24', 'success', 'تمت معالجة 37 وحدة، 4 حجز', 37, 0, NULL),
('8b247eff-979a-4619-bdcd-40f7034900d4', '2026-01-27 21:49:51', 'success', 'تمت معالجة 37 وحدة، 1 حجز', 37, 0, NULL),
('8bff7ee1-a626-4692-b3cf-eb230357e091', '2026-01-28 00:11:47', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('8ee2fa46-30cd-42ba-a415-8327294fdc6e', '2025-12-14 11:59:27', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('901dfc9a-f899-4850-bc59-cf815e75785f', '2026-01-29 00:53:33', 'partial', 'تمت معالجة 10 وحدة، 0 حجز', 10, 27, '{\"errors\":[\"Boho Nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"Garage Nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"ستديو 8D الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 2 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 38 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 211 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة  201 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 8B الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 304 ينبع [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"ستيديو 37 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"Retro nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"The Lounge [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 213 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة المروة 1-1: Unknown column \'platform_account_id\' in \'field list\'\",\"Garage Nest: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 3 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 4 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"استديو 0-1 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 1 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة  201 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 5 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 301 ينبع: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة المروة 2-أ: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 ينبع: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 7 الروضة: Unknown column \'platform_account_id\' in \'field list\'\"]}'),
('90c935bf-d65a-4937-aeed-c45f994f28b3', '2026-01-29 00:58:43', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('924972e2-3aab-4f10-91d9-908cf7ceedbb', '2026-01-29 02:14:22', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('96f6c6e7-d377-49ec-bc81-63884b0cbf9e', '2025-12-14 09:55:28', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('98867d19-5cd2-437c-9e4d-a104869332a5', '2026-01-27 22:40:26', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('9b9a0a7f-12cf-4884-8867-5b904bc21580', '2025-12-14 08:32:36', 'success', 'تمت معالجة 27 وحدة، 27 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('9c8f1631-4f31-45a2-a14b-9707001ab6e5', '2025-12-13 15:50:29', 'success', 'تمت معالجة 27 وحدة، 38 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('9c91d2ba-cf11-4431-9f0a-201607c4d29f', '2026-01-28 16:45:30', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('9dab6201-b67f-4a0d-825e-9fbd47699d26', '2026-01-28 15:04:57', 'success', 'تمت معالجة 37 وحدة، 8 حجز', 37, 0, NULL),
('9e6c19cf-d588-45cc-871f-2002751eda2e', '2025-12-14 12:02:23', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('9edcee1a-30fb-4e71-a9db-95dd572f6668', '2026-01-28 00:09:07', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('9f314615-4881-4d50-9ede-2a25d7c3e2be', '2025-12-14 08:32:18', 'success', 'تمت معالجة 27 وحدة، 27 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('9f5dd223-1032-47a1-8f20-292c6c7a1659', '2026-01-29 16:28:24', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('a00c4a33-8059-4d97-abc9-9f54f92fad27', '2025-12-13 14:07:44', 'success', 'تمت معالجة 19 وحدة، 23 حجز، 0 أخطاء', 19, 0, '{\"errors\":[]}'),
('a1b2b241-1c30-4ff4-97cc-3a4a612d99e3', '2025-12-14 12:19:10', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('a3916058-8f33-4728-aded-909c8bf194ad', '2026-01-28 20:57:36', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('a3e0d3b2-7bc9-4600-aec3-ce13f9b50c86', '2026-01-28 15:08:20', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('a4d5dea7-2fcb-43dd-98b7-49654c994e12', '2025-12-13 14:21:51', 'success', 'تمت معالجة 25 وحدة، 34 حجز، 0 أخطاء', 25, 0, '{\"errors\":[]}'),
('a59f3260-b46e-4fc5-9c0f-a39bc5ef3455', '2026-01-29 15:50:47', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('a5bbda64-5f37-4478-a5c6-0a92bdc492d0', '2026-01-29 15:25:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('a5d893b2-29fb-457e-8262-353f62429748', '2026-01-28 15:39:09', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('a76f5995-2758-4728-ac09-22f1f9811973', '2026-01-29 02:30:10', 'success', 'تمت معالجة 37 وحدة، 1 حجز', 37, 0, NULL),
('a793ebfd-b32f-4616-86a8-e81b023b6d15', '2025-12-14 13:08:22', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('abef9f77-4ecf-4597-87cf-e33908d51d76', '2025-12-14 12:18:23', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('ad2b0255-a732-4e05-8881-0394b49c1a4a', '2026-01-29 15:53:34', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('ad46a111-f97f-4d46-bbdb-e2fa720a2130', '2026-01-29 00:59:35', 'success', 'تمت معالجة 37 وحدة، 4 حجز', 37, 0, NULL),
('ad97d772-6edb-4144-ae40-a8dc08b2a478', '2026-01-28 15:18:15', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('afe7aa5a-04a8-45ec-9572-e46118855038', '2026-01-29 15:57:09', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('b1f2fd62-df05-47b5-b772-df14dfac0d3d', '2026-01-29 15:25:34', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('b2419eb3-b2d3-46c0-b160-de5159fa944c', '2026-01-27 23:31:06', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('b29594dd-21ce-4995-a809-76b34713316a', '2025-12-14 13:04:40', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('b358b58e-e773-4fc8-b8a1-8d5a5ac4ed40', '2026-01-29 15:53:44', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('b38aa63f-3a54-48fd-97d1-3878d9fa67e5', '2026-01-27 22:42:36', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('b397fcd2-3c49-4a37-99f8-5b5921d520c9', '2025-12-14 13:20:08', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('b427b2cb-4021-4dea-8979-444a346fe65d', '2025-12-14 12:07:37', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('b661f828-d91b-4b86-b5d0-9ad48a4a3aa2', '2025-12-14 13:35:04', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('b6ec70f3-ede4-4f80-9295-937e4d476e28', '2026-01-29 02:25:12', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('b8b30528-4304-4bd5-9568-0acd17ce412c', '2026-01-27 21:44:49', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('b8c931ad-5fe3-4446-a95d-341ca77eddeb', '2026-01-29 00:40:26', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('b8f0765d-8096-4454-ace4-4f59c4094916', '2025-12-14 12:45:23', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('b961d678-fa97-4b31-b521-6c4409447fcd', '2025-12-14 09:38:01', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('b9caffbc-351f-43f6-8dda-f61291c42a6c', '2025-12-14 09:45:22', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('ba85f5d5-a918-4b50-b6e1-962f2cfb56d2', '2025-12-14 12:32:06', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('bb6029ca-098a-4957-935a-9e41793cc962', '2025-12-14 10:12:59', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('bba68cee-3570-4431-9a46-e831fa159b09', '2026-01-28 20:47:12', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('bbcd988a-da86-4c92-a30d-ef6053a49d69', '2025-12-13 13:28:58', 'success', 'تمت معالجة 9 وحدة، 8 حجز، 0 أخطاء', 9, 0, '{\"errors\":[]}'),
('bcc9feb8-a154-42f8-81b3-e8a2af69ee77', '2026-01-29 01:03:41', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('bda66b08-4d34-4fec-9885-14bd9acdf626', '2025-12-14 13:46:51', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('be2a3c8b-003d-4f42-a381-4468c70dc00d', '2026-01-29 15:53:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('bf1d34ac-481f-4bbb-9145-386755e9fd62', '2026-01-28 15:44:08', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('bfc13bc9-e5c2-4099-98b2-e6bb6e294eea', '2025-12-14 13:10:31', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('c05abb23-2431-4135-b7fb-692e66222a32', '2026-01-28 16:40:07', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('c12fffa2-2ba9-4609-b4b4-9f3299e14547', '2025-12-14 13:00:06', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('c152e91c-017b-4fac-9b6f-bb248d45386f', '2025-12-14 12:50:38', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('c172769f-577c-4532-b310-f009b679bfe0', '2025-12-14 09:10:02', 'success', 'تمت معالجة 27 وحدة، 30 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('c25fd9e9-04c5-467d-b55d-1b30b21bdcdf', '2026-01-29 02:14:21', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('c2ab6c76-434f-439c-8a87-088f3580fca0', '2026-01-29 15:53:20', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('c34681bf-0952-44a4-9730-d072b85c471f', '2025-12-14 13:37:13', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('c5a3c2df-1a50-4f7b-b7ee-9ea19b176c68', '2025-12-14 11:54:32', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('c6876444-d143-436c-b0d1-b67039bc34a5', '2025-12-14 10:17:19', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('c7a916c7-1a2b-4509-8c10-fcb5638c2bb4', '2026-01-29 15:57:24', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('c89bb108-1e1a-46a8-bf69-8784871dc3fd', '2026-01-29 02:09:47', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('c95eab28-cd13-49d1-a82c-a5486a1b15c1', '2026-01-29 02:22:13', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('c999b354-55bd-4860-8a73-6142f2bec174', '2026-01-27 22:34:10', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('c9bab7f9-0219-4bf3-8549-95f55602d8ef', '2025-12-14 12:53:01', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('cbfb779f-7053-4c93-8ccb-f71facc9e582', '2025-12-14 10:05:48', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('cd59e57e-1c39-44d7-9c57-f8b0abbf88ca', '2025-12-14 13:37:38', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('cdc3726a-8440-4d2e-84d0-93871f554c9c', '2025-12-14 13:22:13', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('cee35ab2-96ea-4f02-a6db-bf490e8a335c', '2025-12-14 13:04:00', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('cfb46bda-210d-47f2-9b1b-f8210e28ea2e', '2026-01-29 02:36:40', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('d087877d-b07e-42ae-a9c7-30a0afb31a12', '2026-01-29 02:12:52', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('d13fb6ed-fbac-4086-93ab-7d6d6feac453', '2026-01-27 23:31:28', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('d195c0c5-7e76-47a4-be83-bb243537d716', '2026-01-29 02:12:52', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('d3800cf7-2d09-41ad-9b57-e107b4f1aab6', '2026-01-29 00:48:32', 'partial', 'تمت معالجة 10 وحدة، 0 حجز', 10, 27, '{\"errors\":[\"Boho Nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"Garage Nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"ستديو 8D الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 2 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 38 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 211 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة  201 الطائف [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 8B الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 304 ينبع [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"ستيديو 37 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"Retro nest [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"The Lounge [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 213 الرياض [PRIMARY]: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة المروة 1-1: Unknown column \'platform_account_id\' in \'field list\'\",\"Garage Nest: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 3 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 4 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"استديو 0-1 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 1 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة  201 الطائف: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 5 الروضة: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 301 ينبع: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة المروة 2-أ: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة 202 ينبع: Unknown column \'platform_account_id\' in \'field list\'\",\"شقة رقم 7 الروضة: Unknown column \'platform_account_id\' in \'field list\'\"]}'),
('d40e2da8-bf70-4092-9d63-9c6c1d93476b', '2026-01-28 20:52:39', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('d40ff159-f38e-45fe-bf4d-6cb3bd29a360', '2026-01-28 00:17:52', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('d4499d68-2337-4df6-a669-c0879b3399d1', '2026-01-27 21:44:50', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('d4573af1-0200-4435-b50d-04ffa2fea070', '2025-12-14 12:40:24', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('d51693ad-ec9b-4dfe-9516-a8b3ad0d4102', '2025-12-14 12:07:59', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('d74a95e1-384f-43fb-add4-7d841aa9e5e5', '2025-12-14 13:05:20', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('d90297fe-b790-4c69-9572-e056911aba62', '2026-01-29 00:06:22', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('d95dac42-b074-4984-93cb-7ea929296e19', '2026-01-29 15:53:20', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('da2c3d39-1e96-4341-8f5f-6ef7e91b6adc', '2026-01-28 15:04:57', 'success', 'تمت معالجة 37 وحدة، 3 حجز', 37, 0, NULL),
('db1a9915-8133-4ac0-a4f0-eace1cbf0a0d', '2025-12-13 15:32:18', 'success', 'تمت معالجة 27 وحدة، 38 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('db48741f-0f71-42fb-9eb1-f880e1a54265', '2025-12-14 13:06:35', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('dba59488-8531-4582-8990-0a87095af69c', '2026-01-28 17:04:12', 'success', 'تمت معالجة 37 وحدة، 50 حجز', 37, 0, NULL),
('dbda56d6-b972-437f-848b-dc8305990a98', '2026-01-28 16:50:29', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('dd28b8bd-9e2a-48c5-a83e-752ca6f4d4ac', '2026-01-29 02:23:00', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('dd4d8054-b4b4-40bf-ba20-9b4ea9b23d09', '2025-12-14 12:20:40', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('ded4aaa9-0ec1-4ab1-84ad-d5aeddf246dc', '2025-12-14 11:59:16', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('df05a5f0-be56-4ffc-8292-b4bfe2e73368', '2025-12-14 13:05:38', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('df38844e-5c75-4d16-8dde-34e765f5fdf6', '2025-12-14 09:45:09', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('df605af9-c944-43ff-a0ca-56b9c3a8bd5a', '2025-12-14 13:05:39', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('df98d0dd-7958-49b8-99d0-0ffae2e3344b', '2025-12-14 12:07:46', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('e086dae1-7d84-4f03-ac92-0afce21babdb', '2025-12-14 13:34:49', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('e16ff877-4970-4007-bed0-017e6bf7220d', '2026-01-28 17:57:00', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('e3527e56-20c3-402a-8eab-52ee20ca7635', '2025-12-14 12:30:45', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('e4717723-5884-43c4-845f-d0f1801b714c', '2025-12-14 09:43:35', 'success', 'تمت معالجة 27 وحدة، 32 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('e4c249cd-0f92-4f85-ad4c-5f51c54b46c9', '2025-12-14 12:54:42', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('e4e722be-d949-4471-b7f2-7e2ab5bd69b5', '2025-12-14 12:44:09', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('e6882227-d607-45b2-b6b4-abff5dd2e8ca', '2026-01-27 23:31:07', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('e6e32d07-d559-490e-b004-b38f2bc20c50', '2026-01-27 21:54:50', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('e9e8d580-9ff2-4d6c-87be-1b60fbc5cd0f', '2025-12-14 12:33:50', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('eaa7333d-9ee5-4aaf-b3fb-cf6e9ca808a7', '2025-12-11 03:22:49', 'success', 'تمت معالجة 1 وحدة، 2 حجز، 0 أخطاء', 1, 0, '{\"errors\":[]}'),
('eb676a0d-b592-46ef-9bb5-05c34a1313d3', '2025-12-12 05:57:27', 'success', 'لا توجد تقويمات للمزامنة', 0, 0, NULL),
('ec6a99c3-3409-45cd-a022-d33a1272bc76', '2026-01-28 20:47:12', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('f402f6f8-a3aa-49a3-8474-4881b5d47348', '2025-12-13 14:11:00', 'success', 'تمت معالجة 21 وحدة، 24 حجز، 0 أخطاء', 21, 0, '{\"errors\":[]}'),
('f58bb967-0466-45ed-98f4-059ddd71669e', '2026-01-29 02:22:51', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('f7a1d88e-934e-454c-91b9-bc5df231524b', '2026-01-28 23:54:10', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('f7abf0d2-72cd-45be-af86-690737e38171', '2026-01-29 00:04:02', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('f7ed64f4-5a4c-4f04-99e8-cef57b65af10', '2026-01-29 15:27:33', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('f9ef5780-717f-4f4e-9d68-4e3668c5fca0', '2026-01-28 16:40:29', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('fa593e2d-fee0-4985-9763-27f93d742eeb', '2025-12-14 12:54:55', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('fb03a211-85e8-4e13-a2d2-68c1334ce878', '2026-01-28 17:04:40', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('fc34788c-7995-47ec-b60b-1b2fb356e234', '2025-12-14 13:47:00', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('fd95448d-d50b-48c8-81c1-6caf53d44b4a', '2026-01-27 22:34:08', 'success', 'تمت معالجة 37 وحدة، 0 حجز', 37, 0, NULL),
('fe942b2a-aa71-4199-84d0-6454a310996f', '2025-12-14 13:11:41', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}'),
('ff6d1b9e-2137-4721-b7d7-a8b524092d61', '2025-12-14 12:52:31', 'success', 'تمت معالجة 27 وحدة، 33 حجز، 0 أخطاء', 27, 0, '{\"errors\":[]}');

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `platform_account_id` char(36) DEFAULT NULL,
  `unit_name` varchar(255) NOT NULL,
  `unit_code` varchar(100) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `readiness_status` varchar(50) NOT NULL DEFAULT 'ready',
  `readiness_checkout_date` date DEFAULT NULL,
  `readiness_checkin_date` date DEFAULT NULL,
  `readiness_guest_name` varchar(255) DEFAULT NULL,
  `readiness_notes` text DEFAULT NULL,
  `readiness_updated_by` char(36) DEFAULT NULL,
  `readiness_updated_at` datetime DEFAULT current_timestamp(),
  `readiness_group_id` char(36) DEFAULT NULL,
  `readiness_group` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `last_synced_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`id`, `platform_account_id`, `unit_name`, `unit_code`, `city`, `address`, `capacity`, `status`, `readiness_status`, `readiness_checkout_date`, `readiness_checkin_date`, `readiness_guest_name`, `readiness_notes`, `readiness_updated_by`, `readiness_updated_at`, `readiness_group_id`, `readiness_group`, `created_at`, `last_synced_at`) VALUES
('0041bde4-4058-4fad-80ef-605b8b392478', '0986fffc-c919-461a-a374-f712bf7cfccd', 'شقة المروة 1-1', '595671', 'جدة - حي المروة', NULL, 0, 'active', 'ready', NULL, NULL, NULL, NULL, 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '2026-01-27 11:59:19', NULL, NULL, '2025-12-13 13:17:52', '2026-01-29 16:28:27'),
('06c0bed2-0b35-4fe8-a9d5-6726455a71ef', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'Boho Nest', '035557', 'جدة - حي الروضه', NULL, 0, 'active', 'occupied', '2026-01-29', '2026-01-24', 'مرام المالكي', NULL, 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '2026-01-24 17:58:54', '728f86f5-907c-4be7-a3f1-9550f86ba58c', NULL, '2025-12-13 14:03:55', '2026-01-29 16:28:27'),
('0769a926-05cf-4bda-ade2-c5048a3c5aff', NULL, 'Garage Nest', '501713', 'جدة - حي الروضة', 'جدة - حي الروضة', 0, 'active', 'awaiting_cleaning', NULL, NULL, NULL, NULL, 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-27 12:57:31', NULL, NULL, '2026-01-26 11:07:38', '2026-01-29 16:28:27'),
('0e95fed2-e03c-4f47-81b1-2962e77c5887', '0986fffc-c919-461a-a374-f712bf7cfccd', 'شقة رقم 3 الروضة', '285078', 'جدة - حي الروضه', NULL, 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'تركي البيشي', 'الضيف مدد', 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-27 09:32:33', NULL, NULL, '2025-12-13 13:12:02', '2026-01-29 16:28:28'),
('0eb7fd83-9516-4883-b27a-176a299fac67', '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'ستديو 8D الرياض', '897525', 'الرياض - حي العقيق', NULL, 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'محمد ابراهيم', NULL, 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-27 08:19:35', 'fac99d0f-1ef5-4218-be07-0e4ccaae8337', NULL, '2025-12-13 13:50:44', '2026-01-29 16:28:28'),
('1174e625-e6fc-43b7-8375-1b861455b908', NULL, 'شقة 2 الطائف', '359379', 'الطائف - حي القطبية', NULL, 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'دانة الطويرقي', NULL, '8ef0a438-15e3-4d76-b120-c83c909b48e3', '2026-01-27 04:53:54', NULL, NULL, '2025-12-18 11:28:51', '2026-01-29 16:28:28'),
('125fa464-e26c-4edc-a924-eb750be95a10', NULL, 'شقة 2 الروضة', '373959', 'جدة - حي الروضة', 'جدة - حي الروضة', 0, 'active', 'booked', '2026-02-03', '2026-01-19', 'حجز خارجي من المستثمر', NULL, 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-20 11:28:14', NULL, NULL, '2026-01-01 10:19:23', '2026-01-29 16:28:23'),
('1e617acf-3ce5-4d97-a5a4-a652191e63d3', '0986fffc-c919-461a-a374-f712bf7cfccd', 'شقة رقم 4 الروضة', '219285', 'جدة - حي الروضه', NULL, 0, 'active', 'ready', '2026-01-27', '2026-01-26', 'Reserved', NULL, 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '2026-01-27 11:12:27', NULL, NULL, '2025-12-13 13:14:06', '2026-01-29 16:28:28'),
('3403a222-bf01-4ca0-8e83-66d6054bf812', '0986fffc-c919-461a-a374-f712bf7cfccd', 'استديو 0-1 الروضة', '435431', 'جدة - حي الروضه', NULL, 0, 'active', 'ready', NULL, NULL, 'Reserved', NULL, 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-27 12:58:27', NULL, NULL, '2025-12-13 13:10:20', '2026-01-29 16:28:29'),
('39ecc931-9c1d-4143-910d-0058bcbeb2d6', '8ab0eba2-d75c-4ebc-8910-515e1349d362', 'شقة 38 الرياض', '246656', 'الرياض - حي قرطبة', NULL, 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'عبدالله الاسمري', NULL, 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '2026-01-27 17:46:45', '2a827734-1519-42e2-82eb-31a488800638', NULL, '2025-12-13 13:43:24', '2026-01-29 16:28:29'),
('44ba8f4a-72ca-4b2f-87df-0640ee62f7f4', NULL, 'شقة 211 الرياض', NULL, 'الرياض -  حي العقيق', 'الرياض - حي العقيق', 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'AB', '966 54 720 4641‬', NULL, NULL, NULL, NULL, '2026-01-20 13:04:31', '2026-01-29 16:28:24'),
('567709a1-ddb4-4816-bd0d-6ca67cdfed22', '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'شقة 202 الطائف', '722669', 'الطائف - حي مسرة 2', NULL, 0, 'active', 'ready', NULL, NULL, 'Reserved', NULL, '91f79e63-5b01-457b-bcda-af4b305d9260', '2026-01-25 11:40:16', '93465f4f-e01b-4975-80ca-948d98ecad05', NULL, '2025-12-13 13:48:44', '2026-01-29 16:28:30'),
('62bc1dc4-577b-4592-be5b-47d5c083cd9a', NULL, 'شقة 1 الطائف', '289628', 'الطائف - حي القطبية', NULL, 0, 'active', 'occupied', '2026-01-29', '2026-01-27', 'عبداللة الوقداني', 'حجز اير بي ان بي', NULL, NULL, NULL, NULL, '2025-12-18 11:31:18', '2026-01-29 16:28:30'),
('75fd42a6-6472-4a44-9af2-5f93d8f559ae', '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'شقة  201 الطائف', '282641', 'الطائف - حي مسرة 2', NULL, 0, 'active', 'ready', NULL, NULL, 'Reserved', NULL, '91f79e63-5b01-457b-bcda-af4b305d9260', '2026-01-26 12:32:17', '598e9533-bc1f-46ea-9524-7b9175fe9864', NULL, '2025-12-13 13:51:40', '2026-01-29 16:28:30'),
('771e5211-e7d9-4123-af91-504128484e53', '0986fffc-c919-461a-a374-f712bf7cfccd', 'شقة رقم 5 الروضة', '124945', 'جدة - حي الروضه', NULL, 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'سعيد عمران', NULL, 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-27 10:43:49', NULL, NULL, '2025-12-13 13:15:26', '2026-01-29 16:28:31'),
('91f324e6-33fc-4b5b-b9f8-8d695a1610ed', '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'شقة 8B الرياض', '709850', 'الرياض - حي العقيق', NULL, 0, 'active', 'occupied', '2026-01-29', '2026-01-25', 'عبدالرحمن الخزاعي', NULL, '47eed255-46fc-4bce-ad1f-64030b9cde0c', '2026-01-25 13:27:26', 'c8ec444a-5c44-4683-ae4d-04e8e322c531', NULL, '2025-12-13 13:49:50', '2026-01-29 16:28:31'),
('93f7f409-ab2b-4fc6-93c6-99491554b221', 'af5f4d20-014c-4bd9-99c2-19a7f100a859', 'شقة 301 ينبع', '242294', 'ينبع - حي البندر', NULL, 0, 'active', 'occupied', '2026-01-30', '2026-01-27', 'عمر المحمادي', NULL, 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-27 13:00:59', NULL, NULL, '2025-12-13 13:28:15', '2026-01-29 16:28:31'),
('9fc6dda0-9c28-46c4-aed6-1e033fdba783', '0986fffc-c919-461a-a374-f712bf7cfccd', 'شقة المروة 2-أ', '589104', 'جدة - حي المروة', NULL, 0, 'active', 'occupied', '2026-01-30', '2026-01-27', 'مبارك اليوسف', 'دخول مبكر يوم ٢٧ الفجر متواصلة معانا باسم نجلاء', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '2026-01-26 19:18:05', NULL, NULL, '2025-12-13 13:19:26', '2026-01-29 16:28:31'),
('a27e421a-3d72-47b0-a7fe-63fb4c15f4ba', NULL, 'شقة 304 ينبع', '041901', 'ينبع - حي البندر', 'ينبع - حي البندر', 0, 'active', 'ready', NULL, NULL, NULL, NULL, '91f79e63-5b01-457b-bcda-af4b305d9260', '2026-01-22 11:45:06', NULL, NULL, '2025-12-21 10:03:47', '2026-01-29 16:28:25'),
('bc40f306-8c05-43f1-87ed-56377c125e6a', '8ab0eba2-d75c-4ebc-8910-515e1349d362', 'ستيديو 37 الرياض', '676292', 'الرياض - حي قرطبة', NULL, 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'عبدالرحمن حواف', NULL, 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '2026-01-27 17:47:56', '8a320b08-90ac-41c4-9b3d-d8949d6045d7', NULL, '2025-12-13 13:44:26', '2026-01-29 16:28:32'),
('d4fd7924-3a63-4fe0-a12f-a09d460f1868', 'af5f4d20-014c-4bd9-99c2-19a7f100a859', 'شقة 202 ينبع', '281718', 'ينبع - حي البندر', NULL, 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'حمود الشمري', NULL, 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '2026-01-27 16:30:24', NULL, NULL, '2025-12-13 13:27:04', '2026-01-29 16:28:32'),
('d9d4e851-d29f-4e57-ad25-968abc13c014', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'Retro nest', '171685', 'جدة - حي الروضه', NULL, 0, 'active', 'awaiting_cleaning', NULL, NULL, NULL, NULL, 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-27 12:58:08', '5bd5e99c-021b-40be-b95a-b68c54c007f1', NULL, '2025-12-12 05:44:47', '2026-01-29 16:28:32'),
('de1cae26-9e98-4fe8-bd68-af0a69008778', '0986fffc-c919-461a-a374-f712bf7cfccd', 'شقة رقم 7 الروضة', '070155', 'جدة - حي الروضه', NULL, 0, 'active', 'occupied', '2026-01-28', '2026-01-27', 'خالد عواجي', NULL, '8ef0a438-15e3-4d76-b120-c83c909b48e3', '2026-01-27 04:21:12', NULL, NULL, '2025-12-13 13:16:33', '2026-01-29 16:28:32'),
('ed6686e6-c553-4e77-9a12-fcb7bab3d91f', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'The Lounge', '660577', 'جدة - حي الروضه', NULL, 0, 'active', 'occupied', '2026-01-29', '2026-01-27', 'عبدالرحمن النجار', NULL, 'd2ca5150-e503-4d4f-9898-f97d36318567', '2026-01-27 12:55:30', '1c839843-eebe-4a3e-b023-ed617da579b4', NULL, '2025-12-13 13:38:28', '2026-01-29 16:28:33'),
('f8249659-bd63-432e-b562-ff464dc66fb6', NULL, 'شقة 213 الرياض', NULL, 'الرياض - حي العقيق', 'الرياض - حي العقيق', 0, 'active', 'occupied', '2026-01-29', '2026-01-26', 'مشاعل', NULL, '91f79e63-5b01-457b-bcda-af4b305d9260', '2026-01-26 08:04:10', NULL, NULL, '2026-01-20 13:08:35', '2026-01-29 16:28:26');

-- --------------------------------------------------------

--
-- Table structure for table `unit_calendars`
--

CREATE TABLE `unit_calendars` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `unit_id` char(36) NOT NULL,
  `platform` enum('airbnb','gathern') NOT NULL,
  `platform_account_id` char(36) DEFAULT NULL,
  `ical_url` text NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `unit_calendars`
--

INSERT INTO `unit_calendars` (`id`, `unit_id`, `platform`, `platform_account_id`, `ical_url`, `is_primary`, `created_at`) VALUES
('030bc375-1149-43bb-a22b-2d9fc341551f', '0eb7fd83-9516-4883-b27a-176a299fac67', 'airbnb', '400644b5-76a8-4c20-ba43-0a5747a199d0', 'https://ar.airbnb.com/calendar/ical/1504488077460412407.ics?t=7f2c1fa7eb9c42bcb259485c41cf5bf4', 0, '2025-12-18 08:15:09'),
('0a896d4d-27ce-4315-b381-65bd238eaca0', '771e5211-e7d9-4123-af91-504128484e53', 'gathern', '0986fffc-c919-461a-a374-f712bf7cfccd', 'https://gathern.co/ical/124945T7ujdn24.ics', 0, '2025-12-13 13:15:43'),
('1544ee81-aa58-41e6-ac5a-70bd8ef97ce5', '567709a1-ddb4-4816-bd0d-6ca67cdfed22', 'airbnb', '400644b5-76a8-4c20-ba43-0a5747a199d0', 'https://ar.airbnb.com/calendar/ical/1239628223790023707.ics?t=645cb71479c34595b1c5e27163285072', 0, '2025-12-18 08:17:24'),
('1b0d665c-42a4-478d-a325-7894a81ba27f', '0769a926-05cf-4bda-ade2-c5048a3c5aff', 'gathern', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'https://gathern.co/ical/501713C0TGKso5.ics', 1, '2026-01-26 11:12:19'),
('2612781c-f4af-4655-a348-1d33e8875b93', 'bc40f306-8c05-43f1-87ed-56377c125e6a', 'airbnb', '8ce9858c-d1a7-466d-b1e1-a9c70159f7f7', 'https://ar.airbnb.com/calendar/ical/1548490782638045187.ics?t=e532c50ae1704d60bab19ea80f6fc3a8', 0, '2025-12-18 08:42:58'),
('29a3f066-873b-48a5-ade8-791c0783de2c', '125fa464-e26c-4edc-a924-eb750be95a10', 'gathern', '0986fffc-c919-461a-a374-f712bf7cfccd', 'https://gathern.co/ical/373959ARNKOwOG.ics', 1, '2026-01-01 10:19:23'),
('2aaf72e6-e1b0-42f4-999e-b020870746f2', '91f324e6-33fc-4b5b-b9f8-8d695a1610ed', 'airbnb', '400644b5-76a8-4c20-ba43-0a5747a199d0', 'https://ar.airbnb.com/calendar/ical/1359607701240450475.ics?s=cbf2894cccb6f41f1174653b21a58876', 0, '2025-12-18 08:16:00'),
('33b0513c-11d7-4e04-86e6-8da91764cf9d', 'd4fd7924-3a63-4fe0-a12f-a09d460f1868', 'gathern', 'af5f4d20-014c-4bd9-99c2-19a7f100a859', 'https://gathern.co/ical/281718fuzDoGn8.ics', 0, '2025-12-13 13:27:32'),
('3dde84f7-07c6-4d0d-ba14-874821c34c0e', 'f8249659-bd63-432e-b562-ff464dc66fb6', 'airbnb', '400644b5-76a8-4c20-ba43-0a5747a199d0', 'https://ar.airbnb.com/calendar/ical/1594217719683613461.ics?t=26d3b5c122fb4235bb3422d311577485', 1, '2026-01-20 13:08:35'),
('4f193420-e69a-4251-b5ae-8ecea0c09228', '06c0bed2-0b35-4fe8-a9d5-6726455a71ef', 'gathern', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'https://gathern.co/ical/035557SatPT9ds.ics', 1, '2025-12-17 22:21:05'),
('522d75ab-43fb-4d51-a883-eb1669070be7', '62bc1dc4-577b-4592-be5b-47d5c083cd9a', 'airbnb', '50c21763-9749-4ed3-b521-3fb218da5269', 'https://ar.airbnb.com/calendar/ical/1454297740678379117.ics?t=88d7710a419149a793abc53d1fb680d4', 0, '2025-12-18 11:38:11'),
('53332620-6b1a-483a-a52f-023c04b481f9', '1174e625-e6fc-43b7-8375-1b861455b908', 'gathern', '2f4b54f1-8453-4b51-8b73-f403e61d4868', 'https://gathern.co/ical/3593794BzoLIst.ics', 1, '2025-12-18 11:28:51'),
('63375229-9118-4135-b5db-fcda25867ddb', '62bc1dc4-577b-4592-be5b-47d5c083cd9a', 'gathern', '2f4b54f1-8453-4b51-8b73-f403e61d4868', 'https://gathern.co/ical/289628rYqBhRAg.ics', 1, '2025-12-18 11:31:18'),
('64ac0054-6289-466c-b0aa-5a4fc3552ee4', '44ba8f4a-72ca-4b2f-87df-0640ee62f7f4', 'airbnb', '400644b5-76a8-4c20-ba43-0a5747a199d0', 'https://ar.airbnb.com/calendar/ical/1594421721877754929.ics?t=b2f6e553441e4b4aa6efb4afb8834088', 1, '2026-01-20 13:04:31'),
('69f69042-1e74-4888-af01-02c454548163', '1e617acf-3ce5-4d97-a5a4-a652191e63d3', 'gathern', '0986fffc-c919-461a-a374-f712bf7cfccd', 'https://gathern.co/ical/219285YknFUSNz.ics', 0, '2025-12-13 13:14:26'),
('7e25cfd4-5467-4a0d-bfd9-fdd3c4429130', '06c0bed2-0b35-4fe8-a9d5-6726455a71ef', 'airbnb', 'd28f0fd7-5568-4b7e-953b-3a6e52ab38eb', 'https://ar.airbnb.com/calendar/ical/1484772458638473182.ics?s=cd48529ee4f3fc460244b57f7be99f55', 0, '2025-12-17 22:21:21'),
('7e6edc2e-ad3b-4e30-8813-d4cfd1c5850e', '91f324e6-33fc-4b5b-b9f8-8d695a1610ed', 'gathern', '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'https://gathern.co/ical/709850K3magjDG.ics', 1, '2025-12-17 21:14:20'),
('7f68865c-09b3-4090-8a43-69881f1d42d0', '0769a926-05cf-4bda-ade2-c5048a3c5aff', 'airbnb', 'd28f0fd7-5568-4b7e-953b-3a6e52ab38eb', 'https://ar.airbnb.com/calendar/ical/1605438402726852548.ics?t=025bd31f364642f6863061faefa2f748', 0, '2026-01-26 11:14:22'),
('9cbb5aac-20ae-418f-9b5d-8642b54461bc', 'ed6686e6-c553-4e77-9a12-fcb7bab3d91f', 'gathern', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'https://gathern.co/ical/660577qzMlqwbZ.ics', 1, '2025-12-18 08:11:49'),
('9dde10e2-8c30-47b8-a323-d82296d2080a', '75fd42a6-6472-4a44-9af2-5f93d8f559ae', 'airbnb', '400644b5-76a8-4c20-ba43-0a5747a199d0', 'https://ar.airbnb.com/calendar/ical/1384932692494146462.ics?s=dbf3de7d35bad26a309ff70b62dbe053', 0, '2025-12-18 07:31:45'),
('9f9a3d5e-c371-4f4b-a23c-a162f7c44557', 'a27e421a-3d72-47b0-a7fe-63fb4c15f4ba', 'gathern', 'af5f4d20-014c-4bd9-99c2-19a7f100a859', 'https://gathern.co/ical/041901INLwKxjv.ics', 1, '2025-12-21 10:03:47'),
('a213b523-5c3d-4ecb-9ff5-030811fce6f9', 'bc40f306-8c05-43f1-87ed-56377c125e6a', 'gathern', '8ab0eba2-d75c-4ebc-8910-515e1349d362', 'https://gathern.co/ical/6762926iudJFUT.ics', 1, '2025-12-18 08:42:41'),
('a3122bd5-0758-4da9-a6ce-d5c90f699a0f', '75fd42a6-6472-4a44-9af2-5f93d8f559ae', 'gathern', '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'https://gathern.co/ical/2826412lwipRL3.ics', 1, '2025-12-17 21:13:11'),
('b58d6482-644f-43d0-a9a8-89fe0450cc5e', 'de1cae26-9e98-4fe8-bd68-af0a69008778', 'gathern', '0986fffc-c919-461a-a374-f712bf7cfccd', 'https://gathern.co/ical/070155bPUfSqVP.ics', 0, '2025-12-13 13:16:47'),
('b60eeecc-6c61-4c71-907f-ab23c05dbcc1', 'd9d4e851-d29f-4e57-ad25-968abc13c014', 'airbnb', 'd28f0fd7-5568-4b7e-953b-3a6e52ab38eb', 'https://ar.airbnb.com/calendar/ical/1484752009918646005.ics?t=c47142f260bd4e22864de4f7b6db0e4d', 0, '2025-12-18 08:38:05'),
('bac57fe3-deb9-4f96-bb45-e97de94cd33a', '3403a222-bf01-4ca0-8e83-66d6054bf812', 'gathern', '0986fffc-c919-461a-a374-f712bf7cfccd', 'https://gathern.co/ical/435431wPOWoWJn.ics', 0, '2025-12-13 13:10:44'),
('bd1d32b1-ea17-44b7-a3e6-438d59cc5427', 'd9d4e851-d29f-4e57-ad25-968abc13c014', 'gathern', '4ff6b410-de50-4f96-ad4e-99cd1e16cd17', 'https://gathern.co/ical/171685Sk8xotfw.ics', 1, '2025-12-18 08:37:48'),
('c32a0808-bb53-478d-8b4c-56273a52b5e3', 'ed6686e6-c553-4e77-9a12-fcb7bab3d91f', 'airbnb', 'd28f0fd7-5568-4b7e-953b-3a6e52ab38eb', 'https://ar.airbnb.com/calendar/ical/1308855745789786307.ics?s=45738c26af20cbf6c832efc9fd13597d', 0, '2025-12-18 08:13:02'),
('c9e0628d-dec0-4320-ab7b-a809d9609369', '0e95fed2-e03c-4f47-81b1-2962e77c5887', 'gathern', '0986fffc-c919-461a-a374-f712bf7cfccd', 'https://gathern.co/ical/285078w6F9FgtI.ics', 0, '2025-12-13 13:12:26'),
('d6f8f401-41bb-4417-b4ae-8e2cd3be7264', '9fc6dda0-9c28-46c4-aed6-1e033fdba783', 'gathern', '0986fffc-c919-461a-a374-f712bf7cfccd', 'https://gathern.co/ical/5891048ot9iHBF.ics', 0, '2025-12-13 13:19:42'),
('d8d829ea-6d53-47d6-8634-0e533b2b3f4f', '1174e625-e6fc-43b7-8375-1b861455b908', 'airbnb', '50c21763-9749-4ed3-b521-3fb218da5269', 'https://ar.airbnb.com/calendar/ical/1375334072867710592.ics?t=631382c7a7fe40f98d06eb2659e1b471', 0, '2025-12-18 12:28:34'),
('eb865ed4-09e9-4b0e-88a7-b6bdbeca26cc', '39ecc931-9c1d-4143-910d-0058bcbeb2d6', 'airbnb', '8ce9858c-d1a7-466d-b1e1-a9c70159f7f7', 'https://ar.airbnb.com/calendar/ical/1547964012649442971.ics?t=60cd6181bb4340ba8ea7bff988b642c4', 0, '2025-12-18 08:41:39'),
('ed59caf0-5328-4f1f-a5b6-e72a0a892c09', '39ecc931-9c1d-4143-910d-0058bcbeb2d6', 'gathern', '8ab0eba2-d75c-4ebc-8910-515e1349d362', 'https://gathern.co/ical/246656iiMgdau2.ics', 1, '2025-12-18 08:40:38'),
('ed82f55c-f564-4871-b876-767ecd321b3d', '0041bde4-4058-4fad-80ef-605b8b392478', 'gathern', '0986fffc-c919-461a-a374-f712bf7cfccd', 'https://gathern.co/ical/595671DiGMXrb5.ics', 0, '2025-12-13 13:18:07'),
('ee1ae2fc-7139-4374-9eab-3f376bfecb89', '0eb7fd83-9516-4883-b27a-176a299fac67', 'gathern', '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'https://gathern.co/ical/897525MO3xA1Uy.ics', 1, '2025-12-18 08:13:52'),
('ef16b7f1-c5b5-46b6-a431-6507bd2b5b85', '93f7f409-ab2b-4fc6-93c6-99491554b221', 'gathern', 'af5f4d20-014c-4bd9-99c2-19a7f100a859', 'https://gathern.co/ical/242294UP2fC30i.ics', 0, '2025-12-13 13:28:33'),
('f45bb556-5b94-48a1-b913-84c651db833d', '567709a1-ddb4-4816-bd0d-6ca67cdfed22', 'gathern', '1f495aa4-3068-41ab-b41d-44a2a85ce98a', 'https://gathern.co/ical/722669ygg1Cmsi.ics', 1, '2025-12-18 08:16:49');

-- --------------------------------------------------------

--
-- Table structure for table `unit_platforms`
--

CREATE TABLE `unit_platforms` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `unit_id` char(36) NOT NULL,
  `platform` enum('airbnb','gathern') NOT NULL,
  `listing_code` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('super_admin','admin','accountant','hr_manager','maintenance_worker','employee') NOT NULL DEFAULT 'employee',
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `name`, `is_active`, `created_at`, `updated_at`) VALUES
('12ba01f1-431d-4743-bdac-f2d3656a6702', 'abdo@nested.com', '$2b$10$JIQ4u9AT0ildiA/tbgRPHeGmi1vi7.MI9H78d8B.odvL3yE2BkMH2', 'hr_manager', 'عبده', 1, '2026-01-28 00:11:13', '2026-01-29 16:18:22'),
('1515563a-25dd-49f1-9cce-113b4f8d598e', 'lullwah@nested.com', '$2b$10$Wq2IeyC9lQ.OLg3oelCG4.3ykq7u.MzvC8gBmevAkUMJP8RMWtac2', 'super_admin', 'Lullwah', 1, '2025-12-12 14:17:39', '2026-01-27 20:27:19'),
('1eab8697-b979-4f6b-87f3-875eca97bc9e', 'sup1@nested.com', '$2b$10$Ni8L9D8Pir3sGBVtLpuvO.0h9eZRsgShcLXLVFK42av/Nc7b5PJKC', 'employee', 'Heba A', 0, '2025-12-12 14:20:48', '2026-01-28 19:02:05'),
('249a8942-353f-448c-911c-2ad3b444d457', 'ahmed@work.com', '$2b$10$0/uC3QKVmalV.0Tu68KAT.tzRhxwrcnFagKFGsosqsFtv.uIMpkN6', 'employee', 'ahmed@work.com', 1, '2026-01-21 11:02:56', '2026-01-28 19:02:05'),
('2a899add-5494-49e1-9854-a2efc72cf54f', 'quality@nested.com', '$2b$10$fXZhwv5EvJhXIAB8879gYeVtcUiV.P7LHyDi4WkoappomwoS8q8O2', 'employee', 'Ghala Abd', 1, '2025-12-31 19:16:49', '2026-01-28 19:02:05'),
('2c814a01-47cc-49ec-be06-d131aa1fa477', 'fatimah.nested@gmail.com', '$2b$10$lNzDFBRDOsCVPAUUTmsRmu1lMewsMdC06ntgCx5fGdgbCAe6mgIOq', 'employee', 'fatimah.nested@gmail.com', 1, '2026-01-21 11:02:56', '2026-01-28 19:02:05'),
('47eed255-46fc-4bce-ad1f-64030b9cde0c', 'emp1@nested.com', '$2b$10$43XhV9ToBGMAOeOzHdAgdeMzHyl4huryZKxOQmBMDGLuDtNNXW5mq', 'employee', 'Mustafa A', 1, '2025-12-12 14:29:16', '2026-01-28 19:02:05'),
('548bb74c-658f-4243-a35b-d343549ff5a1', 'emptest@test.com', '$2b$10$THNmL..GKP5AcndnUgPfK.xjDfQ13szkE5c3mNziFrHguEZWU2Ya2', 'employee', 'empTest', 1, '2025-12-14 11:59:33', '2026-01-28 19:02:05'),
('54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'elsamahy771@gmail.com', '$2b$10$ag/nb/2Ly5eKkH54paQBXezFi4iSumO61wBdV4rNrMi9OHAfil8c6', 'super_admin', 'محمد السماحي', 1, '2025-12-09 12:19:14', '2026-01-27 20:27:19'),
('70b73b11-9e63-413d-a664-67e4c3d8d4d4', 'hadeel@nested.com', '$2b$10$skjDcoHIsSCM3Tl9FrlrqevvIuSauvYQvIeNwyUtClY0VyhnGDc3u', 'super_admin', 'Hadeel', 1, '2025-12-12 14:16:50', '2026-01-27 20:27:19'),
('74fadfd8-402e-483f-9be1-dd94f246d9d9', 'osama@nested.com', '$2b$10$.CFgZj22KrHZTZdj7PGaUO/dXNrgkIJs2oUkVAkwe9a2685ks8GQq', 'accountant', 'Osama', 1, '2026-01-28 00:04:28', '2026-01-28 00:04:28'),
('8ef0a438-15e3-4d76-b120-c83c909b48e3', 'Abdulrahman@nested.com', '$2b$10$Ud4GUNCH.VZliLqg8Mal7.VhznpBDwtkgjtDVfo0Wlka/EY0RjRD.', 'employee', 'Abdulrahman O', 1, '2026-01-02 22:28:31', '2026-01-28 19:02:05'),
('91f79e63-5b01-457b-bcda-af4b305d9260', 'emp3@nested.com', '$2b$10$itYyLtTNO9FUOwazTQi7G.H06UoJOVyUIYqcEQAnCoYUsLZnmhaqu', 'employee', 'emp3', 1, '2025-12-12 14:27:29', '2026-01-28 19:02:05'),
('a981a22c-e66d-4d0f-9ac3-39c059d243f4', 'admin@nested.com', '$2b$10$h21ELBizvQpNVryWZO.G6uHBs80vXJR7rDXBFFwpJMnZqvPii.sx2', 'employee', 'Fatimah M', 1, '2025-12-12 14:18:23', '2026-01-28 19:02:05'),
('b44fc69c-bc3a-4c7e-9e70-75be2b187444', 'hadeel.nested@gmail.com', '$2b$10$MmfLO4zFd8BLQmLZUPh2g.6bGZLT9kTU.8jIe2AGIOMj75Q3ARDo6', 'employee', 'hadeel.nested@gmail.com', 1, '2026-01-21 11:02:56', '2026-01-28 19:02:05'),
('d2ca5150-e503-4d4f-9898-f97d36318567', 'emp2@nested.com', '$2b$10$nPH.wPPuJLeUvSHYMwz7AeOo.BE1mLk/rbXEZgRH5IaZpqip4Su.6', 'employee', 'Noran D', 1, '2025-12-12 14:28:26', '2026-01-28 19:02:05'),
('d7a5d5eb-6f44-46b6-b245-9088c2103250', 'support@nested.com', '$2b$10$GdEEvvU3hxNbuH7I9.m3ce10Cgy6mmHYW8ztF5qQrastQ21A59ClO', 'maintenance_worker', 'Mahfouz S', 1, '2025-12-12 14:23:49', '2026-01-27 20:27:20'),
('eb63fb7d-d362-40fc-9c9d-e758bcc1a580', 'lullwah.nested@gmail.com', '$2b$10$Y1aYCpkiQXsIl804wdMIX.CnwNigCFhArZauseC0uAcPchVzRLQkK', 'employee', 'lullwah.nested@gmail.com', 1, '2026-01-21 11:02:56', '2026-01-28 19:02:05'),
('fb7f2762-b924-4ea3-a222-df962185fc89', 'mho@work.com', '$2b$10$eBFio4d9yY5bGSSzGQDPi.ORDkvRvgE9m69lrRTZQK.z09LcjOj22', 'employee', 'mho@work.com', 1, '2026-01-21 11:02:56', '2026-01-28 19:02:05'),
('fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'emp4@nested.com', '$2b$10$PObs9FQJegcSwcbZD00ZwOgLF5KF6bSWXNH/Pg9hy.ARkyT176xza', 'employee', 'Mahmoud R', 1, '2025-12-12 14:26:10', '2026-01-28 19:02:05');

-- --------------------------------------------------------

--
-- Table structure for table `user_activity_logs`
--

CREATE TABLE `user_activity_logs` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `page_path` varchar(255) DEFAULT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `resource_id` char(36) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_activity_logs`
--

INSERT INTO `user_activity_logs` (`id`, `user_id`, `action_type`, `page_path`, `resource_type`, `resource_id`, `description`, `metadata`, `ip_address`, `user_agent`, `created_at`) VALUES
('036c3355-ffec-4565-a66b-d7326b32faa2', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/browser-accounts', NULL, NULL, 'عرض صفحة: /dashboard/browser-accounts', NULL, '41.236.115.171, 63.178.4.115, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-15 20:12:47'),
('04a2c44f-4816-45b1-82e9-342776b19f5e', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.115.159, 3.79.234.202, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-14 06:58:58'),
('04b17020-6ff0-4b89-9ce8-bf79d8e4edf5', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '196.151.49.139, 3.72.38.84, 3.126.42.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-20 15:11:39'),
('090475f9-6557-4f10-ada8-6a872839c933', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '41.236.115.171, 63.178.4.115, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-15 20:12:34'),
('0b0ed340-e8c0-4bf4-ade6-7a3a0a540a84', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '41.236.115.171, 63.178.4.115, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-15 19:16:49'),
('0bf14f2f-87b7-4e70-b653-aa888d075da0', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '2a02:ce0:2803:7518:3907:a420:29e7:5256, 63.17', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-15 20:12:53'),
('0ce084b8-cd12-40d3-9335-5b94cb3bb944', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '2a02:ce0:2803:7518:fd86:5795:61ea:b9ce, 3.120', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-22 03:37:34'),
('0fcf59c4-39c3-48b1-aa4f-dd66cf35e446', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '2a02:ce0:2803:7518:fd86:5795:61ea:b9ce, 3.120', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-22 03:33:58'),
('1392dc9d-1e16-4ef0-adf3-d70ebd4acdd4', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '2a02:ce0:2802:bac3:14e8:a389:cb89:99bb, 3.71.', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-19 11:34:16'),
('14dc6afd-dd6f-49e0-99ff-b36819a7ea34', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.115.159, 35.158.197.224, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-17 06:04:58'),
('1675cc32-1018-47d4-b15d-569e2ad8600f', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'update', '/dashboard/users', 'user_permissions', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'تحديث صلاحيات المستخدم: Mahfouz S', '{\"user_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"permissions_count\":8}', NULL, NULL, '2026-01-27 21:23:13'),
('170ea0ef-15e7-4176-86e7-69c82cd9fff3', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '217.55.128.92, 52.58.181.189, 3.127.101.13', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-27 11:09:22'),
('1a897f3e-7595-462f-99e1-9f2ad0bdc496', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '2a02:ce0:2803:7518:6153:71d8:eb96:3c4a, 35.15', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-17 07:35:59'),
('1aab6c50-6055-4522-803c-5778a6886fcf', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '196.153.8.219, 52.59.44.27, 63.177.138.6', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 00:16:07'),
('1c57d9da-64ea-4476-a882-8a8d84e1aada', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.81.221, 18.159.48.191, 63.178.178.160', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-18 07:43:00'),
('1c888a72-0e79-4240-9a69-e7d7f21bb169', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '82.197.61.14, 3.72.2.121, 63.178.144.166', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-16 11:01:09'),
('1f8398d6-1722-40d4-be23-ba21b34d39ca', '8ef0a438-15e3-4d76-b120-c83c909b48e3', 'page_view', '/dashboard/bookings/convert/56ea0ae0-c5c0-45a9-8344-4fc514e8af54', NULL, NULL, 'عرض صفحة: /dashboard/bookings/convert/56ea0ae0-c5c0-45a9-8344-4fc514e8af54', NULL, '45.244.108.89, 3.120.39.189, 63.177.138.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-22 04:48:35'),
('208dfad9-c8c4-4f5e-966a-f7c6cdaeca9c', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '51.39.102.177, 63.180.240.242, 63.176.8.12', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-26 04:14:42'),
('23b6c8f3-cede-49a5-b5c1-4d53e921ad5d', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '196.151.49.139, 3.72.38.84, 3.126.42.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-20 15:15:38'),
('295d96ea-ab8a-45af-b4b9-75b006bbc263', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '51.39.102.177, 3.122.237.43, 63.176.8.12', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-26 04:14:39'),
('2aaf67c2-556d-44c8-8ee2-67068445c417', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.1.83, 3.71.113.158, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-19 11:04:19'),
('2fa96118-f25e-4461-9b2a-0a2bebc669bd', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/maintenance', NULL, NULL, 'عرض صفحة: /dashboard/maintenance', NULL, '31.167.217.123, 18.199.220.60, 3.120.21.226', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-15 06:50:40'),
('328b8946-b981-4f45-b7d5-305edd4f2bc3', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '196.153.8.219, 52.59.44.27, 63.177.138.6', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 00:15:23'),
('3387c921-04f6-4efb-a4ef-c37138ded5a0', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '176.224.51.55, 3.70.223.237, 63.178.57.248', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-21 12:27:03'),
('343fd845-c0d4-4052-a707-bd2187277c27', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/bookings/edit/438c902f-1a3a-4770-8e8e-2e30f622c9d8', NULL, NULL, 'عرض صفحة: /dashboard/bookings/edit/438c902f-1a3a-4770-8e8e-2e30f622c9d8', NULL, '196.136.181.153, 52.59.44.27, 3.124.228.43', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 00:14:46'),
('344d1b8f-a390-4bf9-88e9-15a8a403dbfe', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.1.83, 3.71.113.158, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-19 11:13:12'),
('3479f13a-5b3e-4774-a8c4-df2f0cc92035', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.115.159, 18.199.220.60, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-15 06:23:49'),
('3b63242a-add6-4995-80c7-ef255d4e18f9', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '196.150.52.92, 18.199.100.155, 3.124.228.43', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', '2026-01-16 20:02:22'),
('3d137572-9ba4-4394-a3b7-434d3fc4cc80', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '196.136.181.153, 52.59.44.27, 3.124.228.43', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 00:13:34'),
('409f8ce9-c764-4eb2-9fde-1aeffd972d3c', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '31.167.217.123, 18.199.220.60, 3.120.21.226', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-15 06:50:39'),
('4139f42e-f386-4308-b0bc-d3b1c27c2c8d', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '41.199.249.135, 18.159.48.191, 3.66.82.120', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-18 06:26:06'),
('48e2c54f-38c3-4187-858e-c620a7585f4f', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '197.54.152.24, 3.72.2.121, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-16 10:36:24'),
('4996d55c-9fd4-41c2-8db8-e5c96c052ad3', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'update', '/dashboard/bookings', 'booking', 'ea1f364e-bf71-4207-bba6-54892610a37c', 'تحديث حجز: سمر ابو راديه', '{\"booking_id\":\"ea1f364e-bf71-4207-bba6-54892610a37c\",\"guest_name\":\"سمر مرزوق \"}', NULL, NULL, '2026-01-22 12:23:56'),
('4ab33a3a-a041-4100-8097-ae2ffe13d8a4', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.115.159, 3.79.234.202, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-14 07:33:45'),
('4f5ca95c-121c-4b6a-968c-a414be8b02b8', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.115.159, 63.178.11.84, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-14 05:33:33'),
('5087c5c6-9307-4b73-a830-e6d599ce9f4f', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '2a02:ce0:2803:7518:81d:11c1:d08a:768d, 3.79.2', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-14 08:27:05'),
('52643afd-bb08-41f1-93de-89df71d8f354', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.1.83, 18.199.143.253, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', '2026-01-24 08:13:27'),
('58427b54-6e99-44c7-8430-4a8e846121ed', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'create', '/dashboard/bookings', 'booking', '2b72d285-288d-456e-8b72-fce9c5ca5c55', 'إنشاء حجز جديد: ياسر محنشي', '{\"unit_id\":\"62bc1dc4-577b-4592-be5b-47d5c083cd9a\",\"guest_name\":\"ياسر محنشي\",\"checkin_date\":\"2026-01-23\",\"checkout_date\":\"2026-01-25\"}', NULL, NULL, '2026-01-23 10:43:38'),
('59a4c95e-fdeb-4099-952d-e917afac534a', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/bookings/convert/bfe302f2-a54e-4ffe-b260-32c8481b1605', NULL, NULL, 'عرض صفحة: /dashboard/bookings/convert/bfe302f2-a54e-4ffe-b260-32c8481b1605', NULL, '196.153.8.219, 52.59.44.27, 63.177.138.6', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 00:16:38'),
('5bffbdbf-a51f-44e9-9f5a-a3a02e210d04', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.1.83, 35.158.96.108, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', '2026-01-22 12:19:03'),
('5dd66d3f-e8b9-4f7b-ba9c-8d90449d8691', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/maintenance', NULL, NULL, 'عرض صفحة: /dashboard/maintenance', NULL, '2a02:ce0:2803:7518:b427:2f35:fec8:239e, 18.19', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-25 07:42:14'),
('6d8682ae-ca62-41f1-95aa-7cf7e4dfc113', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '2a02:ce0:2803:7518:fd86:5795:61ea:b9ce, 3.120', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-22 03:36:37'),
('6ee7fb73-2110-4ab5-9389-b2ed1c40770c', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '172.111.36.70, 3.232.95.36', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-25 23:34:57'),
('6f8e9106-28fb-4971-aa8d-752eb5716b13', '8ef0a438-15e3-4d76-b120-c83c909b48e3', 'page_view', '/dashboard/browser-accounts', NULL, NULL, 'عرض صفحة: /dashboard/browser-accounts', NULL, '45.244.108.89, 3.70.234.189, 63.177.138.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-21 21:04:25'),
('7203f88b-b05a-4959-ae21-9144364f77aa', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.1.83, 18.199.143.253, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', '2026-01-24 08:13:35'),
('75faefdc-1ae8-4f63-af72-fce48351b0e0', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.115.159, 18.199.220.60, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-15 06:23:56'),
('7a9b74e3-2f04-4213-9e91-3eca88b68439', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '82.197.61.14, 3.68.84.230, 63.178.144.166', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-16 11:06:58'),
('7f87ff9f-f777-48c2-9824-2626dbd15dc2', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '196.153.8.219, 52.59.44.27, 63.177.138.6', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 00:15:24'),
('840e9b81-cfdc-4c52-8831-9aa0627a1126', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '196.151.49.139, 3.72.38.84, 3.126.42.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-20 15:14:16'),
('857483ee-c277-4cbe-9435-2d7fa7669ff2', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '51.39.102.177, 3.122.237.43, 63.176.8.12', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-26 04:14:28'),
('859a29be-b194-46d4-86bc-818dcdca3c5d', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '197.43.1.26, 35.159.225.235, 35.159.104.41', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', '2026-01-20 14:00:57'),
('89017ae5-9e89-43ac-b588-b7354d4a6896', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.115.159, 63.178.11.84, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-14 05:33:41'),
('892272f9-3c9e-49c8-8d43-8a0651d64cb0', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '154.131.112.149, 52.58.242.222, 3.127.101.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '2026-01-21 12:40:25'),
('897260a2-2206-4760-9468-c952c42d89e6', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/bookings/new', NULL, NULL, 'عرض صفحة: /dashboard/bookings/new', NULL, '196.136.181.153, 52.59.44.27, 3.124.228.43', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 00:14:14'),
('8a4c8b4d-36c1-4e5e-863f-4716e84a7848', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '2a02:ce0:2803:7518:6153:71d8:eb96:3c4a, 35.15', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-17 07:35:49'),
('8c89765d-5638-4e9e-ab64-ac47b08959ca', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.1.83, 3.70.223.237, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', '2026-01-21 12:26:26'),
('8cc51f20-60de-4de4-ab75-55b01c1a6715', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'delete', '/dashboard/units', 'unit', '966535850665,47eed255-46fc-4bce-ad1f', 'حذف الوحدة: ', '{\"unit_name\":\"\",\"unit_id\":\"966535850665,47eed255-46fc-4bce-ad1f\"}', NULL, NULL, '2026-01-28 15:32:55'),
('8ee06dad-d3f5-457d-abb6-ca06aa65c205', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/browser-accounts', NULL, NULL, 'عرض صفحة: /dashboard/browser-accounts', NULL, '196.151.49.139, 3.72.38.84, 3.126.42.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-20 15:12:02'),
('9125e06d-ff47-4bc7-85ed-72e5662c1e9b', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/browser-accounts', NULL, NULL, 'عرض صفحة: /dashboard/browser-accounts', NULL, '41.236.115.171, 18.199.100.155, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-16 19:49:21'),
('92455aaf-4a00-4a21-8c7a-051b1b290751', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '196.136.181.153, 52.59.44.27, 3.124.228.43', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 00:13:48'),
('957f4c8b-1bcd-48b0-8d7c-6380a4560f0f', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.206.64.79, 35.158.197.224, 63.176.8.12', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-17 06:08:11'),
('98fa20c4-8db6-4a54-8a59-2a4adcc20bd2', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '41.236.115.171, 63.178.4.115, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-15 20:12:51'),
('9a24dcee-dd36-4ca4-be74-80497f6cd5b0', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/maintenance', NULL, NULL, 'عرض صفحة: /dashboard/maintenance', NULL, '51.39.102.177, 3.122.237.43, 63.176.8.12', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-26 04:14:29'),
('9ba8f324-3cd7-4526-af47-51f1722a1258', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/units', NULL, NULL, 'عرض صفحة: /dashboard/units', NULL, '2a02:ce0:2803:7518:b427:2f35:fec8:239e, 18.19', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-25 07:42:28'),
('9d1e53d7-2546-4cb3-9495-ec6bf9ceadc1', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.115.159, 18.197.154.188, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-15 08:05:03'),
('a04ef746-fd3e-48d5-984c-16f670bf64eb', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '196.150.52.92, 18.199.100.155, 3.124.228.43', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', '2026-01-16 19:58:13'),
('a1d1c770-ccae-4c43-a65f-e56987ebb2ed', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.115.159, 63.178.11.84, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-14 05:49:50'),
('a328ce5b-11e8-4de6-8573-dc5c7e0ebb5a', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '31.167.217.123, 18.159.48.191, 3.120.21.226', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-18 07:33:05'),
('a342c7a3-e038-4a3c-abbb-33757ff75925', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.1.83, 3.70.223.237, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', '2026-01-21 12:26:17'),
('a4613784-214a-44bb-bc89-3c460de395db', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.81.221, 3.120.180.155, 63.178.178.160', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-18 05:36:00'),
('a463e05e-866c-4393-b355-395cceaa907d', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/units', NULL, NULL, 'عرض صفحة: /dashboard/units', NULL, '2a02:ce0:2803:7518:fd86:5795:61ea:b9ce, 3.120', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-22 03:37:05'),
('a6c81fc8-e4c3-448e-8d7e-6177d83481f2', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'delete', '/dashboard/bookings', 'booking', 'booking-e907b7ac-8a60-47cb-9192-1795', 'حذف حجز: booking-e907b7ac-8a60-47cb-9192-179572d29459', '{\"booking_id\":\"booking-e907b7ac-8a60-47cb-9192-179572d29459\"}', NULL, NULL, '2026-01-29 00:17:26'),
('b1b5471a-2181-4cce-8e76-e56681235735', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'delete', '/dashboard/bookings', 'booking', 'booking-e907b7ac-8a60-47cb-9192-1795', 'حذف حجز: booking-e907b7ac-8a60-47cb-9192-179572d29459', '{\"booking_id\":\"booking-e907b7ac-8a60-47cb-9192-179572d29459\"}', NULL, NULL, '2026-01-29 00:17:09'),
('b3ca7d40-65d6-40f8-9a49-836fecd37246', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '31.167.217.123, 18.199.220.60, 3.120.21.226', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-01-15 06:50:46'),
('b4d6aac0-5065-47c3-aa53-0e142d9bf8d9', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/units', NULL, NULL, 'عرض صفحة: /dashboard/units', NULL, '196.151.49.139, 3.72.38.84, 3.126.42.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-20 15:15:46'),
('b57ced10-a96a-41f0-bf1a-ad06047b35db', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/accounts', NULL, NULL, 'عرض صفحة: /dashboard/accounts', NULL, '2a02:ce0:2803:7518:fd86:5795:61ea:b9ce, 3.120', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-22 03:36:40'),
('b5af521f-56cb-4385-8029-157bb9feaf2b', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '196.150.52.92, 18.199.100.155, 3.124.228.43', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', '2026-01-16 20:02:30'),
('bb0b64ab-8d23-4e6f-a2e6-962459e1837f', '8ef0a438-15e3-4d76-b120-c83c909b48e3', 'page_view', '/dashboard/accounts', NULL, NULL, 'عرض صفحة: /dashboard/accounts', NULL, '45.244.108.89, 3.70.234.189, 63.177.138.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-21 21:04:21'),
('bc409733-c525-494e-b2b0-cc2e53f4876e', '70b73b11-9e63-413d-a664-67e4c3d8d4d4', 'page_view', '/dashboard/bookings/convert/4bdaada8-a51a-4f36-bf57-b31a669f570c', NULL, NULL, 'عرض صفحة: /dashboard/bookings/convert/4bdaada8-a51a-4f36-bf57-b31a669f570c', NULL, '2a02:9b0:4047:6b4b:9c69:c4ee:77cd:cf3a, 3.72.', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-20 15:14:18'),
('bc4529b3-bd28-4348-b33d-058eaa2b021b', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'delete', '/dashboard/bookings', 'booking', 'e907b7ac-8a60-47cb-9192-179572d29459', 'حذف حجز: Reserved', '{\"booking_id\":\"e907b7ac-8a60-47cb-9192-179572d29459\"}', NULL, NULL, '2026-01-29 00:33:37'),
('c212880f-6f79-4004-b9e7-5106bd51b91a', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'update', '/dashboard/users', 'user_permissions', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'تحديث صلاحيات المستخدم: Mahfouz S', '{\"user_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"permissions_count\":8}', NULL, NULL, '2026-01-28 00:09:13'),
('c73b9c17-1dcb-473d-9217-7a4a3b4a5cfe', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '156.217.1.83, 18.199.143.253, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', '2026-01-24 08:13:32'),
('c828c5e5-4b49-4af8-9f30-f002f295b47f', '8ef0a438-15e3-4d76-b120-c83c909b48e3', 'page_view', '/dashboard/units/75fd42a6-6472-4a44-9af2-5f93d8f559ae', NULL, NULL, 'عرض صفحة: /dashboard/units/75fd42a6-6472-4a44-9af2-5f93d8f559ae', NULL, '197.162.131.112, 18.185.110.207, 52.29.234.15', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-17 02:15:43'),
('c9482d36-927b-44d3-a221-e9408ba90bd0', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.115.159, 35.158.197.224, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-17 06:04:51'),
('cdac3838-03bc-4b5c-90b7-f747fce32439', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'create', '/dashboard/bookings', 'booking', '4b6f235d-ef23-4dea-a1cd-a0c0a76cb364', 'إنشاء حجز جديد: ياسر محنشي', '{\"unit_id\":\"62bc1dc4-577b-4592-be5b-47d5c083cd9a\",\"guest_name\":\"ياسر محنشي\",\"checkin_date\":\"2026-01-23\",\"checkout_date\":\"2026-01-25\"}', NULL, NULL, '2026-01-23 10:44:00'),
('cdb64efb-f05e-4f8d-938e-b2ba44b5adf9', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '41.64.34.145, 3.70.223.237, 3.127.101.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-21 12:26:04'),
('cfa68ab0-bbfa-4aad-b5cd-cf0208b874ed', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '154.131.112.149, 52.58.242.222, 3.127.101.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '2026-01-21 12:40:10'),
('d0b8f24b-b162-4f03-947a-55729988ebd4', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'delete', '/dashboard/units', 'unit', ',47eed255-46fc-4bce-ad1f-64030b9cde0', 'حذف الوحدة: ', '{\"unit_name\":\"\",\"unit_id\":\",47eed255-46fc-4bce-ad1f-64030b9cde0\"}', NULL, NULL, '2026-01-28 15:32:50'),
('d5e44c0c-2f93-4b8d-8222-858382e148e4', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.206.64.79, 35.158.197.224, 63.176.8.12', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-17 06:08:06'),
('d608ae2c-b7a3-4bc3-91a2-abd4eb38db1f', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard/bookings/edit/ea1f364e-bf71-4207-bba6-54892610a37c', NULL, NULL, 'عرض صفحة: /dashboard/bookings/edit/ea1f364e-bf71-4207-bba6-54892610a37c', NULL, '197.120.125.9, 35.158.96.108, 63.181.186.142', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-22 12:23:02'),
('d672337d-89be-4917-997b-d5b7b7d05f30', '47eed255-46fc-4bce-ad1f-64030b9cde0c', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '196.150.52.92, 18.199.100.155, 3.124.228.43', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', '2026-01-16 19:58:04'),
('d9aab57d-83db-405c-95d0-2184cb07f96c', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.1.83, 18.199.143.253, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', '2026-01-24 08:36:11'),
('da7cb58e-ec1f-4494-a2cf-79c755f81ee5', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '41.236.115.171, 63.178.4.115, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-15 19:16:24'),
('de927a1f-960d-4ef7-83c5-e8ae4ca347b7', '8ef0a438-15e3-4d76-b120-c83c909b48e3', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '45.244.108.89, 3.70.234.189, 63.177.138.6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-21 21:04:10'),
('df65fb94-edf8-4c04-9e90-ba255ed1442f', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard/bookings/new', NULL, NULL, 'عرض صفحة: /dashboard/bookings/new', NULL, '154.238.131.255, 18.192.124.95, 63.178.57.248', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-23 10:39:11'),
('e1983664-5536-4fbc-9292-0445d2a2e27b', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '41.236.115.171, 63.178.4.115, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-15 19:26:07'),
('e3b8b64c-f1fc-43bb-9e9e-611e7ea5a9c5', '54ac9a1a-f434-446d-9e6e-8455ea761cb3', 'update', '/dashboard/users', 'user_permissions', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'تحديث صلاحيات المستخدم: Mahfouz S', '{\"user_id\":\"d7a5d5eb-6f44-46b6-b245-9088c2103250\",\"permissions_count\":8}', NULL, NULL, '2026-01-27 21:17:17'),
('e7980b78-5d93-4f45-ab3d-67e21284319c', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '41.236.115.171, 18.199.100.155, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-16 19:49:15'),
('e9ee70ce-c6f6-4226-ada4-c10ab8850d5a', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '196.153.8.181, 3.67.8.113, 3.127.101.13', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-21 20:46:03'),
('ee1bf98a-f09f-4933-b9c1-456a8f001c37', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard/bookings', NULL, NULL, 'عرض صفحة: /dashboard/bookings', NULL, '154.238.131.255, 18.192.124.95, 63.178.57.248', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-23 10:38:37'),
('ee978e54-b7f8-4649-82ef-074d6e4e3a13', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '41.236.115.171, 63.178.4.115, 3.121.55.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) rentals-dashboard/1.0.1 Chrome/142.0.7444.226 Electron/39.2.6 Safari/537.36', '2026-01-15 19:24:49'),
('ef176d49-0eb1-4674-9bce-3fb4a2361f27', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.81.221, 3.120.180.155, 63.178.178.160', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-18 05:36:11'),
('ef720184-3109-44a7-b407-f35448eb24a0', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '31.167.217.123, 18.199.82.55, 3.120.21.226', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1', '2026-01-25 09:04:02'),
('f363593f-4eae-4532-b079-2202b8df889f', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.1.83, 35.158.96.108, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', '2026-01-22 12:18:59'),
('f7ad936a-ca00-4289-a8d8-dd05aa7dd359', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard/unit-readiness', NULL, NULL, 'عرض صفحة: /dashboard/unit-readiness', NULL, '156.217.115.159, 3.72.2.121, 3.72.28.210', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-16 10:30:45'),
('f88dfeb9-5f65-43da-b092-c0131fb1e1f8', '91f79e63-5b01-457b-bcda-af4b305d9260', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '156.217.1.83, 63.178.150.129, 3.78.178.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-19 11:36:15'),
('fbe59eee-9aac-4443-9fe1-f8bd2b6c78a9', 'd2ca5150-e503-4d4f-9898-f97d36318567', 'page_view', '/dashboard', NULL, NULL, 'عرض صفحة: /dashboard', NULL, '217.55.128.92, 52.58.181.189, 3.127.101.13', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36', '2026-01-27 11:09:21'),
('fd50b5b1-afed-4f86-aeb1-4a8493a6b6ed', '8ef0a438-15e3-4d76-b120-c83c909b48e3', 'create', '/dashboard/bookings', 'booking', '055c457f-bec5-4dc2-89b0-d3c2dcb85105', 'إنشاء حجز جديد: سمر ابورادية', '{\"unit_id\":\"9fc6dda0-9c28-46c4-aed6-1e033fdba783\",\"guest_name\":\"سمر ابورادية\",\"checkin_date\":\"2026-01-23\",\"checkout_date\":\"2026-01-24\"}', NULL, NULL, '2026-01-22 04:50:29');

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

CREATE TABLE `user_permissions` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) NOT NULL,
  `page_path` varchar(255) NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_permissions`
--

INSERT INTO `user_permissions` (`id`, `user_id`, `page_path`, `can_view`, `can_edit`, `created_at`, `updated_at`) VALUES
('02afa83d-2e33-4650-be30-e533a0b60d62', '1eab8697-b979-4f6b-87f3-875eca97bc9e', '/dashboard/bookings', 1, 1, '2025-12-14 18:21:18', '2025-12-14 18:21:18'),
('0866285f-84a0-4b36-9286-e1413ec9d84d', '91f79e63-5b01-457b-bcda-af4b305d9260', '/dashboard/accounts', 0, 0, '2025-12-14 18:20:41', '2025-12-14 18:20:41'),
('0a103467-bcf5-4aab-993f-1a1327c17baa', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '/dashboard/units', 0, 0, '2026-01-28 00:09:13', '2026-01-28 00:09:13'),
('1202bd78-96ad-4307-ba97-70992f01c279', 'd2ca5150-e503-4d4f-9898-f97d36318567', '/dashboard/browser-accounts', 1, 0, '2026-01-20 22:21:04', '2026-01-20 22:21:04'),
('121f485f-ebf1-4b9b-9e60-e3e57f828ace', '91f79e63-5b01-457b-bcda-af4b305d9260', '/dashboard/units', 0, 0, '2025-12-14 18:20:41', '2025-12-14 18:20:41'),
('16f1c207-bea0-4f85-9a05-c7842f088600', '12ba01f1-431d-4743-bdac-f2d3656a6702', '/dashboard/maintenance', 1, 0, '2026-01-28 00:18:56', '2026-01-28 00:18:56'),
('18791d47-eccd-4030-b005-b30286181f91', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '/dashboard/activity-logs', 0, 0, '2026-01-20 22:20:55', '2026-01-20 22:20:55'),
('18eddb4b-6083-405c-870d-9397e536b312', '8ef0a438-15e3-4d76-b120-c83c909b48e3', '/dashboard/activity-logs', 0, 0, '2026-01-20 22:20:42', '2026-01-20 22:20:42'),
('1f585fb6-47de-4009-9d9a-427ce6dfb20e', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '/dashboard', 1, 1, '2026-01-20 22:20:55', '2026-01-20 22:20:55'),
('23d660b9-58db-434d-a1ae-9fd686e5359e', '12ba01f1-431d-4743-bdac-f2d3656a6702', '/dashboard/accounts', 1, 0, '2026-01-28 00:18:53', '2026-01-28 00:18:53'),
('278dc6ab-5aae-4db7-a1e2-3e5ce84cf59a', 'd2ca5150-e503-4d4f-9898-f97d36318567', '/dashboard/accounts', 0, 0, '2026-01-20 22:21:04', '2026-01-20 22:21:04'),
('2846ac69-3313-4530-b90a-1f42048a7018', '8ef0a438-15e3-4d76-b120-c83c909b48e3', '/dashboard/maintenance', 1, 1, '2026-01-20 22:20:42', '2026-01-20 22:20:42'),
('2cbad4a8-1215-4b91-aa28-7b915d0a04de', '8ef0a438-15e3-4d76-b120-c83c909b48e3', '/dashboard/unit-readiness', 1, 1, '2026-01-20 22:20:42', '2026-01-20 22:20:42'),
('37644ebe-f124-435d-a72d-fa17d97a7f29', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', '/dashboard/bookings', 1, 1, '2025-12-14 18:21:56', '2025-12-14 18:21:56'),
('395dbaf1-0421-46e0-a10f-213b465783ac', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '/dashboard/maintenance', 1, 1, '2026-01-28 00:09:13', '2026-01-28 00:09:13'),
('3c2d8efc-d079-45fd-9d5f-790d3d369784', '91f79e63-5b01-457b-bcda-af4b305d9260', '/dashboard/browser-accounts', 1, 1, '2025-12-14 18:20:41', '2025-12-14 18:20:41'),
('461cd4a1-869b-4d70-9e13-5a332ed6aa5e', 'd2ca5150-e503-4d4f-9898-f97d36318567', '/dashboard/maintenance', 1, 1, '2026-01-20 22:21:04', '2026-01-20 22:21:04'),
('48072e6e-1899-46c9-b16e-b8235d2f6201', 'd2ca5150-e503-4d4f-9898-f97d36318567', '/dashboard/unit-readiness', 1, 1, '2026-01-20 22:21:04', '2026-01-20 22:21:04'),
('4a859ca9-ef62-48a7-8891-fa799a80ab27', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '/dashboard/bookings', 0, 0, '2026-01-28 00:09:13', '2026-01-28 00:09:13'),
('4dad6406-efa1-42a1-b88a-0f57753bea74', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '/dashboard/browser-accounts', 1, 0, '2026-01-20 22:21:14', '2026-01-20 22:21:14'),
('533a29a3-b38f-4ffe-904d-34ba0260dfd7', '91f79e63-5b01-457b-bcda-af4b305d9260', '/dashboard/maintenance', 1, 1, '2025-12-14 18:20:41', '2025-12-14 18:20:41'),
('55058757-ad5e-43f8-80c1-ec218ccefdfd', '2a899add-5494-49e1-9854-a2efc72cf54f', '/dashboard/activity-logs', 0, 0, '2025-12-31 19:17:33', '2025-12-31 19:17:33'),
('572378ea-42c8-47c4-bdcd-078e575377b9', '2a899add-5494-49e1-9854-a2efc72cf54f', '/dashboard/maintenance', 1, 0, '2025-12-31 19:17:33', '2025-12-31 19:17:33'),
('5820a05c-5d54-4d77-99ae-76ef7746e6a2', '2a899add-5494-49e1-9854-a2efc72cf54f', '/dashboard', 1, 0, '2025-12-31 19:17:33', '2025-12-31 19:17:33'),
('5a51681d-fd0a-4786-a675-e5b8ade93343', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '/dashboard/activity-logs', 0, 0, '2026-01-20 22:21:14', '2026-01-20 22:21:14'),
('5b30c404-f535-4f10-9da2-a79e5d589206', '548bb74c-658f-4243-a35b-d343549ff5a1', '/dashboard/accounts', 1, 0, '2025-12-14 12:43:22', '2025-12-14 12:43:22'),
('5d3b089c-0c63-449c-927f-2bdca657526e', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', '/dashboard/accounts', 1, 0, '2025-12-14 18:21:56', '2025-12-14 18:21:56'),
('5e8d4f21-2419-4bd6-9e1e-152ce4acf37e', '548bb74c-658f-4243-a35b-d343549ff5a1', '/dashboard/unit-readiness', 1, 1, '2025-12-14 12:43:22', '2025-12-14 12:43:22'),
('62565f46-6b3f-458f-82f9-da3d68ff16d6', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '/dashboard/maintenance', 1, 1, '2026-01-20 22:21:14', '2026-01-20 22:21:14'),
('66ce7529-2586-4e2b-91aa-15930d01e35c', '2a899add-5494-49e1-9854-a2efc72cf54f', '/dashboard/accounts', 0, 0, '2025-12-31 19:17:33', '2025-12-31 19:17:33'),
('67ee8afc-8b1a-4a71-9e9f-97100bfcbeb4', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '/dashboard', 1, 1, '2026-01-20 22:21:14', '2026-01-20 22:21:14'),
('6948d096-e919-4125-89fd-8a3c2d320f3d', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '/dashboard/browser-accounts', 1, 0, '2026-01-20 22:20:55', '2026-01-20 22:20:55'),
('69720b4d-2d2b-4a05-9c55-5b811b74358f', '8ef0a438-15e3-4d76-b120-c83c909b48e3', '/dashboard/browser-accounts', 1, 0, '2026-01-20 22:20:42', '2026-01-20 22:20:42'),
('698e59dd-22c8-4174-9712-09de50d563e1', '548bb74c-658f-4243-a35b-d343549ff5a1', '/dashboard/units', 1, 1, '2025-12-14 12:43:22', '2025-12-14 12:43:22'),
('69f9451f-92c1-4d22-8c69-086bcafb0a85', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '/dashboard/unit-readiness', 1, 1, '2026-01-28 00:09:13', '2026-01-28 00:09:13'),
('71372d32-6e25-4290-a45f-648c9fe571c9', '12ba01f1-431d-4743-bdac-f2d3656a6702', '/dashboard/activity-logs', 1, 0, '2026-01-28 00:18:49', '2026-01-28 00:18:49'),
('72a3086e-a3fc-470d-bf40-9a3666fe2013', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '/dashboard/units', 0, 0, '2026-01-20 22:21:14', '2026-01-20 22:21:14'),
('7352ff44-59c6-4de8-bf75-f4abd4cb6db4', '2a899add-5494-49e1-9854-a2efc72cf54f', '/dashboard/unit-readiness', 1, 0, '2025-12-31 19:17:33', '2025-12-31 19:17:33'),
('7462dd9b-aa2d-4773-862f-5d1b983dbc72', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '/dashboard/bookings', 1, 1, '2026-01-20 22:21:14', '2026-01-20 22:21:14'),
('77f6e4ba-97b0-45b6-9f4c-04382a0614e8', '12ba01f1-431d-4743-bdac-f2d3656a6702', '/dashboard', 1, 0, '2026-01-28 00:18:59', '2026-01-28 00:18:59'),
('789d5a2f-b9ca-435d-a892-0ad95376e329', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', '/dashboard/activity-logs', 1, 0, '2025-12-14 18:21:56', '2025-12-14 18:21:56'),
('7a27c0fb-4336-4bcc-b4b2-ffb44a3943f0', '8ef0a438-15e3-4d76-b120-c83c909b48e3', '/dashboard', 1, 1, '2026-01-20 22:20:42', '2026-01-20 22:20:42'),
('82050f21-bffa-4755-8f8b-f5f2facabc50', 'd2ca5150-e503-4d4f-9898-f97d36318567', '/dashboard', 1, 1, '2026-01-20 22:21:04', '2026-01-20 22:21:04'),
('8244acf1-1bf4-45d6-9b33-20ac954fad92', '8ef0a438-15e3-4d76-b120-c83c909b48e3', '/dashboard/units', 0, 0, '2026-01-20 22:20:42', '2026-01-20 22:20:42'),
('8683d21d-5349-465b-aae2-bfe60598fcfa', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '/dashboard/unit-readiness', 1, 1, '2026-01-20 22:21:14', '2026-01-20 22:21:14'),
('8caaf29b-9d5a-4970-b95e-92e87746ad55', '8ef0a438-15e3-4d76-b120-c83c909b48e3', '/dashboard/bookings', 1, 1, '2026-01-20 22:20:42', '2026-01-20 22:20:42'),
('8eade8a9-ea7e-4470-9588-b61e575236db', '8ef0a438-15e3-4d76-b120-c83c909b48e3', '/dashboard/accounts', 0, 0, '2026-01-20 22:20:42', '2026-01-20 22:20:42'),
('9094373b-3cae-4aa2-81b7-59f6797cd47f', '12ba01f1-431d-4743-bdac-f2d3656a6702', '/dashboard/unit-readiness', 1, 0, '2026-01-28 00:18:51', '2026-01-28 00:18:51'),
('959335ce-6e15-4a25-a56e-84cb9dc39a12', '548bb74c-658f-4243-a35b-d343549ff5a1', '/dashboard/browser-accounts', 1, 1, '2025-12-14 12:43:22', '2025-12-14 12:43:22'),
('9b43b887-4a46-4834-af4d-5c5ca9f4973f', '548bb74c-658f-4243-a35b-d343549ff5a1', '/dashboard/maintenance', 1, 1, '2025-12-14 12:43:22', '2025-12-14 12:43:22'),
('9ea9c505-d4fb-4c1a-b457-665f88ca984a', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '/dashboard/activity-logs', 0, 0, '2026-01-28 00:09:13', '2026-01-28 00:09:13'),
('a01e9fe4-1537-41d2-b04f-fb84bef890d2', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '/dashboard', 0, 0, '2026-01-28 00:09:13', '2026-01-28 00:09:13'),
('a38bfcae-5aa4-4042-aff6-f526be14b625', '2a899add-5494-49e1-9854-a2efc72cf54f', '/dashboard/browser-accounts', 1, 0, '2025-12-31 19:17:33', '2025-12-31 19:17:33'),
('a55b7328-8947-4a22-afa7-ef90239882ea', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '/dashboard/maintenance', 1, 1, '2026-01-20 22:20:55', '2026-01-20 22:20:55'),
('a5811ab3-d7ca-433c-95f9-0e9d8e0aca98', 'd2ca5150-e503-4d4f-9898-f97d36318567', '/dashboard/units', 0, 0, '2026-01-20 22:21:04', '2026-01-20 22:21:04'),
('a68a9c39-c03a-42b0-8c75-8ef08379a56b', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', '/dashboard/maintenance', 1, 1, '2025-12-14 18:21:56', '2025-12-14 18:21:56'),
('a85e7df2-be5a-49e4-b183-51681b815ef1', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '/dashboard/accounts', 0, 0, '2026-01-20 22:20:55', '2026-01-20 22:20:55'),
('a92ea3c5-932d-4068-a8ad-62d91051eb6d', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', '/dashboard/units', 1, 0, '2025-12-14 18:21:56', '2025-12-14 18:21:56'),
('a9346619-07e0-4317-870b-fbd1f33ed8c7', 'd2ca5150-e503-4d4f-9898-f97d36318567', '/dashboard/activity-logs', 0, 0, '2026-01-20 22:21:04', '2026-01-20 22:21:04'),
('adb80387-f3d0-460e-9686-079d2abb06da', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', '/dashboard/unit-readiness', 1, 1, '2025-12-14 18:21:56', '2025-12-14 18:21:56'),
('b5af6269-e542-494a-8ed2-14a57bfca84f', '548bb74c-658f-4243-a35b-d343549ff5a1', '/dashboard/bookings', 1, 1, '2025-12-14 12:43:22', '2025-12-14 12:43:22'),
('b68317c6-e78c-489e-9d39-4e3ab01a666a', '1eab8697-b979-4f6b-87f3-875eca97bc9e', '/dashboard/accounts', 1, 0, '2025-12-14 18:21:18', '2025-12-14 18:21:18'),
('b798ceda-a68a-4a78-b8c5-014755e37ac6', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '/dashboard/accounts', 0, 0, '2026-01-28 00:09:13', '2026-01-28 00:09:13'),
('baefc8a3-d0dc-45d9-a088-4b054c34178b', '91f79e63-5b01-457b-bcda-af4b305d9260', '/dashboard', 1, 1, '2025-12-14 18:20:41', '2025-12-14 18:20:41'),
('c156a8dc-877a-4005-bee2-d512ac29e544', '91f79e63-5b01-457b-bcda-af4b305d9260', '/dashboard/bookings', 1, 0, '2025-12-14 18:20:41', '2025-12-14 18:20:41'),
('c2eafbc9-1f10-495a-9e71-d6e38e01c6f0', '91f79e63-5b01-457b-bcda-af4b305d9260', '/dashboard/unit-readiness', 1, 1, '2025-12-14 18:20:41', '2025-12-14 18:20:41'),
('c522ff5d-2c43-4484-8d59-675615e21678', 'd2ca5150-e503-4d4f-9898-f97d36318567', '/dashboard/bookings', 1, 1, '2026-01-20 22:21:04', '2026-01-20 22:21:04'),
('c6005117-6001-4f84-98a9-1f3e056b0505', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '/dashboard/unit-readiness', 1, 1, '2026-01-20 22:20:55', '2026-01-20 22:20:55'),
('c8c5fd26-6973-4d0d-a08c-6c66a6af3ea8', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', '/dashboard', 1, 1, '2025-12-14 18:21:56', '2025-12-14 18:21:56'),
('ca873e34-83c8-4878-9e98-d3d82de7675f', '2a899add-5494-49e1-9854-a2efc72cf54f', '/dashboard/units', 0, 0, '2025-12-31 19:17:33', '2025-12-31 19:17:33'),
('cb9dd809-08c0-4a27-90bc-714ad83040f6', 'd7a5d5eb-6f44-46b6-b245-9088c2103250', '/dashboard/browser-accounts', 0, 0, '2026-01-28 00:09:13', '2026-01-28 00:09:13'),
('d37becf7-10b4-4926-b03e-dd767ccb2068', 'a981a22c-e66d-4d0f-9ac3-39c059d243f4', '/dashboard/browser-accounts', 1, 1, '2025-12-14 18:21:56', '2025-12-14 18:21:56'),
('d8203eef-fbe1-47f8-8da0-a995caede07f', '1eab8697-b979-4f6b-87f3-875eca97bc9e', '/dashboard/activity-logs', 0, 0, '2025-12-14 18:21:18', '2025-12-14 18:21:18'),
('d88ec02a-aaeb-441b-86c0-8a77fa19b1ce', '1eab8697-b979-4f6b-87f3-875eca97bc9e', '/dashboard/maintenance', 1, 1, '2025-12-14 18:21:18', '2025-12-14 18:21:18'),
('dc72ec03-1e3e-44ff-b550-87a42e64e27a', '2a899add-5494-49e1-9854-a2efc72cf54f', '/dashboard/bookings', 1, 0, '2025-12-31 19:17:33', '2025-12-31 19:17:33'),
('dd9495e5-f487-4be4-9fb3-a03409a3d05c', '91f79e63-5b01-457b-bcda-af4b305d9260', '/dashboard/activity-logs', 0, 0, '2025-12-14 18:20:41', '2025-12-14 18:20:41'),
('e19938ce-068a-4559-aa2f-41190052a208', '1eab8697-b979-4f6b-87f3-875eca97bc9e', '/dashboard/browser-accounts', 1, 1, '2025-12-14 18:21:18', '2025-12-14 18:21:18'),
('e968bc29-987d-4244-94df-0360f5aa9789', '12ba01f1-431d-4743-bdac-f2d3656a6702', '/dashboard/units', 1, 0, '2026-01-28 00:18:57', '2026-01-28 00:18:57'),
('ecac0a40-3186-47fd-863d-dcf66151fabd', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '/dashboard/units', 0, 0, '2026-01-20 22:20:55', '2026-01-20 22:20:55'),
('f14d1cc5-d387-42ee-8a0d-bf64c465b9fe', 'fbcb20e9-913a-4cb2-b888-6eddd395c12b', '/dashboard/accounts', 0, 0, '2026-01-20 22:21:14', '2026-01-20 22:21:14'),
('f4d5d55c-ccef-408c-9133-0d10abca0755', '1eab8697-b979-4f6b-87f3-875eca97bc9e', '/dashboard', 1, 1, '2025-12-14 18:21:18', '2025-12-14 18:21:18'),
('f73266ff-aac3-4aea-8f75-59a7607e241e', '548bb74c-658f-4243-a35b-d343549ff5a1', '/dashboard', 1, 1, '2025-12-14 12:43:22', '2025-12-14 12:43:22'),
('f7af62a2-e423-48e5-a2cf-ff798a6f96df', '12ba01f1-431d-4743-bdac-f2d3656a6702', '/dashboard/bookings', 1, 0, '2026-01-28 00:18:54', '2026-01-28 00:18:54'),
('f7f6da1d-176a-412f-a9bb-44836cdc6cdf', '47eed255-46fc-4bce-ad1f-64030b9cde0c', '/dashboard/bookings', 1, 1, '2026-01-20 22:20:55', '2026-01-20 22:20:55'),
('fb171dd2-834e-4503-8c4f-225b795a0289', '1eab8697-b979-4f6b-87f3-875eca97bc9e', '/dashboard/units', 1, 0, '2025-12-14 18:21:18', '2025-12-14 18:21:18'),
('feef7f60-44ca-47f1-97ce-3ac1b17d6746', '1eab8697-b979-4f6b-87f3-875eca97bc9e', '/dashboard/unit-readiness', 1, 1, '2025-12-14 18:21:18', '2025-12-14 18:21:18'),
('ffed5a3f-9a1b-4c56-ba3c-8f9c5fe88abf', '548bb74c-658f-4243-a35b-d343549ff5a1', '/dashboard/activity-logs', 0, 0, '2025-12-14 12:43:22', '2025-12-14 12:43:22');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounting_accounts`
--
ALTER TABLE `accounting_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `accounting_audit_logs`
--
ALTER TABLE `accounting_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_audit_created` (`created_at`);

--
-- Indexes for table `accounting_cost_centers`
--
ALTER TABLE `accounting_cost_centers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `accounting_journals`
--
ALTER TABLE `accounting_journals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `default_account_id` (`default_account_id`);

--
-- Indexes for table `accounting_moves`
--
ALTER TABLE `accounting_moves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `journal_id` (`journal_id`),
  ADD KEY `partner_id` (`partner_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_moves_date` (`date`),
  ADD KEY `idx_moves_state` (`state`);

--
-- Indexes for table `accounting_move_lines`
--
ALTER TABLE `accounting_move_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_move_lines_account` (`account_id`),
  ADD KEY `idx_move_lines_partner` (`partner_id`),
  ADD KEY `idx_move_lines_move` (`move_id`),
  ADD KEY `idx_move_lines_cost_center` (`cost_center_id`);

--
-- Indexes for table `accounting_partners`
--
ALTER TABLE `accounting_partners`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_logs_user_id` (`user_id`),
  ADD KEY `idx_activity_logs_action` (`action`),
  ADD KEY `idx_activity_logs_created_at` (`created_at`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_unit_id` (`unit_id`),
  ADD KEY `idx_bookings_dates` (`checkin_date`,`checkout_date`),
  ADD KEY `platform_account_id` (`platform_account_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `browser_accounts`
--
ALTER TABLE `browser_accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `browser_notifications`
--
ALTER TABLE `browser_notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `crm_activities`
--
ALTER TABLE `crm_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `performed_by` (`performed_by`),
  ADD KEY `idx_crm_activities_deal` (`deal_id`),
  ADD KEY `idx_crm_activities_customer` (`customer_id`);

--
-- Indexes for table `crm_automation_rules`
--
ALTER TABLE `crm_automation_rules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `crm_customer_tags`
--
ALTER TABLE `crm_customer_tags`
  ADD PRIMARY KEY (`customer_id`,`tag_id`),
  ADD KEY `tag_id` (`tag_id`),
  ADD KEY `idx_customer_tags_customer` (`customer_id`);

--
-- Indexes for table `crm_custom_stages`
--
ALTER TABLE `crm_custom_stages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `stage_key` (`stage_key`),
  ADD KEY `idx_custom_stages_order` (`stage_order`);

--
-- Indexes for table `crm_deals`
--
ALTER TABLE `crm_deals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assigned_to` (`assigned_to`),
  ADD KEY `idx_crm_deals_stage` (`stage`),
  ADD KEY `idx_crm_deals_customer` (`customer_id`),
  ADD KEY `idx_crm_deals_status` (`status`);

--
-- Indexes for table `crm_notifications`
--
ALTER TABLE `crm_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`,`is_read`);

--
-- Indexes for table `crm_tags`
--
ALTER TABLE `crm_tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD KEY `idx_customers_phone` (`phone`);

--
-- Indexes for table `hr_announcements`
--
ALTER TABLE `hr_announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_announcements_active` (`is_active`,`published_at`);

--
-- Indexes for table `hr_attendance`
--
ALTER TABLE `hr_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_attendance` (`employee_id`,`date`),
  ADD KEY `idx_attendance_date` (`date`),
  ADD KEY `idx_attendance_employee` (`employee_id`);

--
-- Indexes for table `hr_employees`
--
ALTER TABLE `hr_employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_number` (`employee_number`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_employees_status` (`status`);

--
-- Indexes for table `hr_payroll_details`
--
ALTER TABLE `hr_payroll_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payroll_run_id` (`payroll_run_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `hr_payroll_runs`
--
ALTER TABLE `hr_payroll_runs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_period` (`period_month`,`period_year`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `accounting_move_id` (`accounting_move_id`);

--
-- Indexes for table `hr_requests`
--
ALTER TABLE `hr_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_requests_status` (`status`),
  ADD KEY `idx_requests_employee` (`employee_id`);

--
-- Indexes for table `hr_settings`
--
ALTER TABLE `hr_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `hr_shifts`
--
ALTER TABLE `hr_shifts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `maintenance_tickets`
--
ALTER TABLE `maintenance_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_maintenance_unit_id` (`unit_id`),
  ADD KEY `idx_maintenance_status` (`status`),
  ADD KEY `idx_maintenance_priority` (`priority`),
  ADD KEY `idx_maintenance_created_by` (`created_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_unit_id` (`unit_id`),
  ADD KEY `idx_notifications_type` (`type`),
  ADD KEY `idx_notifications_created_at` (`created_at`),
  ADD KEY `idx_notifications_is_read` (`is_read`),
  ADD KEY `idx_notifications_recipient` (`recipient_user_id`),
  ADD KEY `maintenance_ticket_id` (`maintenance_ticket_id`);

--
-- Indexes for table `platform_accounts`
--
ALTER TABLE `platform_accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_platform_accounts_platform` (`platform`),
  ADD KEY `idx_platform_accounts_created_by` (`created_by`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_reservation` (`unit_id`,`platform`,`start_date`,`end_date`),
  ADD KEY `idx_reservations_unit_id` (`unit_id`),
  ADD KEY `idx_reservations_platform` (`platform`),
  ADD KEY `idx_reservations_dates` (`start_date`,`end_date`),
  ADD KEY `idx_reservations_start_date` (`start_date`),
  ADD KEY `idx_reservations_platform_account_id` (`platform_account_id`);

--
-- Indexes for table `role_system_permissions`
--
ALTER TABLE `role_system_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_role_system` (`role`,`system_id`);

--
-- Indexes for table `sync_logs`
--
ALTER TABLE `sync_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sync_logs_run_at` (`run_at`),
  ADD KEY `idx_sync_logs_status` (`status`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_units_platform_account_id` (`platform_account_id`),
  ADD KEY `idx_units_city` (`city`),
  ADD KEY `idx_units_status` (`status`);

--
-- Indexes for table `unit_calendars`
--
ALTER TABLE `unit_calendars`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_unit_platform` (`unit_id`,`platform`),
  ADD KEY `platform_account_id` (`platform_account_id`);

--
-- Indexes for table `unit_platforms`
--
ALTER TABLE `unit_platforms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_unit_platforms_unit_platform` (`unit_id`,`platform`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_is_active` (`is_active`);

--
-- Indexes for table `user_activity_logs`
--
ALTER TABLE `user_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_activity_logs_user_id` (`user_id`),
  ADD KEY `idx_user_activity_logs_created_at` (`created_at`);

--
-- Indexes for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_page` (`user_id`,`page_path`),
  ADD KEY `idx_user_permissions_user_id` (`user_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounting_audit_logs`
--
ALTER TABLE `accounting_audit_logs`
  ADD CONSTRAINT `accounting_audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `accounting_journals`
--
ALTER TABLE `accounting_journals`
  ADD CONSTRAINT `accounting_journals_ibfk_1` FOREIGN KEY (`default_account_id`) REFERENCES `accounting_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `accounting_moves`
--
ALTER TABLE `accounting_moves`
  ADD CONSTRAINT `accounting_moves_ibfk_1` FOREIGN KEY (`journal_id`) REFERENCES `accounting_journals` (`id`),
  ADD CONSTRAINT `accounting_moves_ibfk_2` FOREIGN KEY (`partner_id`) REFERENCES `accounting_partners` (`id`),
  ADD CONSTRAINT `accounting_moves_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `accounting_move_lines`
--
ALTER TABLE `accounting_move_lines`
  ADD CONSTRAINT `accounting_move_lines_ibfk_1` FOREIGN KEY (`move_id`) REFERENCES `accounting_moves` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `accounting_move_lines_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounting_accounts` (`id`),
  ADD CONSTRAINT `accounting_move_lines_ibfk_3` FOREIGN KEY (`partner_id`) REFERENCES `accounting_partners` (`id`);

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `crm_activities`
--
ALTER TABLE `crm_activities`
  ADD CONSTRAINT `crm_activities_ibfk_1` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `crm_activities_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `crm_activities_ibfk_3` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `crm_customer_tags`
--
ALTER TABLE `crm_customer_tags`
  ADD CONSTRAINT `crm_customer_tags_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `crm_customer_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `crm_tags` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `crm_deals`
--
ALTER TABLE `crm_deals`
  ADD CONSTRAINT `crm_deals_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `crm_deals_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `crm_notifications`
--
ALTER TABLE `crm_notifications`
  ADD CONSTRAINT `crm_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `hr_announcements`
--
ALTER TABLE `hr_announcements`
  ADD CONSTRAINT `hr_announcements_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `hr_attendance`
--
ALTER TABLE `hr_attendance`
  ADD CONSTRAINT `hr_attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `hr_employees`
--
ALTER TABLE `hr_employees`
  ADD CONSTRAINT `hr_employees_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `hr_payroll_details`
--
ALTER TABLE `hr_payroll_details`
  ADD CONSTRAINT `hr_payroll_details_ibfk_1` FOREIGN KEY (`payroll_run_id`) REFERENCES `hr_payroll_runs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `hr_payroll_details_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `hr_payroll_runs`
--
ALTER TABLE `hr_payroll_runs`
  ADD CONSTRAINT `hr_payroll_runs_ibfk_1` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `hr_payroll_runs_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `hr_payroll_runs_ibfk_3` FOREIGN KEY (`accounting_move_id`) REFERENCES `accounting_moves` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `hr_requests`
--
ALTER TABLE `hr_requests`
  ADD CONSTRAINT `hr_requests_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `hr_requests_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `maintenance_tickets`
--
ALTER TABLE `maintenance_tickets`
  ADD CONSTRAINT `maintenance_tickets_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `maintenance_tickets_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`maintenance_ticket_id`) REFERENCES `maintenance_tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `platform_accounts`
--
ALTER TABLE `platform_accounts`
  ADD CONSTRAINT `platform_accounts_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `units`
--
ALTER TABLE `units`
  ADD CONSTRAINT `units_ibfk_1` FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `unit_calendars`
--
ALTER TABLE `unit_calendars`
  ADD CONSTRAINT `unit_calendars_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `unit_calendars_ibfk_2` FOREIGN KEY (`platform_account_id`) REFERENCES `platform_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `unit_platforms`
--
ALTER TABLE `unit_platforms`
  ADD CONSTRAINT `unit_platforms_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_activity_logs`
--
ALTER TABLE `user_activity_logs`
  ADD CONSTRAINT `user_activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
