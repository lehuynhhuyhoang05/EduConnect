-- ============================================================
-- SEED DATA - Online Learning Platform LMS
-- File: seed-data.sql
-- Purpose: Demo data for production-ready system
-- ============================================================

-- Tắt foreign key checks để có thể insert dữ liệu
SET FOREIGN_KEY_CHECKS = 0;

-- Xóa dữ liệu cũ (nếu có)
TRUNCATE TABLE whiteboard_strokes;
TRUNCATE TABLE whiteboard_sessions;
TRUNCATE TABLE submissions;
TRUNCATE TABLE notifications;
TRUNCATE TABLE chat_messages;
TRUNCATE TABLE live_sessions_participants;
TRUNCATE TABLE live_sessions;
TRUNCATE TABLE files;
TRUNCATE TABLE materials;
TRUNCATE TABLE assignments;
TRUNCATE TABLE class_members;
TRUNCATE TABLE classes;
TRUNCATE TABLE refresh_tokens;
TRUNCATE TABLE users;

-- Bật lại foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- USERS - Giảng viên và Học viên
-- Password mặc định: 123456 (hash: $2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi)
-- ============================================================

INSERT INTO `users` (`id`, `email`, `role`, `is_active`, `password_hash`, `avatar_url`, `is_verified`, `full_name`, `created_at`, `updated_at`) VALUES
-- Giảng viên
(1, 'nguyenvana@edu.vn', 'TEACHER', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'TS. Nguyễn Văn An', NOW(), NOW()),
(2, 'tranvanb@edu.vn', 'TEACHER', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'ThS. Trần Văn Bình', NOW(), NOW()),
(3, 'lethic@edu.vn', 'TEACHER', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'PGS.TS. Lê Thị Cúc', NOW(), NOW()),
(4, 'phamvand@edu.vn', 'TEACHER', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'ThS. Phạm Văn Dũng', NOW(), NOW()),

-- Học viên - Khóa K65
(10, 'hoangminhe@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Hoàng Minh Em', NOW(), NOW()),
(11, 'nguyenthif@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Nguyễn Thị Fang', NOW(), NOW()),
(12, 'tranvang@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Trần Văn Giáp', NOW(), NOW()),
(13, 'levanhung@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Lê Văn Hùng', NOW(), NOW()),
(14, 'phamthii@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Phạm Thị Inh', NOW(), NOW()),
(15, 'buivanj@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Bùi Văn Kiên', NOW(), NOW()),

-- Học viên - Khóa K66
(20, 'nguyenvanlam@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Nguyễn Văn Lâm', NOW(), NOW()),
(21, 'tranthimai@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Trần Thị Mai', NOW(), NOW()),
(22, 'levannam@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Lê Văn Nam', NOW(), NOW()),
(23, 'phamvanoanh@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Phạm Văn Oanh', NOW(), NOW()),
(24, 'buithiphuong@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Bùi Thị Phương', NOW(), NOW()),
(25, 'dovanquan@student.edu.vn', 'STUDENT', 1, '$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi', NULL, 1, 'Đỗ Văn Quân', NOW(), NOW());

-- ============================================================
-- CLASSES - Lớp học
-- Sử dụng member_count thay vì student_count
-- ============================================================

INSERT INTO `classes` (`id`, `name`, `description`, `subject`, `teacher_id`, `class_code`, `is_active`, `member_count`, `created_at`, `updated_at`) VALUES
-- Lớp của GV Nguyễn Văn An
(1, 'Lập Trình Mạng - K65', 'Môn học về lập trình ứng dụng mạng, socket programming, TCP/UDP, HTTP protocols', 'Lập Trình Mạng', 1, 'LTM65A', 1, 7, NOW(), NOW()),
(2, 'An Toàn Thông Tin - K65', 'Học về bảo mật hệ thống, mã hóa, xác thực và các kỹ thuật tấn công phòng thủ', 'An Toàn Thông Tin', 1, 'ATTT65', 1, 5, NOW(), NOW()),

