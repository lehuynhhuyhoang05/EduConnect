-- Adminer 5.4.1 MySQL 8.0.44 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DELIMITER ;;

DROP PROCEDURE IF EXISTS `sp_calculate_student_grade`;;
CREATE PROCEDURE `sp_calculate_student_grade` (IN `p_student_id` int, IN `p_class_id` int, OUT `avg_score` decimal(5,2), OUT `completed_count` int, OUT `total_count` int)
BEGIN
    SELECT 
        COALESCE(AVG(s.score), 0),
        COUNT(s.id),
        COUNT(a.id)
    INTO avg_score, completed_count, total_count
    FROM `assignments` a
    LEFT JOIN `submissions` s ON a.id = s.assignment_id AND s.student_id = p_student_id
    WHERE a.class_id = p_class_id;
END;;

DROP PROCEDURE IF EXISTS `sp_cleanup_expired_data`;;
CREATE PROCEDURE `sp_cleanup_expired_data` ()
BEGIN
    DECLARE deleted_count INT DEFAULT 0;
    
    -- Delete old deleted chat messages (>30 days)
    DELETE FROM `chat_messages` 
    WHERE `is_deleted` = TRUE 
    AND `created_at` < DATE_SUB(NOW(), INTERVAL 30 DAY);
    SET deleted_count = ROW_COUNT();
    
    -- Delete expired refresh tokens
    DELETE FROM `refresh_tokens` 
    WHERE `expires_at` < NOW() OR `is_revoked` = TRUE;
    
    -- Delete old read notifications (>90 days)
    DELETE FROM `notifications` 
    WHERE `is_read` = TRUE 
    AND `created_at` < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    SELECT CONCAT('Cleaned up ', deleted_count, ' records') AS result;
END;;

DROP PROCEDURE IF EXISTS `sp_cleanup_old_chats`;;
CREATE PROCEDURE `sp_cleanup_old_chats` ()
BEGIN
    DELETE FROM `chat_messages` 
    WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND `is_deleted` = TRUE;
END;;

DROP PROCEDURE IF EXISTS `sp_generate_class_code`;;
CREATE PROCEDURE `sp_generate_class_code` (OUT `new_code` char(6))
BEGIN
    DECLARE attempts INT DEFAULT 0;
    DECLARE max_attempts INT DEFAULT 10;
    DECLARE code_exists INT;
    
    REPEAT
        SET new_code = UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6));
        SELECT COUNT(*) INTO code_exists FROM `classes` WHERE `class_code` = new_code;
        SET attempts = attempts + 1;
    UNTIL code_exists = 0 OR attempts >= max_attempts END REPEAT;
    
    IF attempts >= max_attempts THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to generate unique class code';
    END IF;
END;;

DROP PROCEDURE IF EXISTS `sp_notify_class_members`;;
CREATE PROCEDURE `sp_notify_class_members` (IN `p_class_id` int, IN `p_title` varchar(255), IN `p_message` text, IN `p_type` enum('assignment','grade','class','system','live_session'), IN `p_related_id` int, IN `p_priority` tinyint)
BEGIN
    INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `related_id`, `priority`)
    SELECT cm.user_id, p_title, p_message, p_type, p_related_id, p_priority
    FROM `class_members` cm
    WHERE cm.class_id = p_class_id AND cm.role = 'student';
    
    SELECT ROW_COUNT() AS notifications_sent;
END;;

DROP PROCEDURE IF EXISTS `sp_update_class_counters`;;
CREATE PROCEDURE `sp_update_class_counters` (IN `p_class_id` int)
BEGIN
    UPDATE `classes` 
    SET `student_count` = (
        SELECT COUNT(*) FROM `class_members` 
        WHERE `class_id` = p_class_id AND `role` = 'student'
    )
    WHERE `id` = p_class_id;
END;;

DELIMITER ;

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `assignments`;
CREATE TABLE `assignments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `deadline` timestamp NULL DEFAULT NULL,
  `attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_score` decimal(5,2) unsigned NOT NULL DEFAULT '100.00',
  `created_by` int unsigned NOT NULL,
  `submission_count` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `FK_951fd419e8486c10ba6302a934b` (`class_id`),
  KEY `FK_03fa66c20619cbc55aa4ebc69bd` (`created_by`),
  CONSTRAINT `FK_03fa66c20619cbc55aa4ebc69bd` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_951fd419e8486c10ba6302a934b` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `assignments` (`id`, `class_id`, `title`, `description`, `deadline`, `attachment_url`, `max_score`, `created_by`, `submission_count`, `created_at`, `updated_at`, `is_active`) VALUES
