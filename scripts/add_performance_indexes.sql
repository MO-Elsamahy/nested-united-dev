-- ============================================================
-- Migration: Add performance indexes on frequently queried columns
-- Date: 2026-02-22
-- Safe to run multiple times (uses IF NOT EXISTS via CREATE INDEX)
-- ============================================================

-- hr_attendance: queried heavily by employee_id + date in payroll & dashboard
ALTER TABLE `hr_attendance`
  ADD INDEX IF NOT EXISTS `idx_attendance_emp_date` (`employee_id`, `date`),
  ADD INDEX IF NOT EXISTS `idx_attendance_date`     (`date`);

-- hr_payroll_details: queried by payroll_run_id when loading a payroll run
ALTER TABLE `hr_payroll_details`
  ADD INDEX IF NOT EXISTS `idx_payroll_detail_run` (`payroll_run_id`);

-- crm_activities: queried by customer_id in the timeline view and by deal_id
ALTER TABLE `crm_activities`
  ADD INDEX IF NOT EXISTS `idx_crm_act_customer` (`customer_id`),
  ADD INDEX IF NOT EXISTS `idx_crm_act_deal`     (`deal_id`);

-- crm_deals: queried by status + stage in the Kanban board
ALTER TABLE `crm_deals`
  ADD INDEX IF NOT EXISTS `idx_crm_deals_status_stage` (`status`, `stage`);
