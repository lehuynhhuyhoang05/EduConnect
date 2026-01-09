-- =====================================================
-- Migration: Add original_file_name to submissions
-- Date: 2026-01-09
-- Description: Store original filename for file downloads
-- =====================================================

USE lms_db;

-- Add column if not exists (MySQL 5.7+)
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255) NULL 
COMMENT 'Original filename before upload' 
AFTER file_url;

-- Verify the change
DESCRIBE submissions;

SELECT 'Migration completed successfully!' AS status;