-- Lớp của GV Trần Văn Bình
(3, 'Cơ Sở Dữ Liệu - K65', 'Thiết kế và quản trị cơ sở dữ liệu quan hệ, SQL, normalization, indexing', 'Cơ Sở Dữ Liệu', 2, 'CSDL65', 1, 7, NOW(), NOW()),
(4, 'Phát Triển Web - K66', 'Xây dựng ứng dụng web với HTML, CSS, JavaScript, React và Node.js', 'Phát Triển Web', 2, 'WEB66A', 1, 6, NOW(), NOW()),

-- Lớp của GV Lê Thị Cúc
(5, 'Trí Tuệ Nhân Tạo - K65', 'Giới thiệu về AI, Machine Learning, Deep Learning và các ứng dụng', 'Trí Tuệ Nhân Tạo', 3, 'AI65KA', 1, 5, NOW(), NOW()),
(6, 'Xử Lý Ngôn Ngữ Tự Nhiên - K65', 'NLP fundamentals, text processing, sentiment analysis, chatbots', 'Xử Lý NNTN', 3, 'NLP65B', 1, 4, NOW(), NOW()),

-- Lớp của GV Phạm Văn Dũng  
(7, 'Hệ Điều Hành - K66', 'Nguyên lý hệ điều hành, process, thread, memory management, file systems', 'Hệ Điều Hành', 4, 'HDH66A', 1, 7, NOW(), NOW());

-- ============================================================
-- CLASS_MEMBERS - Thành viên lớp học
-- Role phải là UPPERCASE: TEACHER/STUDENT
-- ============================================================

INSERT INTO `class_members` (`id`, `class_id`, `user_id`, `role`, `joined_at`) VALUES
-- Lớp Lập Trình Mạng K65 (id=1)
(1, 1, 1, 'TEACHER', NOW()),
(2, 1, 10, 'STUDENT', NOW()),
(3, 1, 11, 'STUDENT', NOW()),
(4, 1, 12, 'STUDENT', NOW()),
(5, 1, 13, 'STUDENT', NOW()),
(6, 1, 14, 'STUDENT', NOW()),
(7, 1, 15, 'STUDENT', NOW()),

-- Lớp An Toàn Thông Tin K65 (id=2)
(10, 2, 1, 'TEACHER', NOW()),
(11, 2, 10, 'STUDENT', NOW()),
(12, 2, 12, 'STUDENT', NOW()),
(13, 2, 14, 'STUDENT', NOW()),
(14, 2, 15, 'STUDENT', NOW()),

-- Lớp Cơ Sở Dữ Liệu K65 (id=3)
(20, 3, 2, 'TEACHER', NOW()),
(21, 3, 10, 'STUDENT', NOW()),
(22, 3, 11, 'STUDENT', NOW()),
(23, 3, 12, 'STUDENT', NOW()),
(24, 3, 13, 'STUDENT', NOW()),
(25, 3, 14, 'STUDENT', NOW()),
(26, 3, 15, 'STUDENT', NOW()),

-- Lớp Phát Triển Web K66 (id=4)
(30, 4, 2, 'TEACHER', NOW()),
(31, 4, 20, 'STUDENT', NOW()),
(32, 4, 21, 'STUDENT', NOW()),
(33, 4, 22, 'STUDENT', NOW()),
(34, 4, 23, 'STUDENT', NOW()),
(35, 4, 24, 'STUDENT', NOW()),

-- Lớp Trí Tuệ Nhân Tạo K65 (id=5)
(40, 5, 3, 'TEACHER', NOW()),
(41, 5, 11, 'STUDENT', NOW()),
(42, 5, 13, 'STUDENT', NOW()),
(43, 5, 14, 'STUDENT', NOW()),
(44, 5, 15, 'STUDENT', NOW()),

-- Lớp Xử Lý NNTN K65 (id=6)
(50, 6, 3, 'TEACHER', NOW()),
(51, 6, 11, 'STUDENT', NOW()),
(52, 6, 13, 'STUDENT', NOW()),
(53, 6, 15, 'STUDENT', NOW()),

