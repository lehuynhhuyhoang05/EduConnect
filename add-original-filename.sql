-- Add originalFileName column to submissions table
ALTER TABLE submissions 
ADD COLUMN original_file_name VARCHAR(255) NULL AFTER file_url;
