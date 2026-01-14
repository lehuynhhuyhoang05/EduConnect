/**
 * DATABASE OPTIMIZATION QUERIES
 * ============================
 * Run these queries to improve database performance
 * 
 * Execute Order:
 * 1. Run indexes first
 * 2. Analyze tables
 * 3. Monitor query performance
 */

-- ====================
-- MISSING INDEXES
-- ====================

-- Live Sessions Performance
CREATE INDEX IF NOT EXISTS idx_live_sessions_class ON live_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host ON live_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON live_sessions(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_live_sessions_room ON live_sessions(room_id);

-- Live Session Participants
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON live_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON live_session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_joined ON live_session_participants(joined_at);

-- Connection Quality
CREATE INDEX IF NOT EXISTS idx_connection_quality_session ON connection_quality(session_id);
CREATE INDEX IF NOT EXISTS idx_connection_quality_user ON connection_quality(user_id);

-- Announcements
CREATE INDEX IF NOT EXISTS idx_announcements_class ON announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_date ON announcements(created_at);

-- Messages (Chat)
CREATE INDEX IF NOT EXISTS idx_messages_class ON messages(class_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Materials
CREATE INDEX IF NOT EXISTS idx_materials_class ON materials(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);

-- Composite Indexes for Common Queries
CREATE INDEX IF NOT EXISTS idx_class_members_class_user ON class_members(class_id, user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_deadline ON assignments(class_id, deadline);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student_status ON submissions(assignment_id, student_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_class_created ON messages(class_id, created_at);

-- ====================
-- FULLTEXT SEARCH INDEXES
-- ====================

-- Enable fulltext search on classes
ALTER TABLE classes ADD FULLTEXT INDEX idx_classes_fulltext (name, description);

-- Enable fulltext search on assignments
ALTER TABLE assignments ADD FULLTEXT INDEX idx_assignments_fulltext (title, description);

-- Enable fulltext search on materials
ALTER TABLE materials ADD FULLTEXT INDEX idx_materials_fulltext (title, description);

-- ====================
-- TABLE OPTIMIZATION
-- ====================

-- Analyze tables to update statistics
ANALYZE TABLE users;
ANALYZE TABLE classes;
ANALYZE TABLE class_members;
ANALYZE TABLE assignments;
ANALYZE TABLE submissions;
ANALYZE TABLE live_sessions;
ANALYZE TABLE live_session_participants;
ANALYZE TABLE messages;
ANALYZE TABLE notifications;
ANALYZE TABLE announcements;
ANALYZE TABLE materials;

-- ====================
-- QUERY PERFORMANCE MONITORING
-- ====================

-- Enable slow query log
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 2; -- Log queries taking more than 2 seconds

-- Check table sizes
SELECT 
  TABLE_NAME,
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Size (MB)',
  TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'educonnect_db'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- Check index usage
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  CARDINALITY,
  INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'educonnect_db'
ORDER BY TABLE_NAME, INDEX_NAME;

-- ====================
-- MAINTENANCE QUERIES
-- ====================

-- Optimize all tables (run weekly)
OPTIMIZE TABLE users;
OPTIMIZE TABLE classes;
OPTIMIZE TABLE class_members;
OPTIMIZE TABLE assignments;
OPTIMIZE TABLE submissions;
OPTIMIZE TABLE live_sessions;
OPTIMIZE TABLE live_session_participants;
OPTIMIZE TABLE messages;
OPTIMIZE TABLE notifications;

-- ====================
-- PERFORMANCE TIPS
-- ====================

/*
1. Monitor Slow Queries:
   - Check /var/log/mysql/slow-query.log
   - Use EXPLAIN on slow queries
   
2. Connection Pooling:
   - TypeORM default: 10 connections
   - Increase for production: 50-100
   
3. Query Optimization:
   - Always use indexes on WHERE/JOIN columns
   - Avoid SELECT * - specify columns
   - Use LIMIT for pagination
   - Use prepared statements (TypeORM does this)
   
4. Caching Strategy:
   - Cache frequently accessed data (user sessions, class lists)
   - Invalidate cache on updates
   - Use Redis for distributed caching
   
5. Read Replicas:
   - Setup master-slave replication
   - Route read queries to slaves
   - Write queries to master only
*/