-- Lớp Hệ Điều Hành K66 (id=7)
(60, 7, 4, 'TEACHER', NOW()),
(61, 7, 20, 'STUDENT', NOW()),
(62, 7, 21, 'STUDENT', NOW()),
(63, 7, 22, 'STUDENT', NOW()),
(64, 7, 23, 'STUDENT', NOW()),
(65, 7, 24, 'STUDENT', NOW()),
(66, 7, 25, 'STUDENT', NOW());

-- ============================================================
-- ASSIGNMENTS - Bài tập
-- Sử dụng deadline thay vì due_date, thêm attachment_url, submission_count, is_active
-- ============================================================

INSERT INTO `assignments` (`id`, `class_id`, `title`, `description`, `deadline`, `attachment_url`, `max_score`, `created_by`, `submission_count`, `created_at`, `updated_at`, `is_active`) VALUES
-- Bài tập Lập Trình Mạng K65
(1, 1, 'Lab 1: TCP Echo Server', 'Xây dựng TCP Echo Server và Client sử dụng Socket API. Yêu cầu:\n- Server có thể phục vụ nhiều client đồng thời\n- Xử lý các trường hợp lỗi kết nối\n- Log các hoạt động ra file', DATE_ADD(NOW(), INTERVAL 7 DAY), NULL, 100, 1, 4, NOW(), NOW(), 1),
(2, 1, 'Lab 2: UDP Chat Application', 'Xây dựng ứng dụng chat sử dụng UDP protocol. Yêu cầu:\n- Giao diện đơn giản (console hoặc GUI)\n- Hỗ trợ group chat\n- Xử lý thất lạc gói tin', DATE_ADD(NOW(), INTERVAL 14 DAY), NULL, 100, 1, 0, NOW(), NOW(), 1),
(3, 1, 'Lab 3: HTTP Web Server', 'Xây dựng HTTP Web Server đơn giản hỗ trợ:\n- GET request\n- Static file serving\n- Logging request/response', DATE_ADD(NOW(), INTERVAL 21 DAY), NULL, 100, 1, 0, NOW(), NOW(), 1),

-- Bài tập An Toàn Thông Tin K65
(10, 2, 'Lab 1: Mã hóa Caesar & Vigenère', 'Cài đặt thuật toán mã hóa Caesar và Vigenère cipher. Viết chương trình mã hóa và giải mã văn bản.', DATE_ADD(NOW(), INTERVAL 5 DAY), NULL, 100, 1, 0, NOW(), NOW(), 1),
(11, 2, 'Lab 2: Hash Functions', 'Tìm hiểu và demo các hàm băm MD5, SHA-1, SHA-256. So sánh về độ an toàn và hiệu năng.', DATE_ADD(NOW(), INTERVAL 12 DAY), NULL, 100, 1, 0, NOW(), NOW(), 1),

-- Bài tập Cơ Sở Dữ Liệu K65
(20, 3, 'Bài tập 1: ER Diagram', 'Thiết kế ER Diagram cho hệ thống quản lý thư viện bao gồm:\n- Sách, tác giả, thể loại\n- Thành viên, mượn/trả sách\n- Phạt trễ hạn', DATE_ADD(NOW(), INTERVAL 7 DAY), NULL, 100, 2, 2, NOW(), NOW(), 1),
(21, 3, 'Bài tập 2: SQL Queries', 'Viết các câu truy vấn SQL cho các yêu cầu:\n- Thống kê sách theo thể loại\n- Tìm thành viên mượn nhiều sách nhất\n- Các sách chưa được mượn', DATE_ADD(NOW(), INTERVAL 14 DAY), NULL, 100, 2, 0, NOW(), NOW(), 1),
(22, 3, 'Bài tập 3: Normalization', 'Chuẩn hóa bảng dữ liệu đến 3NF. Giải thích từng bước chuẩn hóa.', DATE_ADD(NOW(), INTERVAL 21 DAY), NULL, 100, 2, 0, NOW(), NOW(), 1),