(1,	1,	'Lab 1: TCP Echo Server',	'Xây dựng TCP Echo Server và Client sử dụng Socket API. Yêu cầu:\n- Server có thể phục vụ nhiều client đồng thời\n- Xử lý các trường hợp lỗi kết nối\n- Log các hoạt động ra file',	'2026-01-14 08:00:45',	NULL,	100.00,	1,	4,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(2,	1,	'Lab 2: UDP Chat Application',	'Xây dựng ứng dụng chat sử dụng UDP protocol. Yêu cầu:\n- Giao diện đơn giản (console hoặc GUI)\n- Hỗ trợ group chat\n- Xử lý thất lạc gói tin',	'2026-01-21 08:00:45',	NULL,	100.00,	1,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(3,	1,	'Lab 3: HTTP Web Server',	'Xây dựng HTTP Web Server đơn giản hỗ trợ:\n- GET request\n- Static file serving\n- Logging request/response',	'2026-01-28 08:00:45',	NULL,	100.00,	1,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(10,	2,	'Lab 1: Mã hóa Caesar & Vigenère',	'Cài đặt thuật toán mã hóa Caesar và Vigenère cipher. Viết chương trình mã hóa và giải mã văn bản.',	'2026-01-12 08:00:45',	NULL,	100.00,	1,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(11,	2,	'Lab 2: Hash Functions',	'Tìm hiểu và demo các hàm băm MD5, SHA-1, SHA-256. So sánh về độ an toàn và hiệu năng.',	'2026-01-19 08:00:45',	NULL,	100.00,	1,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(20,	3,	'Bài tập 1: ER Diagram',	'Thiết kế ER Diagram cho hệ thống quản lý thư viện bao gồm:\n- Sách, tác giả, thể loại\n- Thành viên, mượn/trả sách\n- Phạt trễ hạn',	'2026-01-14 08:00:45',	NULL,	100.00,	2,	2,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(21,	3,	'Bài tập 2: SQL Queries',	'Viết các câu truy vấn SQL cho các yêu cầu:\n- Thống kê sách theo thể loại\n- Tìm thành viên mượn nhiều sách nhất\n- Các sách chưa được mượn',	'2026-01-21 08:00:45',	NULL,	100.00,	2,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(22,	3,	'Bài tập 3: Normalization',	'Chuẩn hóa bảng dữ liệu đến 3NF. Giải thích từng bước chuẩn hóa.',	'2026-01-28 08:00:45',	NULL,	100.00,	2,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(30,	4,	'Project 1: Landing Page',	'Xây dựng landing page responsive sử dụng HTML5, CSS3 và JavaScript. Yêu cầu:\n- Mobile-first design\n- Animation và transitions\n- Form validation',	'2026-01-17 08:00:45',	NULL,	100.00,	2,	2,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(31,	4,	'Project 2: Todo App với React',	'Xây dựng ứng dụng Todo sử dụng React. Yêu cầu:\n- CRUD operations\n- Local storage\n- Filter và search',	'2026-01-27 08:00:45',	NULL,	100.00,	2,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(40,	5,	'Lab 1: Linear Regression',	'Cài đặt Linear Regression từ đầu (không dùng sklearn). Áp dụng cho bài toán dự đoán giá nhà.',	'2026-01-14 08:00:45',	NULL,	100.00,	3,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(41,	5,	'Lab 2: Decision Tree',	'Cài đặt thuật toán Decision Tree cho bài toán classification. So sánh với sklearn.',	'2026-01-21 08:00:45',	NULL,	100.00,	3,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(50,	7,	'Lab 1: Process Management',	'Viết chương trình demo fork(), exec(), wait() trong Linux. Tạo process tree.',	'2026-01-14 08:00:45',	NULL,	100.00,	4,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(51,	7,	'Lab 2: Thread Synchronization',	'Demo Producer-Consumer problem sử dụng mutex và semaphore.',	'2026-01-21 08:00:45',	NULL,	100.00,	4,	0,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000',	1),
(52,	8,	'BT1',	'1',	'2026-01-10 16:45:00',	NULL,	10.00,	27,	1,	'2026-01-07 09:45:50.335342',	'2026-01-07 10:04:06.000000',	1),
(53,	8,	'Bài 2',	'Bài 2',	'2026-01-23 20:05:00',	NULL,	10.00,	27,	1,	'2026-01-07 13:05:55.634227',	'2026-01-07 13:06:58.000000',	1),
(54,	8,	'bài tập 3',	'nộp cgi cũng dc',	'2026-01-17 20:23:00',	NULL,	10.00,	27,	1,	'2026-01-07 13:23:19.030138',	'2026-01-07 13:23:53.000000',	1);

DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `room_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_type` enum('class','live_session') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'class',
  `sender_id` int unsigned NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` enum('text','file','image','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reply_to` bigint unsigned DEFAULT NULL,
  `is_edited` tinyint(1) NOT NULL DEFAULT '0',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_9e5fc47ecb06d4d7b84633b171` (`sender_id`),
  KEY `IDX_35b342cb90e28798801d502410` (`room_type`),
  KEY `IDX_329d6a183675e09d59343b67ab` (`room_id`,`created_at`),
  KEY `FK_4bc3858c999f505ec775f1a7a8c` (`reply_to`),
  CONSTRAINT `FK_4bc3858c999f505ec775f1a7a8c` FOREIGN KEY (`reply_to`) REFERENCES `chat_messages` (`id`),
  CONSTRAINT `FK_9e5fc47ecb06d4d7b84633b1718` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `chat_messages` (`id`, `room_id`, `room_type`, `sender_id`, `message`, `message_type`, `file_url`, `reply_to`, `is_edited`, `is_deleted`, `created_at`, `updated_at`) VALUES
(1,	'1',	'class',	1,	'Chào cả lớp! Tuần này chúng ta sẽ học về TCP Socket Programming.',	'text',	NULL,	NULL,	0,	0,	'2026-01-04 08:00:45.000000',	'2026-01-04 08:00:45.000000'),
(2,	'1',	'class',	10,	'Dạ thầy ơi, em có thể hỏi thêm về việc handle multiple clients được không ạ?',	'text',	NULL,	NULL,	0,	0,	'2026-01-04 08:00:45.000000',	'2026-01-04 08:00:45.000000'),
(3,	'1',	'class',	1,	'Được em, em có thể sử dụng threading hoặc async IO. Thầy sẽ demo trong buổi học tới.',	'text',	NULL,	2,	0,	0,	'2026-01-04 08:00:45.000000',	'2026-01-04 08:00:45.000000'),
(4,	'1',	'class',	11,	'Em cũng muốn hỏi về phần này ạ. Mong thầy giải thích thêm.',	'text',	NULL,	2,	0,	0,	'2026-01-05 08:00:45.000000',	'2026-01-05 08:00:45.000000'),
(5,	'1',	'class',	12,	'Thầy ơi deadline Lab 1 có thể gia hạn được không ạ?',	'text',	NULL,	NULL,	0,	0,	'2026-01-06 08:00:45.000000',	'2026-01-06 08:00:45.000000'),
(6,	'1',	'class',	1,	'Deadline giữ nguyên nhé các em. Cố gắng nộp đúng hạn.',	'text',	NULL,	5,	0,	0,	'2026-01-06 08:00:45.000000',	'2026-01-06 08:00:45.000000'),
(10,	'3',	'class',	2,	'Các em đã làm xong ER Diagram chưa? Có thắc mắc gì không?',	'text',	NULL,	NULL,	0,	0,	'2026-01-05 08:00:45.000000',	'2026-01-05 08:00:45.000000'),
(11,	'3',	'class',	11,	'Dạ em đang làm ạ. Em muốn hỏi về cách xác định cardinality ạ.',	'text',	NULL,	10,	0,	0,	'2026-01-05 08:00:45.000000',	'2026-01-05 08:00:45.000000'),
(12,	'3',	'class',	2,	'Cardinality thể hiện mối quan hệ số lượng giữa các entity. Ví dụ: 1 sinh viên có thể mượn nhiều sách (1:N).',	'text',	NULL,	11,	0,	0,	'2026-01-05 08:00:45.000000',	'2026-01-05 08:00:45.000000'),
(20,	'4',	'class',	2,	'Welcome to Web Development class!',	'text',	NULL,	NULL,	0,	0,	'2026-01-02 08:00:45.000000',	'2026-01-02 08:00:45.000000'),
(21,	'4',	'class',	20,	'Hello thầy! Em rất hứng thú với môn học này ạ.',	'text',	NULL,	NULL,	0,	0,	'2026-01-02 08:00:45.000000',	'2026-01-02 08:00:45.000000'),
(22,	'4',	'class',	21,	'Em cũng vậy ạ! Mong được học React từ thầy.',	'text',	NULL,	NULL,	0,	0,	'2026-01-03 08:00:45.000000',	'2026-01-03 08:00:45.000000'),
(23,	'34',	'live_session',	26,	'alo',	'text',	NULL,	NULL,	0,	0,	'2026-01-07 11:25:51.850299',	'2026-01-07 11:25:51.850299'),
(24,	'34',	'live_session',	27,	'aaa',	'text',	NULL,	NULL,	0,	0,	'2026-01-07 12:02:36.553957',	'2026-01-07 12:02:36.553957'),
(25,	'34',	'live_session',	26,	'bbbb',	'text',	NULL,	NULL,	0,	0,	'2026-01-07 12:02:43.878844',	'2026-01-07 12:02:43.878844'),
(26,	'34',	'live_session',	27,	'alo',	'text',	NULL,	NULL,	0,	0,	'2026-01-07 12:12:23.769721',	'2026-01-07 12:12:23.769721'),
(27,	'34',	'live_session',	27,	'a',	'text',	NULL,	NULL,	0,	0,	'2026-01-07 12:22:50.510325',	'2026-01-07 12:22:50.510325'),
(28,	'34',	'live_session',	26,	'kdsdks',	'text',	NULL,	NULL,	0,	0,	'2026-01-07 12:23:10.853940',	'2026-01-07 12:23:10.853940'),
(29,	'37',	'live_session',	27,	'vai',	'text',	NULL,	NULL,	0,	0,	'2026-01-08 05:44:03.178857',	'2026-01-08 05:44:03.178857');

DROP TABLE IF EXISTS `class_members`;
CREATE TABLE `class_members` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `role` enum('TEACHER','STUDENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STUDENT',
  `joined_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_class_user` (`class_id`,`user_id`),
  KEY `idx_member_user` (`user_id`),
  KEY `idx_member_class` (`class_id`),
  CONSTRAINT `FK_2ace5ca20caf6953506af45c935` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_4569afaf85946abfa3c9cbac1a6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `class_members` (`id`, `class_id`, `user_id`, `role`, `joined_at`) VALUES
(1,	1,	1,	'TEACHER',	'2026-01-07 08:00:45.000000'),
(2,	1,	10,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(3,	1,	11,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(4,	1,	12,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(5,	1,	13,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(6,	1,	14,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(7,	1,	15,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(10,	2,	1,	'TEACHER',	'2026-01-07 08:00:45.000000'),
(11,	2,	10,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(12,	2,	12,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(13,	2,	14,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(14,	2,	15,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(20,	3,	2,	'TEACHER',	'2026-01-07 08:00:45.000000'),
(21,	3,	10,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(22,	3,	11,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(23,	3,	12,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(24,	3,	13,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(25,	3,	14,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(26,	3,	15,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(30,	4,	2,	'TEACHER',	'2026-01-07 08:00:45.000000'),
(31,	4,	20,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(32,	4,	21,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(33,	4,	22,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(34,	4,	23,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(35,	4,	24,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(40,	5,	3,	'TEACHER',	'2026-01-07 08:00:45.000000'),
(41,	5,	11,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(42,	5,	13,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(43,	5,	14,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(44,	5,	15,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(50,	6,	3,	'TEACHER',	'2026-01-07 08:00:45.000000'),
(51,	6,	11,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(52,	6,	13,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(53,	6,	15,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(60,	7,	4,	'TEACHER',	'2026-01-07 08:00:45.000000'),
(61,	7,	20,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(62,	7,	21,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(63,	7,	22,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(64,	7,	23,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(65,	7,	24,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(66,	7,	25,	'STUDENT',	'2026-01-07 08:00:45.000000'),
(67,	8,	27,	'TEACHER',	'2026-01-07 08:56:09.592765'),
(70,	8,	26,	'STUDENT',	'2026-01-07 09:11:16.107650');

DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `subject` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teacher_id` int unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `member_count` int NOT NULL DEFAULT '0',
  `class_code` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_1c7a37d4b45c2664db574869ff` (`class_code`),
  UNIQUE KEY `idx_class_code` (`class_code`),
  KEY `idx_class_active` (`is_active`),
  KEY `idx_class_teacher` (`teacher_id`),
  CONSTRAINT `FK_b34c92e413c4debb6e0f23fed46` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `classes` (`id`, `name`, `description`, `subject`, `teacher_id`, `is_active`, `member_count`, `class_code`, `created_at`, `updated_at`) VALUES
(1,	'Lập Trình Mạng - K65',	'Môn học về lập trình ứng dụng mạng, socket programming, TCP/UDP, HTTP protocols',	'Lập Trình Mạng',	1,	1,	7,	'LTM65A',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(2,	'An Toàn Thông Tin - K65',	'Học về bảo mật hệ thống, mã hóa, xác thực và các kỹ thuật tấn công phòng thủ',	'An Toàn Thông Tin',	1,	1,	5,	'ATTT65',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(3,	'Cơ Sở Dữ Liệu - K65',	'Thiết kế và quản trị cơ sở dữ liệu quan hệ, SQL, normalization, indexing',	'Cơ Sở Dữ Liệu',	2,	1,	7,	'CSDL65',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(4,	'Phát Triển Web - K66',	'Xây dựng ứng dụng web với HTML, CSS, JavaScript, React và Node.js',	'Phát Triển Web',	2,	1,	6,	'WEB66A',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(5,	'Trí Tuệ Nhân Tạo - K65',	'Giới thiệu về AI, Machine Learning, Deep Learning và các ứng dụng',	'Trí Tuệ Nhân Tạo',	3,	1,	5,	'AI65KA',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(6,	'Xử Lý Ngôn Ngữ Tự Nhiên - K65',	'NLP fundamentals, text processing, sentiment analysis, chatbots',	'Xử Lý NNTN',	3,	1,	4,	'NLP65B',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(7,	'Hệ Điều Hành - K66',	'Nguyên lý hệ điều hành, process, thread, memory management, file systems',	'Hệ Điều Hành',	4,	1,	7,	'HDH66A',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(8,	'ITS',	'ITS',	'ITS',	27,	1,	2,	'T5XE0B',	'2026-01-07 08:56:09.583766',	'2026-01-07 09:11:16.000000');

DROP TABLE IF EXISTS `files`;
CREATE TABLE `files` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `path` varchar(500) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size` bigint unsigned NOT NULL,
  `uploaded_by` int unsigned NOT NULL,
  `uploaded_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_file_uploader` (`uploaded_by`),
  CONSTRAINT `FK_63c92c51cd7fd95c2d79d709b61` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `files` (`id`, `original_name`, `stored_name`, `path`, `mime_type`, `size`, `uploaded_by`, `uploaded_at`) VALUES
(1,	'bienso1.jpg',	'1767791218052-bdfdf79dc2c7977d.jpg',	'/uploads/1767791218052-bdfdf79dc2c7977d.jpg',	'image/jpeg',	98547,	26,	'2026-01-07 13:06:58.065721'),
(2,	'Lab_Detect_BienSo_XeMay.ipynb',	'1767792233661-662fa9ec4e563bd8.ipynb',	'/uploads/1767792233661-662fa9ec4e563bd8.ipynb',	'application/octet-stream',	2584324,	26,	'2026-01-07 13:23:53.691479');

DROP TABLE IF EXISTS `live_sessions`;
CREATE TABLE `live_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_id` int unsigned NOT NULL,
  `room_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `host_id` int unsigned NOT NULL,
  `status` enum('scheduled','live','ended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `max_participants` smallint unsigned NOT NULL DEFAULT '20',
  `current_participants` smallint unsigned NOT NULL DEFAULT '0',
  `recording_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_seconds` int unsigned DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_b31c50c83d131155c7f74ab822` (`room_id`),
  KEY `IDX_242e48cb081346f098c01d09eb` (`scheduled_at`),
  KEY `IDX_8d78c5695a60ab704d56d66e05` (`status`),
  KEY `FK_71dc611529eec8d91fe6522fe46` (`class_id`),
  KEY `FK_3147c830e81d28943141e19e9c5` (`host_id`),
  CONSTRAINT `FK_3147c830e81d28943141e19e9c5` FOREIGN KEY (`host_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_71dc611529eec8d91fe6522fe46` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `live_sessions` (`id`, `class_id`, `room_id`, `title`, `description`, `host_id`, `status`, `scheduled_at`, `started_at`, `ended_at`, `max_participants`, `current_participants`, `recording_url`, `duration_seconds`, `created_at`, `updated_at`) VALUES
(1,	1,	'f8500c68-eb9e-11f0-a97b-8aee0ac1e3cf',	'Buổi 1: Giới thiệu Socket Programming',	'Giới thiệu tổng quan về lập trình mạng và Socket API',	1,	'ended',	'2025-12-31 08:00:45',	'2025-12-31 08:00:45',	'2026-01-01 08:00:45',	50,	0,	'/recordings/ltm_session1.mp4',	5400,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(2,	1,	'f85011bf-eb9e-11f0-a97b-8aee0ac1e3cf',	'Buổi 2: TCP vs UDP',	'So sánh TCP và UDP, demo code',	1,	'ended',	'2026-01-04 08:00:45',	'2026-01-04 08:00:45',	'2026-01-05 08:00:45',	50,	0,	'/recordings/ltm_session2.mp4',	4800,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(3,	1,	'f85013d4-eb9e-11f0-a97b-8aee0ac1e3cf',	'Buổi 3: Multi-threading Server',	'Xây dựng server đa luồng',	1,	'scheduled',	'2026-01-08 08:00:45',	NULL,	NULL,	50,	0,	NULL,	NULL,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(4,	1,	'f85014cb-eb9e-11f0-a97b-8aee0ac1e3cf',	'Buổi 4: HTTP Protocol',	'Tìm hiểu HTTP protocol và xây dựng web server',	1,	'scheduled',	'2026-01-12 08:00:45',	NULL,	NULL,	50,	0,	NULL,	NULL,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(10,	3,	'f8501567-eb9e-11f0-a97b-8aee0ac1e3cf',	'Buổi 1: Giới thiệu CSDL quan hệ',	'Các khái niệm cơ bản về CSDL quan hệ',	2,	'ended',	'2026-01-02 08:00:45',	'2026-01-02 08:00:45',	'2026-01-03 08:00:45',	60,	0,	'/recordings/csdl_session1.mp4',	5100,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(11,	3,	'f8501618-eb9e-11f0-a97b-8aee0ac1e3cf',	'Buổi 2: SQL cơ bản',	'Câu lệnh SELECT, INSERT, UPDATE, DELETE',	2,	'scheduled',	'2026-01-09 08:00:45',	NULL,	NULL,	60,	0,	NULL,	NULL,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(20,	4,	'f85016b4-eb9e-11f0-a97b-8aee0ac1e3cf',	'Workshop: React Basics',	'Giới thiệu ReactJS cho người mới bắt đầu',	2,	'scheduled',	'2026-01-10 08:00:45',	NULL,	NULL,	40,	0,	NULL,	NULL,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(30,	5,	'f8501750-eb9e-11f0-a97b-8aee0ac1e3cf',	'Live: Machine Learning Q&A',	'Giải đáp thắc mắc về Machine Learning',	3,	'live',	'2026-01-07 08:00:45',	'2026-01-07 08:00:45',	NULL,	30,	5,	NULL,	NULL,	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(31,	8,	'1b805b97-65e4-4196-a535-4d38c0794fc7',	'live',	'live',	27,	'ended',	'2026-01-07 17:37:00',	'2026-01-07 17:36:29',	'2026-01-07 17:37:26',	20,	0,	NULL,	57,	'2026-01-07 10:35:33.908141',	'2026-01-07 10:37:26.000000'),
(32,	8,	'670e9105-7f4a-4e67-90a7-ea5b95edb0e4',	'Live2',	'Live2',	27,	'ended',	'2026-01-07 17:39:00',	'2026-01-07 17:39:04',	'2026-01-07 17:40:42',	20,	0,	NULL,	98,	'2026-01-07 10:38:24.327626',	'2026-01-07 10:40:42.000000'),
(33,	8,	'b44678c7-3619-4153-8278-2b9cc281ae21',	'live3',	'live3',	27,	'ended',	NULL,	'2026-01-07 17:48:39',	'2026-01-07 18:04:51',	20,	0,	NULL,	971,	'2026-01-07 10:48:18.073068',	'2026-01-07 11:04:50.000000'),
(37,	8,	'd37cbded-d0a7-4f03-b6f2-805c3eafe1ad',	'Test',	'Học code',	27,	'live',	NULL,	'2026-01-08 12:41:54',	NULL,	50,	0,	NULL,	NULL,	'2026-01-08 05:41:53.800567',	'2026-01-08 05:47:53.000000');

DROP TABLE IF EXISTS `live_sessions_participants`;
CREATE TABLE `live_sessions_participants` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `live_session_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `left_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `connection_quality` enum('excellent','good','poor','unknown') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown',
  `joined_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_5d96b220e6bbb49d780f864202` (`live_session_id`,`user_id`),
  KEY `FK_bc8f414e634f4a1118990ffb27c` (`user_id`),
  CONSTRAINT `FK_670d9891e2851035cd94dbab007` FOREIGN KEY (`live_session_id`) REFERENCES `live_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_bc8f414e634f4a1118990ffb27c` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `live_sessions_participants` (`id`, `live_session_id`, `user_id`, `left_at`, `is_active`, `connection_quality`, `joined_at`) VALUES
(1,	31,	27,	'2026-01-07 17:37:26',	0,	'unknown',	'2026-01-07 10:36:29.298800'),
(2,	32,	27,	'2026-01-07 17:40:42',	0,	'unknown',	'2026-01-07 10:39:04.391414'),
(3,	33,	27,	'2026-01-07 18:04:51',	0,	'unknown',	'2026-01-07 18:02:47.205000'),
(4,	33,	26,	'2026-01-07 18:04:51',	0,	'unknown',	'2026-01-07 18:03:03.830000'),
(8,	37,	27,	'2026-01-08 12:47:54',	0,	'unknown',	'2026-01-08 05:41:55.481103'),
(9,	37,	26,	'2026-01-08 12:44:10',	0,	'unknown',	'2026-01-08 05:42:45.377598');

DROP TABLE IF EXISTS `materials`;
CREATE TABLE `materials` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `class_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int unsigned NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'application/pdf, etc.',
  `uploaded_by` int unsigned NOT NULL,
  `download_count` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_materials_class_created` (`class_id`,`created_at` DESC),
  KEY `idx_materials_type` (`file_type`),
  FULLTEXT KEY `ft_materials_search` (`title`,`description`),
  CONSTRAINT `materials_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `materials_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `materials` (`id`, `class_id`, `title`, `description`, `file_url`, `file_name`, `file_type`, `file_size`, `mime_type`, `uploaded_by`, `download_count`, `created_at`, `updated_at`) VALUES
(1,	1,	'Slide Bài 1: Introduction to Networking',	'Slide bài giảng giới thiệu về mạng máy tính và lập trình mạng',	'/materials/ltm_slide1.pdf',	'ltm_slide1.pdf',	'pdf',	2500000,	'application/pdf',	1,	45,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(2,	1,	'Slide Bài 2: Socket Programming',	'Socket API và các ví dụ minh họa',	'/materials/ltm_slide2.pdf',	'ltm_slide2.pdf',	'pdf',	3100000,	'application/pdf',	1,	38,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(3,	1,	'Source Code Examples',	'Các ví dụ code TCP/UDP server và client',	'/materials/ltm_examples.zip',	'ltm_examples.zip',	'zip',	156000,	'application/zip',	1,	52,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(10,	3,	'Giáo trình CSDL',	'Giáo trình Cơ Sở Dữ Liệu (Chương 1-5)',	'/materials/csdl_textbook.pdf',	'csdl_textbook.pdf',	'pdf',	8500000,	'application/pdf',	2,	60,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(11,	3,	'SQL Practice',	'Bộ bài tập SQL với đáp án',	'/materials/sql_practice.pdf',	'sql_practice.pdf',	'pdf',	1200000,	'application/pdf',	2,	55,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(12,	3,	'Sample Database',	'Database mẫu cho thực hành',	'/materials/sample_db.sql',	'sample_db.sql',	'sql',	45000,	'text/sql',	2,	48,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(20,	4,	'HTML5 & CSS3 Guide',	'Hướng dẫn HTML5 và CSS3 cơ bản',	'/materials/html_css_guide.pdf',	'html_css_guide.pdf',	'pdf',	4200000,	'application/pdf',	2,	35,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(21,	4,	'React Documentation',	'Tài liệu hướng dẫn ReactJS',	'/materials/react_docs.pdf',	'react_docs.pdf',	'pdf',	5800000,	'application/pdf',	2,	42,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(30,	5,	'Machine Learning Fundamentals',	'Slide giới thiệu Machine Learning',	'/materials/ml_fundamentals.pdf',	'ml_fundamentals.pdf',	'pdf',	6700000,	'application/pdf',	3,	28,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45'),
(31,	5,	'Python ML Examples',	'Jupyter notebooks với ví dụ ML',	'/materials/ml_notebooks.zip',	'ml_notebooks.zip',	'zip',	3400000,	'application/zip',	3,	25,	'2026-01-07 08:00:45',	'2026-01-07 08:00:45');

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userId` int unsigned NOT NULL,
  `type` enum('class_joined','class_invitation','class_updated','class_deleted','member_joined','member_left','member_removed','assignment_created','assignment_updated','assignment_due_soon','assignment_overdue','submission_received','submission_graded','submission_returned','session_scheduled','session_starting_soon','session_started','session_ended','session_cancelled','new_message','mentioned','system_announcement','account_updated') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `data` json DEFAULT NULL,
  `isRead` tinyint NOT NULL DEFAULT '0',
  `readAt` timestamp NULL DEFAULT NULL,
  `relatedEntityType` varchar(255) DEFAULT NULL,
  `relatedEntityId` varchar(255) DEFAULT NULL,
  `actionUrl` varchar(500) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_21e65af2f4f242d4c85a92aff4` (`userId`,`createdAt`),
  KEY `IDX_5340fc241f57310d243e5ab20b` (`userId`,`isRead`),
  CONSTRAINT `FK_692a909ee0fa9383e7859f9b406` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `notifications` (`id`, `userId`, `type`, `title`, `message`, `priority`, `data`, `isRead`, `readAt`, `relatedEntityType`, `relatedEntityId`, `actionUrl`, `createdAt`, `updatedAt`) VALUES
(1,	10,	'assignment_created',	'Bài tập mới: Lab 1 TCP Echo Server',	'Thầy Nguyễn Văn An đã đăng bài tập mới trong lớp Lập Trình Mạng K65',	'normal',	NULL,	1,	'2026-01-07 08:00:45',	'assignment',	'1',	'/assignments/1',	'2026-01-02 08:00:45.000000',	'2026-01-07 08:00:45.197192'),
(2,	10,	'submission_graded',	'Bài tập đã được chấm điểm',	'Bài Lab 1: TCP Echo Server của bạn đã được chấm: 95/100 điểm',	'high',	NULL,	0,	NULL,	'submission',	'1',	'/assignments/1/submission',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.197192'),
(3,	10,	'session_scheduled',	'Lịch học mới: Buổi 3 Multi-threading Server',	'Buổi học trực tuyến mới đã được lên lịch cho lớp Lập Trình Mạng K65',	'normal',	NULL,	0,	NULL,	'live_session',	'3',	'/live-sessions/3',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.197192'),
(10,	11,	'assignment_due_soon',	'Sắp đến hạn nộp bài',	'Bài tập \"Lab 2: UDP Chat Application\" sẽ hết hạn trong 2 ngày',	'high',	NULL,	0,	NULL,	'assignment',	'2',	'/assignments/2',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.197192'),
(11,	11,	'session_starting_soon',	'Buổi học sắp bắt đầu',	'Buổi học \"Machine Learning Q&A\" sẽ bắt đầu trong 30 phút',	'urgent',	NULL,	0,	NULL,	'live_session',	'30',	'/live-sessions/30',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.197192'),
(20,	20,	'class_joined',	'Chào mừng đến lớp Phát Triển Web K66',	'Bạn đã tham gia thành công lớp Phát Triển Web K66',	'normal',	NULL,	1,	'2026-01-07 08:00:45',	'class',	'4',	'/classes/4',	'2025-12-28 08:00:45.000000',	'2026-01-07 08:00:45.197192'),
(21,	20,	'assignment_created',	'Bài tập mới: Project 1 Landing Page',	'Thầy Trần Văn Bình đã đăng bài tập mới',	'normal',	NULL,	0,	NULL,	'assignment',	'30',	'/assignments/30',	'2026-01-04 08:00:45.000000',	'2026-01-07 08:00:45.197192'),
(30,	1,	'submission_received',	'Bài nộp mới từ Hoàng Minh Em',	'Sinh viên Hoàng Minh Em đã nộp bài Lab 1: TCP Echo Server',	'normal',	NULL,	1,	'2026-01-07 08:00:45',	'submission',	'1',	'/assignments/1/submissions',	'2026-01-05 08:00:45.000000',	'2026-01-07 08:00:45.197192'),
(31,	1,	'submission_received',	'Bài nộp mới từ Nguyễn Thị Fang',	'Sinh viên Nguyễn Thị Fang đã nộp bài Lab 1: TCP Echo Server',	'normal',	NULL,	0,	NULL,	'submission',	'2',	'/assignments/1/submissions',	'2026-01-06 08:00:45.000000',	'2026-01-07 08:00:45.197192');

DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_revoked` tinyint(1) NOT NULL DEFAULT '0',
  `token` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_ba3bd69c8ad1e799c0256e9e50` (`expires_at`),
  KEY `IDX_4542dd2f38a61354a040ba9fd5` (`token`),
  KEY `IDX_3ddc983c5f7bcf132fd8732c3f` (`user_id`),
  CONSTRAINT `FK_3ddc983c5f7bcf132fd8732c3f4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `refresh_tokens` (`id`, `user_id`, `ip_address`, `is_revoked`, `token`, `user_agent`, `expires_at`, `created_at`) VALUES
(1,	26,	'::1',	0,	'4a99f9cbea5bb2e1284999b42cc6093daf7bbfdd50c75524fd529c123968d9f50434934e4ecdef927061f2479ec90cb8ed26f1d58d327a35a35b52f8e28ea69c',	'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 Edg/143.0.0.0',	'2026-01-14 15:15:02',	'2026-01-07 08:15:01.837149'),
(2,	26,	'::1',	1,	'36d9d0b90408f5eabdea8ec0d6d9bc917058080fcfd57ddb195da905f63a1a9dae976722d39d6320617ef3c20abc8ea6176cb39404c18efa90e5f6e1e22e59d6',	'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 Edg/143.0.0.0',	'2026-01-14 15:19:26',	'2026-01-07 08:19:26.191736'),
(3,	26,	'::1',	0,	'6d9195099e85bd3f1d6bbffc9245689e0dbbe005db495b0df0af9d3e63d19456dffc0caef1528c00e6be76a3206dd06f5017d4c346cfab0b7d1f1b2e59d71efd',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 15:39:43',	'2026-01-07 08:39:42.807668'),
(4,	26,	'::1',	0,	'a8e802dcea29636a2053e6bd3127a6a32e7f6189002f61eb438b34fff83c2a493613b4e3ccb491570ead7dfe6dc203482e8405a01cb3d82ab0956290a7341734',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 15:39:43',	'2026-01-07 08:39:42.817145'),
(5,	27,	'::1',	1,	'801e2d5b4ab7c0b37325a5f912dd8651dea18afad4e1ade79034a0951a5fce127b6c64055b6970deaf5751488e0d781e83ea512321bdafd094cfa76f36ac0554',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 15:44:40',	'2026-01-07 08:44:40.121838'),
(6,	26,	'::1',	1,	'c88a8fa216ae4396afd2aa22e99afd82a2a20353128d400e771403a756a4cf6b8549f11f7eb1d96fa1c691a16ffbd9598f9d75add1cfa4faeedcb2d479678353',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 15:57:01',	'2026-01-07 08:57:00.770282'),
(7,	27,	'::1',	0,	'64e1272210d0193a69069dd6b96162f9e7ff9e2de8b035b75ee3c80c542a9411a809b4428ecace74610201aaaac893f7c33c81276ee1d12f2b070c66b5be1800',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 16:02:06',	'2026-01-07 09:02:06.017975'),
(8,	27,	'::1',	1,	'4324905cccdce98a5b40a768c5d407eb93173d597385bcf14e9595042d62fc10e5d6e0c7865e0a159ed25d4549c165165b0e062f80d5b7c5ffa9a77a5456a992',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 16:02:06',	'2026-01-07 09:02:06.023528'),
(9,	27,	'::1',	1,	'cff8275de4b7dbd24e01cb3362142f817beeac4231e00c70535db2aadbb39cd9c0b7452ce3b9d2784bc3eb50d59239403776be4f840d809e01a1a99aaffebe1f',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 16:35:52',	'2026-01-07 09:35:52.463635'),
(10,	27,	'::1',	0,	'e18372b9f32968609f781b3abeb53edf8dbbb6adae2315f2cce707cdab2ab7a455302190815ef613714191e7d446c64010c4b26d661f0965e3ad4c6ef30f3276',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 16:59:16',	'2026-01-07 09:59:16.106212'),
(11,	27,	'::1',	1,	'969af2b60e8f3de21ae2a382c7aae28f7daafe1ed513d508c0d00162e4dfda3c41e97ec99ed027bc3b7342aedc912890e3c6021d299efe389a6d2067022b07fb',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 16:59:16',	'2026-01-07 09:59:16.112384'),
(12,	26,	'::1',	1,	'8cc6da561b05503101600e1e4440794daa8be8a76cc9e1010ba655c2bf48b23b98c50c36d3017e7de5b6361b7adb84cb1454a1916883e6abfe65817cbe0c6435',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:03:54',	'2026-01-07 10:03:53.666048'),
(13,	26,	'::1',	0,	'b274868c22302ebf4ca9861366a8a2cb72f26429ec522349249796139c1c5276921dfa5ae4a65d023b91e3906f9db1214ab66f87b173b3139bcc2dc4d5bac938',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:03:54',	'2026-01-07 10:03:53.677825'),
(14,	26,	'::1',	0,	'92a3871a52f0df78026a50a9773b61476c4c88c9ce1630f1f969a04aef5360a00756bf96280d8a3811beb6ba6fea55e62f31ab3870f7b1bfee87cd72dc3709e5',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:03:54',	'2026-01-07 10:03:53.699776'),
(15,	26,	'::1',	0,	'd0dd99296573f58b2129e7a9e0537a329fdbaa7d4a5d936027434d479da41a5e6f5be757dfef22bf375ec991e453548fa00ee20639de0b6cb81f2e2075ea0fc8',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:03:54',	'2026-01-07 10:03:53.706840'),
(16,	26,	'::1',	0,	'cf3dc65bc2a0c8fa2cbe25932e2eccde255eaa17330414f021dee64d97ccf157fb8b7fb70fc0c39c512455ca0c2986d1109d302ee915dedacc4f7c481555c125',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:03:54',	'2026-01-07 10:03:53.719505'),
(17,	27,	'::1',	0,	'8431e64b458dcad89b6a207fa18deae6a6155d54be4fc2eff013c781ca738b095ebb1b7fdaac3d6a02fa6d1887a5849e86184928d65fd333e1a7e47afd122668',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 17:18:20',	'2026-01-07 10:18:19.949367'),
(18,	27,	'::1',	1,	'a61c37a2309c5661e41144bd4981da4b241cd939b8e77311cfa26f54c2d36a3081f6e173aa52fe247f84f4db77ef24750fed74b7e4239bad47812c7ba2544016',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 17:18:20',	'2026-01-07 10:18:19.952580'),
(19,	26,	'::1',	0,	'42db1f408ef530ca39fc03eee67522844f14b666ef0be846f284b4c2b13790cc5794580c3c6fcf23292cf87d321b6bd31ef3d81fa6970c04f01344ceeb5bd05c',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:19:42',	'2026-01-07 10:19:41.518011'),
(20,	26,	'::1',	1,	'054e25f52942ca4527114bd6bc36ad570d53035db10e35cfd251ca5474e818ac803ed227af04f50d447343547c923cb1fd7116b3ccbd270e3e3fc81c93b2eca3',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:19:42',	'2026-01-07 10:19:41.518837'),
(21,	27,	'::1',	0,	'd441d1f4b179314f06626be879a9637062e685ea3e81b3ab969bd4f37f552f105d2ed493a11216ed69f5ffeccaab0d1151845388ad9a7d57596a633e90b14941',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 17:34:36',	'2026-01-07 10:34:36.372783'),
(22,	27,	'::1',	1,	'25101e40858a915e76ccf1f0b3267efd58488fb4ff7a98c0ed7c2bd7fb11a8e63ffd8b58c935fd4851b702c8261426431f077737fa58f2673501af7b28f64dec',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 17:34:36',	'2026-01-07 10:34:36.375481'),
(23,	26,	'::1',	0,	'564c342991b71137f906f91641eec1a8d3ba66cff24982e087aa60de9a0be05a75f131ec031354d7e4e8f28dd26ff7d856e94c7b0d2c02129c29c2ea40f059ad',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:41:53',	'2026-01-07 10:41:52.528296'),
(24,	26,	'::1',	1,	'89062eafe72cccfae67cf531881e726a487ed669c4b203c9ec2b626f74b3ea7ab65aa631fa79685a28f2d0ae149624a0c012d91d75f9ad7e4618eddbe8025b68',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 17:41:53',	'2026-01-07 10:41:52.529050'),
(25,	27,	'::1',	1,	'9d3ca783477e8bd577ecedb2cbbf2e5b78d0db745452a0ae6bdaaa287d0b7a5a07da8a5d510d8a5b64de527ee67fb4552ff9293b8f1a43cdaaab05e0514e13ef',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 17:50:04',	'2026-01-07 10:50:04.037531'),
(26,	26,	'::1',	0,	'373e4d3b0462ca7155885df36ff3b350773bcce59fde89991f4ad5f824af3889b40f6d46c9b9ed93f34802eb69ff4f67b708023dc46c10a5bd6d24aa76396718',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 18:01:04',	'2026-01-07 11:01:03.555187'),
(27,	26,	'::1',	1,	'b0d00013a72dc1e2992d1bb43f3faa3d93c89bced9d8206eb688f830298f096725b65c0745a7693a337c14a8755d3ce984a7416ae67520b6983c7f8b085b1f06',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 18:01:04',	'2026-01-07 11:01:03.558409'),
(28,	27,	'::1',	1,	'552c4b0dcd7e10dab093766f6cb23ec25604edc9ac9fa02600ed17767c73dd7140b4f187048c62dcd33f4b83831fee054dcc4c364a890d29098d5190e0abcb6b',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 18:06:13',	'2026-01-07 11:06:13.458066'),
(29,	26,	'::1',	1,	'7ca3231e3bef91e1b46c432185130f35806f0c6047554794b6ce37ec5ae86f005435ca758ee8407b699f46d7380edb9cd3b23567fa264894d75fbf3d73baae97',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 18:16:05',	'2026-01-07 11:16:05.352008'),
(30,	27,	'::1',	0,	'71b43b7dc7ecc674a8a7de3062f1b996af66091df52007a422bb495700eb67789f7a58a7dbd9153f386369e041754a41624b116b1bd43995bd1ec752fc39b253',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 18:23:20',	'2026-01-07 11:23:20.478606'),
(31,	27,	'::1',	1,	'0d498ae531a8a799984cb6932be4f9780ef871af01d10e08eab46bfd3fa2362a62d1d6f73c94844562597cb7e3b1f4182d6f218dd904ab4b9e0c53b714be7fff',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 18:23:20',	'2026-01-07 11:23:20.482683'),
(32,	26,	'::1',	1,	'67b17d1c7911f0f7d6b2e0322e05795180fab0dd19a8dab9708c9f562fab9f4c12bdd8b73109417172a13c05746a366c97df56c36dd5be933c90b2471ea64c16',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 18:56:54',	'2026-01-07 11:56:53.716064'),
(33,	27,	'::1',	1,	'5a283385ec2059a5a9de603fe0266a90de349b107c7ca0847aedac646d1a6302494a6faddd032faf4ada50a2b22f1356810885151b076ee805b95e56895f8810',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 18:56:54',	'2026-01-07 11:56:54.429305'),
(34,	27,	'::1',	1,	'8eac5c79d6c656aa2a6911270016b6530dc0c254cc910ae046fc14d3478600f356b147373f2afd80bcd06a8944e7a23981922195ef171a8b5fe69e6104cfdef4',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 19:12:19',	'2026-01-07 12:12:18.648744'),
(35,	26,	'::1',	0,	'34994388da0c989bd5d472c7f726071613eeb02dab9a00f7b28860a65d697de0a8ef9acd70b83520044946d4a581af1bbef20116533515cc578ab173d915764f',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 19:12:29',	'2026-01-07 12:12:29.366582'),
(36,	26,	'::1',	1,	'83dc381405353aaf61a2c9f20b53026211881aecb1eb9c7f254ac7f74fb5f456318947bf052c0dfa5de68484fb1192ab72f6346ddc476bcdbf94250922925a40',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 19:12:29',	'2026-01-07 12:12:29.368063'),
(37,	27,	'::ffff:127.0.0.1',	0,	'4a3e9e3fc664a6df84bca54dddd2342c42ccb2829ae845817ed94320756175a8a761641e5f77586d8f05ff275570e46763d05cd6c3edd38099640f304cf32191',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 19:27:24',	'2026-01-07 12:27:24.461060'),
(38,	27,	'::1',	1,	'79546386867899394570af4da68ca4ee0281e38b1e1b72e5433dfdaf7b544e94c111e4c762a2572382edf590a2b58c399e50d6d1bc24c615e2fa4f9a01caa9c4',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 19:27:24',	'2026-01-07 12:27:24.466743'),
(39,	26,	'::1',	1,	'4aa5c324baa676bcd0182355c98dbcfae46952587de8ced9bca6ac1fbfbc496403e0299c697f486e50cf60a422751ea0e3b623c97b6ecf95ec3908d1e04d5774',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 19:27:45',	'2026-01-07 12:27:44.520951'),
(40,	26,	'::1',	0,	'8842251e10c998bf70c3c41b5d8db482a6bd38a2d5821cfa2b5087aed037c587a4876d4fc14e7ceee08a22754ef1180d43fb45c733b323b716749792936ced99',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 19:43:57',	'2026-01-07 12:43:57.446482'),
(41,	26,	'::1',	1,	'33b266a3cad8d2de64bc9e193311902cb5c92ce0ad2bb75235ac3eb803f898aac7acc093b4ced24b818617fc4e13c74b83e3e5bcefab4dd90f66ccfe1ba2eebc',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 19:43:57',	'2026-01-07 12:43:57.449574'),
(42,	27,	'::1',	0,	'cb48e746630cb88de26c56fbea5fc30d920a50301e882be03791f87c6e4843cdf166119f359e5480bd366e734e857424d7829cde4ad9e4dc3d4c738ca7183682',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 19:43:58',	'2026-01-07 12:43:57.542153'),
(43,	27,	'::1',	0,	'dd7a1dbc571fcd5c0e70df12adbc378a4c875dda63b32617e67cb3aba2e7cc747b780fca1f1c493a0675e0d8c927bee3d0276420b41407d2c3c64722e4d8a8e4',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 19:43:58',	'2026-01-07 12:43:57.550494'),
(44,	27,	'::1',	0,	'28e6be4903d456f1cda8ad6fa7f2acee4c5a05960adcf74cf13337fb79b472cb2c773abeb5c24f0a4143b0874dc4b0c252dbdbe7bb8fb862466204ec17565860',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 19:43:58',	'2026-01-07 12:43:57.559261'),
(45,	27,	'::1',	1,	'82819f70c2b634c797461e4cf653b983c58b8c62d37f5944d47e234779466e82f4c1f3b590649fec674cffa60683ce283a9091e7a0d2bf923f5aeac38ad3df47',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 19:43:58',	'2026-01-07 12:43:57.562976'),
(46,	27,	'::1',	0,	'0853a74d7c8bfdac18917d5d7115df69291a5232e6fe8f3288153a1826e8d19528e7b1bacdf61db681b338583cbcfbc35859684acb03732e3b6249eba58632a6',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:03:36',	'2026-01-07 13:03:35.565911'),
(47,	27,	'::1',	0,	'6d053cf64ee03263da64c6d89f7177e5b301fd96318b619a4b041fde242b87b71e865d0886cf12c11e8b61be6041e9c09770895de810bcec7c77586457feb38f',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:03:36',	'2026-01-07 13:03:35.577733'),
(48,	27,	'::1',	1,	'5d51d52586e93808cc570d056a1370e090e1397f043246d4c5afdb0ec83fc99992ebbf81b1de4b9bd580be059ef9a809a1ae95863f72f5c31f9c98ce7145a742',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:03:36',	'2026-01-07 13:03:35.582948'),
(49,	26,	'::1',	0,	'63d8545137c725dc49cfc2c2428bd50a70ba8d61469007d89122d3166f0bc319f062a1f3b89ae361041e58138670d02729b39d84725d7d1bec3e1b51e8cad299',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:03:36',	'2026-01-07 13:03:35.820058'),
(50,	26,	'::1',	0,	'931dd63bddb41b7abda6118182ff6655b5491b08aba8d74b1216edb759d405d3d3b542bf4dcb417b3685baf609f2196a52b5b9c1e5be54059ed90ecbd2b1c16f',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:03:36',	'2026-01-07 13:03:35.830420'),
(51,	26,	'::1',	1,	'ee8497354397908f0c76408b682721f7500ebefa047348a2f0e3ee884380de40e52abe868834e0dccdec85911b40642d7f701cc33aeb80dd468058ee909790e9',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:03:36',	'2026-01-07 13:03:35.853535'),
(52,	27,	'::1',	0,	'6ab152e8790c20e5517cf14afefb5a7370b7b7e3ebdf13271129a0614fe14e89c8b0e45d7563f9e63cba1ad996c6aaecf88083747362c70deb56e50a49dc9046',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:20:38',	'2026-01-07 13:20:38.483582'),
(53,	27,	'::1',	0,	'7ea34ae6c90930078049fef086afdce2ba34d14416c6bbaeacc5c4f8c180ec78e9941d7a2da826114097ab0a28c6a6e55de60638b77f7518681e1a1314a55865',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:20:38',	'2026-01-07 13:20:38.485786'),
(54,	27,	'::1',	1,	'f7149b2054026f7b36725b980852136a8662905e09a300d05e0296d92175c4fc391cdd6929c5cc2f324a96ea8f2caaaf659f9fc41d358410ccfdb159695583be',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:20:38',	'2026-01-07 13:20:38.488681'),
(55,	27,	'::1',	0,	'c1ada84d2ed7fb697e050ac90442fb25ecef31422d68743d2befe04a17ebbe8cb94a81ef325ff94b029fe249c77d4d541e6e210a2d1cdfc804137a7f6514a284',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:20:38',	'2026-01-07 13:20:38.492907'),
(56,	26,	'::1',	0,	'd0019949ef69ca9ec4155f7167f8f22f690161ef1235a5a93ab6dfa9d5cc0e6ec4c23461d5c5badee95f877e334f436df905ca24630d2831ca460f70dfb874f2',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:21:12',	'2026-01-07 13:21:12.229664'),
(57,	26,	'::1',	1,	'8cd6d44b3185319a293e6fc74aa0820221cc13e41151aad032f5935615bac14c59f3a2b6ed87ff166066019bf40fbfe86c1bb1f3e68f1e23c93af7e0bf183c80',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:21:12',	'2026-01-07 13:21:12.235815'),
(58,	27,	'::1',	0,	'9e8656e7b513475a8204c39b0d11941ba3438120ebd47a73e60d205a16d01572b06cd0625f25f3401f2d9da009e17514c37b548081047c4a6ca389335723d88a',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:36:57',	'2026-01-07 13:36:57.344871'),
(59,	27,	'::1',	0,	'1e2937a967c09e588adcb07af900e87a3c5ce05a786c337c4bf565c2218d8ba3c42a0bff0d9c09b1533cc3b102f74bfe22aae1ffffa2fe42e9742d02aba2128f',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:36:57',	'2026-01-07 13:36:57.347301'),
(60,	27,	'::1',	1,	'1fbb67dd66b7653b1eda22299a15097b35c46ca25536bd10bc3add1f32e77460344442449ccf9652e18ac5da3e48cf3bf75ece93309b8ba0c9a1f3fcc3b5ceff',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:36:57',	'2026-01-07 13:36:57.361135'),
(61,	26,	'::1',	0,	'4a8bd3ab78e2ecc7f420d42707865caf92a2c80d281f94febb94b03c529c2016b7bfafae955260d93ce7ef2f1ab6ac354946647506dfb2c98eb8f169fe8f7c6a',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:37:07',	'2026-01-07 13:37:06.787100'),
(62,	26,	'::1',	1,	'12100293c8563281d72ab08a8a747221d6c56e0e25b7b8422f5eb4cfe65f4c7c5eeca825ba00fb29ab1087b2352242c195b223f5e624a19a1156e6567a0dbcdd',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:37:07',	'2026-01-07 13:37:06.798651'),
(63,	27,	'::1',	1,	'e26fb57c709111195b641109e17cb6f41d0559b70c900720ccf55c959eeebfa6d3e8a080e1021d70f1aa3af5dc29dab563ef86bbb5b2ecc05820d8344a77e972',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-14 20:52:03',	'2026-01-07 13:52:03.498367'),
(64,	26,	'::1',	0,	'c00895a4d9df6eb63e3dad1a91dbabc32d3d1b94684284c2f210dff77d6871ca716890b3835019531197cff9dce10aa6c71af75120c457d2d5a291d1eefd54b0',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:55:38',	'2026-01-07 13:55:37.696820'),
(65,	26,	'::1',	1,	'f2a85c05fd4064192a966267c0e7f71d47334b560d93ece2cf54e736d0b0f45ee3f05d91e5d0ce0477fed93c8dcbd28a6fea665780485c2e5ac87ac5f570b34e',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-14 20:55:38',	'2026-01-07 13:55:37.697999'),
(66,	27,	'::1',	0,	'a3bc8eca7d96a724851850c97fdba954384260205e69e002b99ac66639bff074c5c7bf90f7aa331d885bb67799171be2a331761145618f54960cf94f564a4bb1',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 10:01:08',	'2026-01-08 03:01:08.015114'),
(67,	27,	'::1',	0,	'b966677d4e8ad71820319a92d59748adff6c207dad94e4636d63021156e6e7775d1a9a26ee5255af8d7907099d52fac0150301d28517b7c0433c02bc90338ced',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 10:01:08',	'2026-01-08 03:01:08.028839'),
(68,	27,	'::1',	0,	'f0d94a1621acc1f4450a1111cbe99a4a5086f3fc79cd95845d1763c20ae064bdb527c94a354995cde1552e19418702129855235d86b1663e3772dc11826d88cf',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 10:01:08',	'2026-01-08 03:01:08.049012'),
(69,	27,	'::1',	0,	'15c01853aeab8fee49cd78ace8a623597f7885611f3f0326b53764d4ac0d20f5bbb17edfb4f3c18dd491a3c0098f30bf4a3c9792ccf97cd480519f737960cf52',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 10:01:08',	'2026-01-08 03:01:08.056121'),
(70,	27,	'::1',	1,	'b1c4c2df4ab338c7d3a3987bf964197e273af1806f283e6735207778b7133eb313264ffd82ad02b5889385fa40caff37c9af09f1b37cabac6eec793d9578700d',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 10:01:08',	'2026-01-08 03:01:08.078425'),
(71,	27,	'::1',	0,	'd5e98c23d35eae8282e8561c0632b71531e27c103cea473843d0f3fbd826a30af79ac08a9050193642c9e6857f2e3ce06cca0c365fed96ce9308c184bf7b7346',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 12:34:54',	'2026-01-08 05:34:54.097928'),
(72,	27,	'::1',	0,	'070ae37d26c75cfe77b2e215b0890cb5b9f8d78739434f4ab3bdd28dfac2a70a2e59016324642f6b2293c9183a3fc0a4d481652766be82b3bc428a6cfbfc96ae',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 12:34:54',	'2026-01-08 05:34:54.099736'),
(73,	27,	'::1',	0,	'7bfd9e7b47ed83b766b903990accebb3f61381b62a34899dca16213dc7121dec5855336c68e56feebe869b136520b2713cb21a345f742e424185d57df35bd4dd',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 12:34:54',	'2026-01-08 05:34:54.112263'),
(74,	27,	'::1',	0,	'69c87fcd409a0ee7db651a44094d8054efde7389257f5e0e7d6c57108184dd56e610230083ad5d1076f2623b51c5ebe8dd0c237fa59139a4fe7b69235e89b5e0',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 12:34:54',	'2026-01-08 05:34:54.123736'),
(75,	27,	'::1',	1,	'77d576adbf22555c5ac55b86afa459a684919f7d9600aae7604738c32c5575ba50d99f3a5516034966d14fd2b6510dbd3ad075361a8a6948f789817dc3b671e0',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 12:34:54',	'2026-01-08 05:34:54.137034'),
(76,	26,	'::1',	0,	'6d1b0f3e58c9f5ee8ba0e2313662b9b9cddb7e74315eea0cd3110cbcf21bda911b63ab8deed130e6ae21ccd2218bea2f5d5386525075b39ff6d78922e2752aae',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-15 12:42:42',	'2026-01-08 05:42:41.742728'),
(77,	26,	'::1',	0,	'5931dc27d9fc15c9d5d5107997dc42d65edb4ae302e338cd03705e1a8cd6db50a8246abee997faa25476effd8d103a889a9118bc04bbfc887f3e454302a0bc0a',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-15 12:42:42',	'2026-01-08 05:42:41.745002'),
(78,	27,	'::1',	1,	'99e4c8883c4e65881880f1636fa5cf4f2ae772e6dd36fb09bb48f24f397b2a4609df8e318c15bfcf26917a10a8ab14caddd2c411a2a34c21c0312ed180777685',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 12:49:56',	'2026-01-08 05:49:56.414539'),
(79,	27,	'::1',	0,	'fed2c007c1ef6498a7d55c6d7470be6567f6b54c9b9ef0de3b4f9684a4bde15b86e48fcb637aeff49ffea8b80fb19436760962c7a35a943993e1c038fabd32b3',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 14:40:37',	'2026-01-08 07:40:36.788805'),
(80,	26,	'::1',	0,	'fed65938efa25a6eb16409eb5c376716fbe56d485c63d46ed8a66c72d345be3ac69988945110de134d016624cf92c684a5f5aa6b27d0051e8be0db0a00832dfc',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 14:50:03',	'2026-01-08 07:50:02.695560'),
(81,	26,	'::1',	0,	'cc85d83fce5bde73a307e0a9fc4b087919b5984e82be5edae27d15e19582894bf4cbe6fef1491ca091c708025b5750acb2f144aa9f68bf3052df7304586812e6',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-15 15:08:02',	'2026-01-08 08:08:01.610922');

DROP TABLE IF EXISTS `submissions`;
CREATE TABLE `submissions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` int unsigned NOT NULL,
  `student_id` int unsigned NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `status` enum('submitted','graded','returned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted',
  `graded_at` timestamp NULL DEFAULT NULL,
  `graded_by` int unsigned DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `is_late` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_f043d0d459a667e9396e2a9086` (`assignment_id`,`student_id`),
  KEY `FK_435def3bbd4b4bbb9de1209cdae` (`student_id`),
  KEY `FK_7e45a1f4ca37da761e5ae72046e` (`graded_by`),
  CONSTRAINT `FK_435def3bbd4b4bbb9de1209cdae` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_7e45a1f4ca37da761e5ae72046e` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_8723840b9b0464206640c268abc` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `submissions` (`id`, `assignment_id`, `student_id`, `file_url`, `score`, `feedback`, `status`, `graded_at`, `graded_by`, `content`, `submitted_at`, `is_late`) VALUES
(1,	1,	10,	'/uploads/submissions/tcp_server_hme.zip',	95.00,	'Bài làm tốt! Code clean và xử lý lỗi tốt. Cần thêm comments.',	'graded',	'2026-01-07 08:00:45',	1,	'Source code TCP Echo Server',	'2026-01-07 08:00:45.000000',	0),
(2,	1,	11,	'/uploads/submissions/tcp_server_ntf.zip',	88.00,	'Hoạt động đúng yêu cầu. Multi-threading cần cải thiện.',	'graded',	'2026-01-07 08:00:45',	1,	'Source code TCP Echo Server',	'2026-01-07 08:00:45.000000',	0),
(3,	1,	12,	'/uploads/submissions/tcp_server_tvg.zip',	NULL,	NULL,	'submitted',	NULL,	NULL,	'Source code TCP Echo Server',	'2026-01-07 08:00:45.000000',	0),
(4,	1,	13,	'/uploads/submissions/tcp_server_lvh.zip',	92.00,	'Rất tốt! Xử lý concurrent connections tốt.',	'graded',	'2026-01-07 08:00:45',	1,	'Source code TCP Echo Server',	'2026-01-07 08:00:45.000000',	0),
(10,	20,	10,	'/uploads/submissions/er_diagram_hme.pdf',	90.00,	'ER Diagram rõ ràng, đầy đủ entities và relationships.',	'graded',	'2026-01-07 08:00:45',	2,	'ER Diagram PDF',	'2026-01-07 08:00:45.000000',	0),
(11,	20,	11,	'/uploads/submissions/er_diagram_ntf.pdf',	85.00,	'Tốt, nhưng thiếu một số ràng buộc.',	'graded',	'2026-01-07 08:00:45',	2,	'ER Diagram PDF',	'2026-01-07 08:00:45.000000',	0),
(20,	30,	20,	'/uploads/submissions/landing_nvl.zip',	NULL,	NULL,	'submitted',	NULL,	NULL,	'Landing Page source',	'2026-01-07 08:00:45.000000',	0),
(21,	30,	21,	'/uploads/submissions/landing_ttm.zip',	92.00,	'Design đẹp, responsive tốt!',	'graded',	'2026-01-07 08:00:45',	2,	'Landing Page source',	'2026-01-07 08:00:45.000000',	0),
(22,	52,	26,	NULL,	9.00,	'',	'graded',	'2026-01-07 21:03:57',	27,	'Submitted 1 file(s)',	'2026-01-07 10:04:06.795192',	0),
(23,	53,	26,	NULL,	7.00,	'oke',	'returned',	'2026-01-07 20:07:32',	27,	'Đã nộp 1 file: bienso1.jpg',	'2026-01-07 13:06:58.178529',	0),
(24,	54,	26,	'http://localhost:3000/uploads/1767792233661-662fa9ec4e563bd8.ipynb',	8.00,	'',	'graded',	'2026-01-07 20:25:04',	27,	'Đã nộp 1 file: Lab_Detect_BienSo_XeMay.ipynb',	'2026-01-07 13:23:53.761712',	0);

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('STUDENT','TEACHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STUDENT',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_verified` tinyint NOT NULL DEFAULT '0',
  `last_login` datetime DEFAULT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
  KEY `IDX_20c7aea6112bef71528210f631` (`is_active`),
  KEY `IDX_ace513fa30d485cfd25c11a9e4` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `users` (`id`, `email`, `role`, `is_active`, `password_hash`, `avatar_url`, `is_verified`, `last_login`, `full_name`, `created_at`, `updated_at`) VALUES
(1,	'nguyenvana@edu.vn',	'TEACHER',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'TS. Nguyễn Văn An',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(2,	'tranvanb@edu.vn',	'TEACHER',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'ThS. Trần Văn Bình',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(3,	'lethic@edu.vn',	'TEACHER',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'PGS.TS. Lê Thị Cúc',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(4,	'phamvand@edu.vn',	'TEACHER',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'ThS. Phạm Văn Dũng',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(10,	'hoangminhe@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Hoàng Minh Em',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(11,	'nguyenthif@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Nguyễn Thị Fang',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(12,	'tranvang@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Trần Văn Giáp',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(13,	'levanhung@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Lê Văn Hùng',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(14,	'phamthii@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Phạm Thị Inh',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(15,	'buivanj@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Bùi Văn Kiên',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(20,	'nguyenvanlam@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Nguyễn Văn Lâm',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(21,	'tranthimai@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Trần Thị Mai',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(22,	'levannam@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Lê Văn Nam',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(23,	'phamvanoanh@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Phạm Văn Oanh',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(24,	'buithiphuong@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Bùi Thị Phương',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(25,	'dovanquan@student.edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	1,	NULL,	'Đỗ Văn Quân',	'2026-01-07 08:00:45.000000',	'2026-01-07 08:00:45.000000'),
(26,	'lehuynhhuyhoang05@gmail.com',	'STUDENT',	1,	'$2a$12$/OGaQskR2tIozd4u3FIRPeYI77io683./8kcnLxjVDSKc3w0pmgFG',	NULL,	1,	'2026-01-08 15:08:02',	'hoàng lê',	'2026-01-07 08:15:01.772963',	'2026-01-08 08:08:01.000000'),
(27,	'hoanglhh0026@ut.edu.vn',	'TEACHER',	1,	'$2b$10$jog3s0XYNth/iPYkTB8jeukwbHCpL92dyFsFSy6FW4ntDOZnthWo2',	NULL,	0,	NULL,	'Nguyễn B',	'2026-01-07 08:44:40.079357',	'2026-01-07 08:44:40.079357');

DROP VIEW IF EXISTS `view_class_dashboard`;
CREATE TABLE `view_class_dashboard` ();


DROP VIEW IF EXISTS `view_class_stats`;
CREATE TABLE `view_class_stats` (`id` int unsigned, `name` varchar(255), `class_code` varchar(6), `teacher_name` varchar(100), `total_students` bigint, `total_assignments` bigint, `total_live_sessions` bigint);


DROP VIEW IF EXISTS `view_pending_grading`;
CREATE TABLE `view_pending_grading` ();


DROP VIEW IF EXISTS `view_session_activity`;
CREATE TABLE `view_session_activity` (`session_id` int unsigned, `room_id` char(36), `title` varchar(255), `class_name` varchar(255), `host_name` varchar(100), `status` enum('scheduled','live','ended'), `scheduled_at` timestamp, `started_at` timestamp, `current_participants` smallint unsigned, `max_participants` smallint unsigned, `total_joined` bigint, `avg_duration_minutes` decimal(21,0));


DROP VIEW IF EXISTS `view_student_analytics`;
CREATE TABLE `view_student_analytics` (`student_id` int unsigned, `student_name` varchar(100), `email` varchar(255), `class_id` int unsigned, `class_name` varchar(255), `total_assignments` bigint, `submitted_count` bigint, `average_score` decimal(6,2), `late_submissions` bigint, `last_submission_date` datetime(6));


DROP VIEW IF EXISTS `view_student_progress`;
CREATE TABLE `view_student_progress` (`student_id` int unsigned, `student_name` varchar(100), `class_id` int unsigned, `class_name` varchar(255), `total_assignments` bigint, `submitted_count` bigint, `average_score` decimal(9,6));


DROP TABLE IF EXISTS `whiteboard_sessions`;
CREATE TABLE `whiteboard_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `live_session_id` int unsigned NOT NULL,
  `canvas_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JSON drawing actions',
  `created_by` int unsigned NOT NULL,
  `snapshot_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version` int unsigned NOT NULL DEFAULT '1' COMMENT 'Version control',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Latest version flag',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_whiteboard_session_active` (`live_session_id`,`is_active`,`version` DESC),
  CONSTRAINT `whiteboard_sessions_ibfk_1` FOREIGN KEY (`live_session_id`) REFERENCES `live_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `whiteboard_sessions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=COMPRESSED;


DROP TABLE IF EXISTS `whiteboard_strokes`;
CREATE TABLE `whiteboard_strokes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `room_id` varchar(100) NOT NULL,
  `room_type` varchar(20) NOT NULL,
  `user_id` int unsigned NOT NULL,
  `stroke_id` varchar(50) NOT NULL,
  `tool` enum('pen','highlighter','eraser','line','rectangle','ellipse','text','arrow') NOT NULL DEFAULT 'pen',
  `path` json NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT '#000000',
  `stroke_width` float NOT NULL DEFAULT '2',
  `opacity` float NOT NULL DEFAULT '1',
  `text_content` text,
  `font_size` int DEFAULT NULL,
  `font_family` varchar(100) DEFAULT NULL,
  `start_x` float DEFAULT NULL,
  `start_y` float DEFAULT NULL,
  `end_x` float DEFAULT NULL,
  `end_y` float DEFAULT NULL,
  `is_deleted` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_888a879cbb04894569f4891632` (`room_id`,`room_type`),
  KEY `FK_ef3e1c4e29f6f3280bbf0861f52` (`user_id`),
  CONSTRAINT `FK_ef3e1c4e29f6f3280bbf0861f52` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `view_class_dashboard`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `view_class_dashboard` AS select `c`.`id` AS `id`,`c`.`class_code` AS `class_code`,`c`.`name` AS `name`,`c`.`subject` AS `subject`,`u`.`full_name` AS `teacher_name`,`c`.`student_count` AS `student_count`,count(distinct `a`.`id`) AS `total_assignments`,count(distinct `m`.`id`) AS `total_materials`,count(distinct `ls`.`id`) AS `total_live_sessions`,count(distinct (case when (`ls`.`status` = 'live') then `ls`.`id` end)) AS `active_sessions`,`c`.`created_at` AS `created_at`,`c`.`is_active` AS `is_active` from ((((`classes` `c` left join `users` `u` on((`c`.`teacher_id` = `u`.`id`))) left join `assignments` `a` on((`c`.`id` = `a`.`class_id`))) left join `materials` `m` on((`c`.`id` = `m`.`class_id`))) left join `live_sessions` `ls` on((`c`.`id` = `ls`.`class_id`))) group by `c`.`id`;

DROP TABLE IF EXISTS `view_class_stats`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `view_class_stats` AS select `c`.`id` AS `id`,`c`.`name` AS `name`,`c`.`class_code` AS `class_code`,`u`.`full_name` AS `teacher_name`,count(distinct `cm`.`user_id`) AS `total_students`,count(distinct `a`.`id`) AS `total_assignments`,count(distinct `ls`.`id`) AS `total_live_sessions` from ((((`classes` `c` left join `users` `u` on((`c`.`teacher_id` = `u`.`id`))) left join `class_members` `cm` on(((`c`.`id` = `cm`.`class_id`) and (`cm`.`role` = 'student')))) left join `assignments` `a` on((`c`.`id` = `a`.`class_id`))) left join `live_sessions` `ls` on((`c`.`id` = `ls`.`class_id`))) group by `c`.`id`;

DROP TABLE IF EXISTS `view_pending_grading`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `view_pending_grading` AS select `s`.`id` AS `submission_id`,`a`.`title` AS `assignment_title`,`c`.`name` AS `class_name`,`u`.`full_name` AS `student_name`,`s`.`submitted_at` AS `submitted_at`,timestampdiff(HOUR,`s`.`submitted_at`,now()) AS `hours_waiting`,`s`.`file_name` AS `file_name`,`a`.`max_score` AS `max_score` from (((`submissions` `s` join `assignments` `a` on((`s`.`assignment_id` = `a`.`id`))) join `classes` `c` on((`a`.`class_id` = `c`.`id`))) join `users` `u` on((`s`.`student_id` = `u`.`id`))) where ((`s`.`status` in ('submitted','late')) and (`s`.`graded_at` is null)) order by `s`.`submitted_at`;

DROP TABLE IF EXISTS `view_session_activity`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `view_session_activity` AS select `ls`.`id` AS `session_id`,`ls`.`room_id` AS `room_id`,`ls`.`title` AS `title`,`c`.`name` AS `class_name`,`u`.`full_name` AS `host_name`,`ls`.`status` AS `status`,`ls`.`scheduled_at` AS `scheduled_at`,`ls`.`started_at` AS `started_at`,`ls`.`current_participants` AS `current_participants`,`ls`.`max_participants` AS `max_participants`,count(distinct `lsp`.`user_id`) AS `total_joined`,round(avg(timestampdiff(MINUTE,`lsp`.`joined_at`,coalesce(`lsp`.`left_at`,now()))),0) AS `avg_duration_minutes` from (((`live_sessions` `ls` join `classes` `c` on((`ls`.`class_id` = `c`.`id`))) join `users` `u` on((`ls`.`host_id` = `u`.`id`))) left join `live_sessions_participants` `lsp` on((`ls`.`id` = `lsp`.`live_session_id`))) group by `ls`.`id`;

DROP TABLE IF EXISTS `view_student_analytics`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `view_student_analytics` AS select `u`.`id` AS `student_id`,`u`.`full_name` AS `student_name`,`u`.`email` AS `email`,`c`.`id` AS `class_id`,`c`.`name` AS `class_name`,count(distinct `a`.`id`) AS `total_assignments`,count(distinct `s`.`id`) AS `submitted_count`,round(avg(`s`.`score`),2) AS `average_score`,count(distinct (case when (`s`.`status` = 'late') then `s`.`id` end)) AS `late_submissions`,max(`s`.`submitted_at`) AS `last_submission_date` from ((((`users` `u` join `class_members` `cm` on(((`u`.`id` = `cm`.`user_id`) and (`cm`.`role` = 'student')))) join `classes` `c` on((`cm`.`class_id` = `c`.`id`))) left join `assignments` `a` on((`c`.`id` = `a`.`class_id`))) left join `submissions` `s` on(((`a`.`id` = `s`.`assignment_id`) and (`u`.`id` = `s`.`student_id`)))) where (`u`.`is_active` = true) group by `u`.`id`,`c`.`id`;

DROP TABLE IF EXISTS `view_student_progress`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `view_student_progress` AS select `u`.`id` AS `student_id`,`u`.`full_name` AS `student_name`,`c`.`id` AS `class_id`,`c`.`name` AS `class_name`,count(distinct `a`.`id`) AS `total_assignments`,count(distinct `s`.`id`) AS `submitted_count`,avg(`s`.`score`) AS `average_score` from ((((`users` `u` join `class_members` `cm` on(((`u`.`id` = `cm`.`user_id`) and (`cm`.`role` = 'student')))) join `classes` `c` on((`cm`.`class_id` = `c`.`id`))) left join `assignments` `a` on((`c`.`id` = `a`.`class_id`))) left join `submissions` `s` on(((`a`.`id` = `s`.`assignment_id`) and (`u`.`id` = `s`.`student_id`)))) group by `u`.`id`,`c`.`id`;

-- 2026-01-09 05:55:22 UTC