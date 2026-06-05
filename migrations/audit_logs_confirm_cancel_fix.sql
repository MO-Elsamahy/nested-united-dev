-- ============================================================
-- Migration: audit_logs_confirm_cancel_fix
-- Date: 2026-06-05
-- ============================================================
-- ملخص التغييرات:
-- 1. تعديل عمود action في جدول accounting_audit_logs لدعم قيم 'confirm' و 'cancel'
-- ============================================================

ALTER TABLE accounting_audit_logs 
    MODIFY COLUMN action ENUM('create', 'update', 'delete', 'restore', 'cancel', 'confirm') NOT NULL;