-- Bài tập Phát Triển Web K66
(30, 4, 'Project 1: Landing Page', 'Xây dựng landing page responsive sử dụng HTML5, CSS3 và JavaScript. Yêu cầu:\n- Mobile-first design\n- Animation và transitions\n- Form validation', DATE_ADD(NOW(), INTERVAL 10 DAY), NULL, 100, 2, 2, NOW(), NOW(), 1),
(31, 4, 'Project 2: Todo App với React', 'Xây dựng ứng dụng Todo sử dụng React. Yêu cầu:\n- CRUD operations\n- Local storage\n- Filter và search', DATE_ADD(NOW(), INTERVAL 20 DAY), NULL, 100, 2, 0, NOW(), NOW(), 1),

-- Bài tập Trí Tuệ Nhân Tạo K65
(40, 5, 'Lab 1: Linear Regression', 'Cài đặt Linear Regression từ đầu (không dùng sklearn). Áp dụng cho bài toán dự đoán giá nhà.', DATE_ADD(NOW(), INTERVAL 7 DAY), NULL, 100, 3, 0, NOW(), NOW(), 1),
(41, 5, 'Lab 2: Decision Tree', 'Cài đặt thuật toán Decision Tree cho bài toán classification. So sánh với sklearn.', DATE_ADD(NOW(), INTERVAL 14 DAY), NULL, 100, 3, 0, NOW(), NOW(), 1),

-- Bài tập Hệ Điều Hành K66
(50, 7, 'Lab 1: Process Management', 'Viết chương trình demo fork(), exec(), wait() trong Linux. Tạo process tree.', DATE_ADD(NOW(), INTERVAL 7 DAY), NULL, 100, 4, 0, NOW(), NOW(), 1),
(51, 7, 'Lab 2: Thread Synchronization', 'Demo Producer-Consumer problem sử dụng mutex và semaphore.', DATE_ADD(NOW(), INTERVAL 14 DAY), NULL, 100, 4, 0, NOW(), NOW(), 1);

-- ============================================================
-- SUBMISSIONS - Bài nộp
-- ============================================================

INSERT INTO `submissions` (`id`, `assignment_id`, `student_id`, `file_url`, `score`, `feedback`, `status`, `graded_at`, `graded_by`, `content`, `submitted_at`, `is_late`) VALUES
-- Submissions cho Lab 1: TCP Echo Server
(1, 1, 10, '/uploads/submissions/tcp_server_hme.zip', 95.00, 'Bài làm tốt! Code clean và xử lý lỗi tốt. Cần thêm comments.', 'graded', NOW(), 1, 'Source code TCP Echo Server', NOW(), 0),
(2, 1, 11, '/uploads/submissions/tcp_server_ntf.zip', 88.00, 'Hoạt động đúng yêu cầu. Multi-threading cần cải thiện.', 'graded', NOW(), 1, 'Source code TCP Echo Server', NOW(), 0),
(3, 1, 12, '/uploads/submissions/tcp_server_tvg.zip', NULL, NULL, 'submitted', NULL, NULL, 'Source code TCP Echo Server', NOW(), 0),
(4, 1, 13, '/uploads/submissions/tcp_server_lvh.zip', 92.00, 'Rất tốt! Xử lý concurrent connections tốt.', 'graded', NOW(), 1, 'Source code TCP Echo Server', NOW(), 0),

-- Submissions cho Bài tập ER Diagram  
(10, 20, 10, '/uploads/submissions/er_diagram_hme.pdf', 90.00, 'ER Diagram rõ ràng, đầy đủ entities và relationships.', 'graded', NOW(), 2, 'ER Diagram PDF', NOW(), 0),
(11, 20, 11, '/uploads/submissions/er_diagram_ntf.pdf', 85.00, 'Tốt, nhưng thiếu một số ràng buộc.', 'graded', NOW(), 2, 'ER Diagram PDF', NOW(), 0),

-- Submissions cho Project Landing Page
(20, 30, 20, '/uploads/submissions/landing_nvl.zip', NULL, NULL, 'submitted', NULL, NULL, 'Landing Page source', NOW(), 0),
(21, 30, 21, '/uploads/submissions/landing_ttm.zip', 92.00, 'Design đẹp, responsive tốt!', 'graded', NOW(), 2, 'Landing Page source', NOW(), 0);

-- ============================================================
-- LIVE_SESSIONS - Phiên học trực tuyến
-- Sử dụng duration_seconds thay vì is_recorded
-- ============================================================

INSERT INTO `live_sessions` (`id`, `class_id`, `room_id`, `title`, `description`, `host_id`, `status`, `scheduled_at`, `started_at`, `ended_at`, `max_participants`, `current_participants`, `recording_url`, `duration_seconds`, `created_at`, `updated_at`) VALUES
-- Phiên học Lập Trình Mạng
(1, 1, UUID(), 'Buổi 1: Giới thiệu Socket Programming', 'Giới thiệu tổng quan về lập trình mạng và Socket API', 1, 'ended', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), 50, 0, '/recordings/ltm_session1.mp4', 5400, NOW(), NOW()),
(2, 1, UUID(), 'Buổi 2: TCP vs UDP', 'So sánh TCP và UDP, demo code', 1, 'ended', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 50, 0, '/recordings/ltm_session2.mp4', 4800, NOW(), NOW()),
(3, 1, UUID(), 'Buổi 3: Multi-threading Server', 'Xây dựng server đa luồng', 1, 'scheduled', DATE_ADD(NOW(), INTERVAL 1 DAY), NULL, NULL, 50, 0, NULL, NULL, NOW(), NOW()),
(4, 1, UUID(), 'Buổi 4: HTTP Protocol', 'Tìm hiểu HTTP protocol và xây dựng web server', 1, 'scheduled', DATE_ADD(NOW(), INTERVAL 5 DAY), NULL, NULL, 50, 0, NULL, NULL, NOW(), NOW()),

-- Phiên học Cơ Sở Dữ Liệu
(10, 3, UUID(), 'Buổi 1: Giới thiệu CSDL quan hệ', 'Các khái niệm cơ bản về CSDL quan hệ', 2, 'ended', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), 60, 0, '/recordings/csdl_session1.mp4', 5100, NOW(), NOW()),
(11, 3, UUID(), 'Buổi 2: SQL cơ bản', 'Câu lệnh SELECT, INSERT, UPDATE, DELETE', 2, 'scheduled', DATE_ADD(NOW(), INTERVAL 2 DAY), NULL, NULL, 60, 0, NULL, NULL, NOW(), NOW()),

-- Phiên học Phát Triển Web
(20, 4, UUID(), 'Workshop: React Basics', 'Giới thiệu ReactJS cho người mới bắt đầu', 2, 'scheduled', DATE_ADD(NOW(), INTERVAL 3 DAY), NULL, NULL, 40, 0, NULL, NULL, NOW(), NOW()),

-- Phiên học đang diễn ra
(30, 5, UUID(), 'Live: Machine Learning Q&A', 'Giải đáp thắc mắc về Machine Learning', 3, 'live', NOW(), NOW(), NULL, 30, 5, NULL, NULL, NOW(), NOW());

-- ============================================================
-- MATERIALS - Tài liệu
-- ============================================================

INSERT INTO `materials` (`id`, `class_id`, `title`, `description`, `file_url`, `file_name`, `file_type`, `file_size`, `mime_type`, `uploaded_by`, `download_count`, `created_at`) VALUES
-- Tài liệu Lập Trình Mạng
(1, 1, 'Slide Bài 1: Introduction to Networking', 'Slide bài giảng giới thiệu về mạng máy tính và lập trình mạng', '/materials/ltm_slide1.pdf', 'ltm_slide1.pdf', 'pdf', 2500000, 'application/pdf', 1, 45, NOW()),
(2, 1, 'Slide Bài 2: Socket Programming', 'Socket API và các ví dụ minh họa', '/materials/ltm_slide2.pdf', 'ltm_slide2.pdf', 'pdf', 3100000, 'application/pdf', 1, 38, NOW()),
(3, 1, 'Source Code Examples', 'Các ví dụ code TCP/UDP server và client', '/materials/ltm_examples.zip', 'ltm_examples.zip', 'zip', 156000, 'application/zip', 1, 52, NOW()),

-- Tài liệu Cơ Sở Dữ Liệu
(10, 3, 'Giáo trình CSDL', 'Giáo trình Cơ Sở Dữ Liệu (Chương 1-5)', '/materials/csdl_textbook.pdf', 'csdl_textbook.pdf', 'pdf', 8500000, 'application/pdf', 2, 60, NOW()),
(11, 3, 'SQL Practice', 'Bộ bài tập SQL với đáp án', '/materials/sql_practice.pdf', 'sql_practice.pdf', 'pdf', 1200000, 'application/pdf', 2, 55, NOW()),
(12, 3, 'Sample Database', 'Database mẫu cho thực hành', '/materials/sample_db.sql', 'sample_db.sql', 'sql', 45000, 'text/sql', 2, 48, NOW()),

-- Tài liệu Phát Triển Web
(20, 4, 'HTML5 & CSS3 Guide', 'Hướng dẫn HTML5 và CSS3 cơ bản', '/materials/html_css_guide.pdf', 'html_css_guide.pdf', 'pdf', 4200000, 'application/pdf', 2, 35, NOW()),
(21, 4, 'React Documentation', 'Tài liệu hướng dẫn ReactJS', '/materials/react_docs.pdf', 'react_docs.pdf', 'pdf', 5800000, 'application/pdf', 2, 42, NOW()),

-- Tài liệu Trí Tuệ Nhân Tạo
(30, 5, 'Machine Learning Fundamentals', 'Slide giới thiệu Machine Learning', '/materials/ml_fundamentals.pdf', 'ml_fundamentals.pdf', 'pdf', 6700000, 'application/pdf', 3, 28, NOW()),
(31, 5, 'Python ML Examples', 'Jupyter notebooks với ví dụ ML', '/materials/ml_notebooks.zip', 'ml_notebooks.zip', 'zip', 3400000, 'application/zip', 3, 25, NOW());

-- ============================================================
-- NOTIFICATIONS - Thông báo
-- ============================================================

INSERT INTO `notifications` (`id`, `userId`, `type`, `title`, `message`, `priority`, `isRead`, `readAt`, `relatedEntityType`, `relatedEntityId`, `actionUrl`, `createdAt`) VALUES
-- Thông báo cho sinh viên Hoàng Minh Em (id=10)
(1, 10, 'assignment_created', 'Bài tập mới: Lab 1 TCP Echo Server', 'Thầy Nguyễn Văn An đã đăng bài tập mới trong lớp Lập Trình Mạng K65', 'normal', 1, NOW(), 'assignment', '1', '/assignments/1', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 10, 'submission_graded', 'Bài tập đã được chấm điểm', 'Bài Lab 1: TCP Echo Server của bạn đã được chấm: 95/100 điểm', 'high', 0, NULL, 'submission', '1', '/assignments/1/submission', NOW()),
(3, 10, 'session_scheduled', 'Lịch học mới: Buổi 3 Multi-threading Server', 'Buổi học trực tuyến mới đã được lên lịch cho lớp Lập Trình Mạng K65', 'normal', 0, NULL, 'live_session', '3', '/live-sessions/3', NOW()),

-- Thông báo cho sinh viên Nguyễn Thị Fang (id=11)
(10, 11, 'assignment_due_soon', 'Sắp đến hạn nộp bài', 'Bài tập "Lab 2: UDP Chat Application" sẽ hết hạn trong 2 ngày', 'high', 0, NULL, 'assignment', '2', '/assignments/2', NOW()),
(11, 11, 'session_starting_soon', 'Buổi học sắp bắt đầu', 'Buổi học "Machine Learning Q&A" sẽ bắt đầu trong 30 phút', 'urgent', 0, NULL, 'live_session', '30', '/live-sessions/30', NOW()),

-- Thông báo cho sinh viên K66
(20, 20, 'class_joined', 'Chào mừng đến lớp Phát Triển Web K66', 'Bạn đã tham gia thành công lớp Phát Triển Web K66', 'normal', 1, NOW(), 'class', '4', '/classes/4', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(21, 20, 'assignment_created', 'Bài tập mới: Project 1 Landing Page', 'Thầy Trần Văn Bình đã đăng bài tập mới', 'normal', 0, NULL, 'assignment', '30', '/assignments/30', DATE_SUB(NOW(), INTERVAL 3 DAY)),

-- Thông báo cho giảng viên
(30, 1, 'submission_received', 'Bài nộp mới từ Hoàng Minh Em', 'Sinh viên Hoàng Minh Em đã nộp bài Lab 1: TCP Echo Server', 'normal', 1, NOW(), 'submission', '1', '/assignments/1/submissions', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(31, 1, 'submission_received', 'Bài nộp mới từ Nguyễn Thị Fang', 'Sinh viên Nguyễn Thị Fang đã nộp bài Lab 1: TCP Echo Server', 'normal', 0, NULL, 'submission', '2', '/assignments/1/submissions', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ============================================================
-- CHAT_MESSAGES - Tin nhắn
-- Sử dụng reply_to thay vì parent_id, room_id là class id (không có prefix)
-- ============================================================

INSERT INTO `chat_messages` (`id`, `room_id`, `room_type`, `sender_id`, `message`, `message_type`, `file_url`, `reply_to`, `is_edited`, `is_deleted`, `created_at`, `updated_at`) VALUES
-- Chat trong lớp Lập Trình Mạng (class:1) - room_id là class id
(1, '1', 'class', 1, 'Chào cả lớp! Tuần này chúng ta sẽ học về TCP Socket Programming.', 'text', NULL, NULL, 0, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, '1', 'class', 10, 'Dạ thầy ơi, em có thể hỏi thêm về việc handle multiple clients được không ạ?', 'text', NULL, NULL, 0, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, '1', 'class', 1, 'Được em, em có thể sử dụng threading hoặc async IO. Thầy sẽ demo trong buổi học tới.', 'text', NULL, 2, 0, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, '1', 'class', 11, 'Em cũng muốn hỏi về phần này ạ. Mong thầy giải thích thêm.', 'text', NULL, 2, 0, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(5, '1', 'class', 12, 'Thầy ơi deadline Lab 1 có thể gia hạn được không ạ?', 'text', NULL, NULL, 0, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, '1', 'class', 1, 'Deadline giữ nguyên nhé các em. Cố gắng nộp đúng hạn.', 'text', NULL, 5, 0, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),

-- Chat trong lớp Cơ Sở Dữ Liệu (class:3)
(10, '3', 'class', 2, 'Các em đã làm xong ER Diagram chưa? Có thắc mắc gì không?', 'text', NULL, NULL, 0, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(11, '3', 'class', 11, 'Dạ em đang làm ạ. Em muốn hỏi về cách xác định cardinality ạ.', 'text', NULL, 10, 0, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(12, '3', 'class', 2, 'Cardinality thể hiện mối quan hệ số lượng giữa các entity. Ví dụ: 1 sinh viên có thể mượn nhiều sách (1:N).', 'text', NULL, 11, 0, 0, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),

-- Chat trong lớp Phát Triển Web (class:4)
(20, '4', 'class', 2, 'Welcome to Web Development class!', 'text', NULL, NULL, 0, 0, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(21, '4', 'class', 20, 'Hello thầy! Em rất hứng thú với môn học này ạ.', 'text', NULL, NULL, 0, 0, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(22, '4', 'class', 21, 'Em cũng vậy ạ! Mong được học React từ thầy.', 'text', NULL, NULL, 0, 0, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY));

-- ============================================================
-- Xong! Chạy lệnh sau để import:
-- mysql -u root -p lms_database < seed-data.sql
-- ============================================================

SELECT 'Seed data imported successfully!' AS Status;
SELECT CONCAT('Users: ', COUNT(*)) AS Summary FROM users
UNION ALL
SELECT CONCAT('Classes: ', COUNT(*)) FROM classes
UNION ALL
SELECT CONCAT('Assignments: ', COUNT(*)) FROM assignments
UNION ALL
SELECT CONCAT('Submissions: ', COUNT(*)) FROM submissions
UNION ALL  
SELECT CONCAT('Notifications: ', COUNT(*)) FROM notifications
UNION ALL
SELECT CONCAT('Live Sessions: ', COUNT(*)) FROM live_sessions
UNION ALL
SELECT CONCAT('Materials: ', COUNT(*)) FROM materials
UNION ALL
SELECT CONCAT('Chat Messages: ', COUNT(*)) FROM chat_messages;
