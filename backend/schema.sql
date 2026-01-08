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
(1,	1,	'Socket Programming',	'Build TCP chat client-server',	'2025-02-15 23:59:59',	NULL,	100.00,	1,	2,	'2026-01-03 03:00:42.913898',	'2026-01-03 03:00:42.949394',	1),
(2,	1,	'WebRTC Project',	'P2P video call app',	'2025-03-01 23:59:59',	NULL,	100.00,	1,	0,	'2026-01-03 03:00:42.913898',	'2026-01-03 03:00:42.949394',	1),
(3,	7,	'Manual Test',	'Test',	'2026-01-10 10:00:00',	NULL,	100.00,	9,	0,	'2026-01-03 03:00:42.913898',	'2026-01-03 03:00:42.949394',	1),
(4,	9,	'Test Assignment',	'Test description',	'2026-01-10 10:02:25',	NULL,	100.00,	9,	0,	'2026-01-03 03:02:24.727922',	'2026-01-03 03:02:24.727922',	1),
(5,	10,	'Test Assignment 10:02:31',	'Complete the exercises 1-10',	'2026-01-10 10:02:31',	NULL,	100.00,	9,	1,	'2026-01-03 03:02:31.324193',	'2026-01-03 03:02:31.000000',	1);

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
(1,	'24',	'class',	9,	'Hello class! Welcome to the chat. (edited)',	'text',	NULL,	NULL,	1,	0,	'2026-01-03 03:35:13.625973',	'2026-01-03 03:35:14.000000'),
(2,	'24',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 03:35:13.650549',	'2026-01-03 03:35:14.000000'),
(3,	'24',	'class',	9,	'Thanks for joining!',	'text',	NULL,	2,	0,	0,	'2026-01-03 03:35:13.675322',	'2026-01-03 03:35:13.675322'),
(4,	'24',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 03:35:14.133422',	'2026-01-03 03:35:14.000000'),
(5,	'24',	'class',	9,	'Check out this image!',	'image',	'https://example.com/image.jpg',	NULL,	0,	0,	'2026-01-03 03:35:14.232503',	'2026-01-03 03:35:14.232503'),
(6,	'24',	'class',	9,	'Here\'s the assignment document',	'file',	'https://example.com/doc.pdf',	NULL,	0,	0,	'2026-01-03 03:35:14.258952',	'2026-01-03 03:35:14.258952'),
(7,	'25',	'class',	9,	'Hello class! Welcome to the chat. (edited)',	'text',	NULL,	NULL,	1,	0,	'2026-01-03 03:36:17.702815',	'2026-01-03 03:36:18.000000'),
(8,	'25',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 03:36:17.730240',	'2026-01-03 03:36:18.000000'),
(9,	'25',	'class',	9,	'Thanks for joining!',	'text',	NULL,	8,	0,	0,	'2026-01-03 03:36:17.758018',	'2026-01-03 03:36:17.758018'),
(10,	'25',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 03:36:18.204736',	'2026-01-03 03:36:18.000000'),
(11,	'25',	'class',	9,	'Check out this image!',	'image',	'https://example.com/image.jpg',	NULL,	0,	0,	'2026-01-03 03:36:18.294492',	'2026-01-03 03:36:18.294492'),
(12,	'25',	'class',	9,	'Here\'s the assignment document',	'file',	'https://example.com/doc.pdf',	NULL,	0,	0,	'2026-01-03 03:36:18.318397',	'2026-01-03 03:36:18.318397'),
(13,	'26',	'class',	9,	'Hello class! Welcome to the chat. (edited)',	'text',	NULL,	NULL,	1,	0,	'2026-01-03 03:52:51.450782',	'2026-01-03 03:52:51.000000'),
(14,	'26',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 03:52:51.477850',	'2026-01-03 03:52:51.000000'),
(15,	'26',	'class',	9,	'Thanks for joining!',	'text',	NULL,	14,	0,	0,	'2026-01-03 03:52:51.505453',	'2026-01-03 03:52:51.505453'),
(16,	'26',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 03:52:51.930566',	'2026-01-03 03:52:51.000000'),
(17,	'26',	'class',	9,	'Check out this image!',	'image',	'https://example.com/image.jpg',	NULL,	0,	0,	'2026-01-03 03:52:52.028032',	'2026-01-03 03:52:52.028032'),
(18,	'26',	'class',	9,	'Here\'s the assignment document',	'file',	'https://example.com/doc.pdf',	NULL,	0,	0,	'2026-01-03 03:52:52.055218',	'2026-01-03 03:52:52.055218'),
(19,	'27',	'class',	9,	'Hello class! Welcome to the chat. (edited)',	'text',	NULL,	NULL,	1,	0,	'2026-01-03 03:53:46.990623',	'2026-01-03 03:53:47.000000'),
(20,	'27',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 03:53:47.015628',	'2026-01-03 03:53:47.000000'),
(21,	'27',	'class',	9,	'Thanks for joining!',	'text',	NULL,	20,	0,	0,	'2026-01-03 03:53:47.041883',	'2026-01-03 03:53:47.041883'),
(22,	'27',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 03:53:47.456375',	'2026-01-03 03:53:47.000000'),
(23,	'27',	'class',	9,	'Check out this image!',	'image',	'https://example.com/image.jpg',	NULL,	0,	0,	'2026-01-03 03:53:47.567295',	'2026-01-03 03:53:47.567295'),
(24,	'27',	'class',	9,	'Here\'s the assignment document',	'file',	'https://example.com/doc.pdf',	NULL,	0,	0,	'2026-01-03 03:53:47.591762',	'2026-01-03 03:53:47.591762'),
(25,	'34',	'class',	9,	'Hello class! Welcome to the chat. (edited)',	'text',	NULL,	NULL,	1,	0,	'2026-01-03 04:01:51.276813',	'2026-01-03 04:01:51.000000'),
(26,	'34',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 04:01:51.302572',	'2026-01-03 04:01:51.000000'),
(27,	'34',	'class',	9,	'Thanks for joining!',	'text',	NULL,	26,	0,	0,	'2026-01-03 04:01:51.330716',	'2026-01-03 04:01:51.330716'),
(28,	'34',	'class',	10,	'[Tin nhắn đã bị xóa]',	'text',	NULL,	NULL,	0,	1,	'2026-01-03 04:01:51.753398',	'2026-01-03 04:01:51.000000'),
(29,	'34',	'class',	9,	'Check out this image!',	'image',	'https://example.com/image.jpg',	NULL,	0,	0,	'2026-01-03 04:01:51.861446',	'2026-01-03 04:01:51.861446'),
(30,	'34',	'class',	9,	'Here\'s the assignment document',	'file',	'https://example.com/doc.pdf',	NULL,	0,	0,	'2026-01-03 04:01:51.889186',	'2026-01-03 04:01:51.889186');

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
(1,	1,	1,	'TEACHER',	'2026-01-01 15:50:02.882846'),
(2,	1,	3,	'STUDENT',	'2026-01-01 15:50:02.882846'),
(3,	1,	4,	'STUDENT',	'2026-01-01 15:50:02.882846'),
(4,	1,	5,	'STUDENT',	'2026-01-01 15:50:02.882846'),
(5,	2,	2,	'TEACHER',	'2026-01-01 15:50:02.882846'),
(6,	2,	3,	'STUDENT',	'2026-01-01 15:50:02.882846'),
(7,	3,	7,	'TEACHER',	'2026-01-01 15:57:14.757077'),
(10,	4,	9,	'TEACHER',	'2026-01-03 02:48:28.249566'),
(11,	4,	10,	'STUDENT',	'2026-01-03 02:48:28.282194'),
(12,	5,	9,	'TEACHER',	'2026-01-03 02:50:51.411122'),
(13,	5,	10,	'STUDENT',	'2026-01-03 02:50:51.440476'),
(14,	6,	9,	'TEACHER',	'2026-01-03 02:51:25.766518'),
(15,	6,	10,	'STUDENT',	'2026-01-03 02:51:25.812709'),
(16,	7,	9,	'TEACHER',	'2026-01-03 02:52:15.548656'),
(17,	7,	10,	'STUDENT',	'2026-01-03 02:52:15.591453'),
(18,	8,	9,	'TEACHER',	'2026-01-03 02:53:48.023037'),
(19,	8,	10,	'STUDENT',	'2026-01-03 02:53:48.071496'),
(20,	9,	9,	'TEACHER',	'2026-01-03 02:57:30.946179'),
(21,	10,	9,	'TEACHER',	'2026-01-03 03:02:31.272677'),
(22,	10,	10,	'STUDENT',	'2026-01-03 03:02:31.301268'),
(23,	11,	9,	'TEACHER',	'2026-01-03 03:16:18.242784'),
(24,	11,	10,	'STUDENT',	'2026-01-03 03:16:18.271158'),
(25,	12,	9,	'TEACHER',	'2026-01-03 03:18:57.149623'),
(26,	12,	10,	'STUDENT',	'2026-01-03 03:18:57.177791'),
(27,	13,	9,	'TEACHER',	'2026-01-03 03:18:57.260586'),
(28,	12,	12,	'STUDENT',	'2026-01-03 03:18:58.031643'),
(29,	14,	9,	'TEACHER',	'2026-01-03 03:22:51.822342'),
(30,	14,	10,	'STUDENT',	'2026-01-03 03:22:51.851423'),
(31,	15,	9,	'TEACHER',	'2026-01-03 03:22:51.921940'),
(32,	14,	14,	'STUDENT',	'2026-01-03 03:22:52.920207'),
(33,	16,	9,	'TEACHER',	'2026-01-03 03:24:27.447009'),
(34,	16,	10,	'STUDENT',	'2026-01-03 03:24:27.469778'),
(35,	17,	9,	'TEACHER',	'2026-01-03 03:24:27.533179'),
(36,	16,	16,	'STUDENT',	'2026-01-03 03:24:28.373517'),
(37,	18,	9,	'TEACHER',	'2026-01-03 03:25:52.473791'),
(38,	18,	10,	'STUDENT',	'2026-01-03 03:25:52.507525'),
(39,	19,	9,	'TEACHER',	'2026-01-03 03:25:52.616790'),
(40,	18,	18,	'STUDENT',	'2026-01-03 03:25:53.783511'),
(41,	20,	9,	'TEACHER',	'2026-01-03 03:26:00.389096'),
(42,	20,	10,	'STUDENT',	'2026-01-03 03:26:00.423510'),
(43,	21,	9,	'TEACHER',	'2026-01-03 03:26:00.536900'),
(44,	20,	20,	'STUDENT',	'2026-01-03 03:26:01.478524'),
(45,	22,	9,	'TEACHER',	'2026-01-03 03:26:52.625163'),
(46,	22,	10,	'STUDENT',	'2026-01-03 03:26:52.653415'),
(47,	23,	9,	'TEACHER',	'2026-01-03 03:26:52.753155'),
(48,	22,	22,	'STUDENT',	'2026-01-03 03:26:53.747135'),
(49,	24,	9,	'TEACHER',	'2026-01-03 03:35:13.448824'),
(50,	24,	10,	'STUDENT',	'2026-01-03 03:35:13.487158'),
(51,	25,	9,	'TEACHER',	'2026-01-03 03:36:17.528357'),
(52,	25,	10,	'STUDENT',	'2026-01-03 03:36:17.568741'),
(53,	26,	9,	'TEACHER',	'2026-01-03 03:52:51.287547'),
(54,	26,	10,	'STUDENT',	'2026-01-03 03:52:51.315371'),
(55,	27,	9,	'TEACHER',	'2026-01-03 03:53:46.822195'),
(56,	27,	10,	'STUDENT',	'2026-01-03 03:53:46.848491'),
(57,	28,	9,	'TEACHER',	'2026-01-03 03:53:54.233669'),
(58,	28,	10,	'STUDENT',	'2026-01-03 03:53:54.259758'),
(59,	29,	9,	'TEACHER',	'2026-01-03 03:53:54.329084'),
(60,	28,	28,	'STUDENT',	'2026-01-03 03:53:55.316586'),
(61,	30,	9,	'TEACHER',	'2026-01-03 03:57:51.714790'),
(62,	30,	10,	'STUDENT',	'2026-01-03 03:57:51.743720'),
(63,	31,	9,	'TEACHER',	'2026-01-03 03:57:51.822119'),
(64,	30,	30,	'STUDENT',	'2026-01-03 03:57:52.833661'),
(65,	32,	9,	'TEACHER',	'2026-01-03 03:59:22.432838'),
(66,	32,	10,	'STUDENT',	'2026-01-03 03:59:22.497961'),
(67,	33,	9,	'TEACHER',	'2026-01-03 03:59:22.687027'),
(68,	32,	32,	'STUDENT',	'2026-01-03 03:59:24.324139'),
(69,	34,	9,	'TEACHER',	'2026-01-03 04:01:51.102175'),
(70,	34,	10,	'STUDENT',	'2026-01-03 04:01:51.127121');

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
(1,	'Lập Trình Mạng - K19',	'Socket, WebRTC, WebSocket real-time communication',	'Computer Science',	1,	1,	0,	'CLS1',	'2026-01-01 15:54:58.385698',	'2026-01-01 15:54:58.442590'),
(2,	'Cơ Sở Dữ Liệu - K19',	'MySQL optimization, indexing strategies',	'Database',	2,	1,	0,	'CLS2',	'2026-01-01 15:54:58.385698',	'2026-01-01 15:54:58.442590'),
(3,	'Lap Trinh Web K20 - Updated',	'React, NestJS, TypeORM',	'Web Development',	7,	0,	1,	'MOL6ZZ',	'2026-01-01 15:57:14.746568',	'2026-01-01 16:09:30.000000'),
(4,	'Test Class for Assignments',	'Class for testing assignments module',	'Testing',	9,	1,	2,	'YCQA86',	'2026-01-03 02:48:28.245280',	'2026-01-03 02:48:28.000000'),
(5,	'Test Class for Assignments',	'Class for testing assignments module',	'Testing',	9,	1,	2,	'GWYFZ0',	'2026-01-03 02:50:51.406004',	'2026-01-03 02:50:51.000000'),
(6,	'Test Class for Assignments',	'Class for testing assignments module',	'Testing',	9,	1,	2,	'JXX2XM',	'2026-01-03 02:51:25.759384',	'2026-01-03 02:51:25.000000'),
(7,	'Test Class for Assignments',	'Class for testing assignments module',	'Testing',	9,	1,	2,	'E9G7D9',	'2026-01-03 02:52:15.540904',	'2026-01-03 02:52:15.000000'),
(8,	'Test Class for Assignments',	'Class for testing assignments module',	'Testing',	9,	1,	2,	'K7JUJZ',	'2026-01-03 02:53:48.010852',	'2026-01-03 02:53:48.000000'),
(9,	'Test Assignment Class',	'For testing',	'Testing',	9,	1,	1,	'2VYXOU',	'2026-01-03 02:57:30.941940',	'2026-01-03 02:57:30.941940'),
(10,	'Test Class for Assignments',	'Class for testing assignments module',	'Testing',	9,	1,	2,	'HN0Y3J',	'2026-01-03 03:02:31.268752',	'2026-01-03 03:02:31.000000'),
(11,	'Live Session Test Class',	'Testing live sessions',	'Testing',	9,	1,	2,	'0GSNJ2',	'2026-01-03 03:16:18.237937',	'2026-01-03 03:16:18.000000'),
(12,	'Session Test Class 563199370',	'Testing',	'Test',	9,	1,	3,	'DAACF7',	'2026-01-03 03:18:57.146265',	'2026-01-03 03:18:58.000000'),
(13,	'Other Class',	'Test',	'Test',	9,	1,	1,	'7P0HDX',	'2026-01-03 03:18:57.256724',	'2026-01-03 03:18:57.256724'),
(14,	'Session Test Class 990009653',	'Testing',	'Test',	9,	1,	3,	'L0VT0R',	'2026-01-03 03:22:51.818236',	'2026-01-03 03:22:52.000000'),
(15,	'Other Class',	'Test',	'Test',	9,	1,	1,	'MBD3SQ',	'2026-01-03 03:22:51.918050',	'2026-01-03 03:22:51.918050'),
(16,	'Session Test Class 676341840',	'Testing',	'Test',	9,	1,	3,	'OFE8GG',	'2026-01-03 03:24:27.443439',	'2026-01-03 03:24:28.000000'),
(17,	'Other Class',	'Test',	'Test',	9,	1,	1,	'E3HTOI',	'2026-01-03 03:24:27.528280',	'2026-01-03 03:24:27.528280'),
(18,	'Session Test Class 31851310',	'Testing',	'Test',	9,	1,	3,	'UM0QW8',	'2026-01-03 03:25:52.468021',	'2026-01-03 03:25:53.000000'),
(19,	'Other Class',	'Test',	'Test',	9,	1,	1,	'DQ6UNN',	'2026-01-03 03:25:52.611209',	'2026-01-03 03:25:52.611209'),
(20,	'Session Test Class 1380113055',	'Testing',	'Test',	9,	1,	3,	'CLYQAH',	'2026-01-03 03:26:00.384068',	'2026-01-03 03:26:01.000000'),
(21,	'Other Class',	'Test',	'Test',	9,	1,	1,	'QWXZCO',	'2026-01-03 03:26:00.532340',	'2026-01-03 03:26:00.532340'),
(22,	'Session Test Class 1615953645',	'Testing',	'Test',	9,	1,	3,	'VM8JEY',	'2026-01-03 03:26:52.621400',	'2026-01-03 03:26:53.000000'),
(23,	'Other Class',	'Test',	'Test',	9,	1,	1,	'R3T9I3',	'2026-01-03 03:26:52.750002',	'2026-01-03 03:26:52.750002'),
(24,	'Chat Test Class 864969867',	'Testing Chat',	'Test',	9,	1,	2,	'3LE9BL',	'2026-01-03 03:35:13.441261',	'2026-01-03 03:35:13.000000'),
(25,	'Chat Test Class 2100829127',	'Testing Chat',	'Test',	9,	1,	2,	'E6TO34',	'2026-01-03 03:36:17.523034',	'2026-01-03 03:36:17.000000'),
(26,	'Chat Test Class 2009178237',	'Testing Chat',	'Test',	9,	1,	2,	'NFSEYG',	'2026-01-03 03:52:51.283157',	'2026-01-03 03:52:51.000000'),
(27,	'Chat Test Class 2098927144',	'Testing Chat',	'Test',	9,	1,	2,	'Q1O7OE',	'2026-01-03 03:53:46.818537',	'2026-01-03 03:53:46.000000'),
(28,	'Session Test Class 429479904',	'Testing',	'Test',	9,	1,	3,	'LQCP0Y',	'2026-01-03 03:53:54.228931',	'2026-01-03 03:53:55.000000'),
(29,	'Other Class',	'Test',	'Test',	9,	1,	1,	'L19JCN',	'2026-01-03 03:53:54.325799',	'2026-01-03 03:53:54.325799'),
(30,	'Session Test Class 597444070',	'Testing',	'Test',	9,	1,	3,	'6YFERM',	'2026-01-03 03:57:51.711257',	'2026-01-03 03:57:52.000000'),
(31,	'Other Class',	'Test',	'Test',	9,	1,	1,	'9VL8UE',	'2026-01-03 03:57:51.818583',	'2026-01-03 03:57:51.818583'),
(32,	'Session Test Class 1943277327',	'Testing',	'Test',	9,	1,	3,	'MJRJCA',	'2026-01-03 03:59:22.422252',	'2026-01-03 03:59:24.000000'),
(33,	'Other Class',	'Test',	'Test',	9,	1,	1,	'244919',	'2026-01-03 03:59:22.677741',	'2026-01-03 03:59:22.677741'),
(34,	'Chat Test Class 1602419858',	'Testing Chat',	'Test',	9,	1,	2,	'ZBDXWA',	'2026-01-03 04:01:51.099102',	'2026-01-03 04:01:51.000000');

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
(2,	'test.txt',	'1767285033657-a96a7d8623542075.txt',	'/uploads/1767285033657-a96a7d8623542075.txt',	'text/plain',	28,	7,	'2026-01-01 16:30:33.662983');

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
(1,	1,	'01d3fecc-e58a-11f0-b9e1-ee9e5a6486e0',	'WebRTC Demo - Week 7',	NULL,	1,	'scheduled',	'2025-01-15 14:00:00',	NULL,	NULL,	50,	0,	NULL,	NULL,	'2026-01-03 03:15:03.695040',	'2026-01-03 03:15:03.737321'),
(2,	11,	'5de20af9-605b-41eb-8e47-bb89056d7939',	'Updated Live Session Title',	'Testing WebRTC signaling',	9,	'ended',	'2026-01-03 11:16:18',	'2026-01-03 10:16:18',	'2026-01-03 10:16:18',	50,	0,	NULL,	0,	'2026-01-03 03:16:18.301683',	'2026-01-03 03:16:18.000000'),
(4,	12,	'139eb8da-4831-455c-870b-ae73a392dc19',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:18:58',	'2026-01-03 10:24:22',	20,	0,	NULL,	323,	'2026-01-03 03:18:57.479950',	'2026-01-03 03:24:21.000000'),
(5,	14,	'63e3ff6d-0ce8-4b65-939c-a345361f165e',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:22:52',	'2026-01-03 10:22:52',	20,	0,	NULL,	0,	'2026-01-03 03:22:52.140597',	'2026-01-03 03:22:52.000000'),
(6,	14,	'80308122-d2ae-4b8b-9ba2-319fcf6de96a',	'Delete Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:22:52',	'2026-01-03 10:22:52',	20,	0,	NULL,	0,	'2026-01-03 03:22:52.397634',	'2026-01-03 03:22:52.000000'),
(7,	14,	'2ac10ec5-78a8-4d55-8451-077d00bad5a2',	'Kick Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:22:52',	'2026-01-03 10:22:53',	20,	0,	NULL,	0,	'2026-01-03 03:22:52.478797',	'2026-01-03 03:22:52.000000'),
(8,	14,	'ee6837b3-1e0f-4d3e-a501-0800c5086edd',	'Small Capacity Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:22:53',	'2026-01-03 10:24:07',	2,	0,	NULL,	73,	'2026-01-03 03:22:52.631655',	'2026-01-03 03:24:06.000000'),
(9,	16,	'985f7a1f-2889-418b-b6bc-64828e41c680',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:24:28',	'2026-01-03 10:24:42',	20,	0,	NULL,	13,	'2026-01-03 03:24:27.743980',	'2026-01-03 03:24:41.000000'),
(11,	16,	'2b30d531-60db-4a03-b1e6-ad971feb3f4b',	'Kick Test Session',	NULL,	9,	'scheduled',	NULL,	NULL,	NULL,	20,	0,	NULL,	NULL,	'2026-01-03 03:24:28.049991',	'2026-01-03 03:24:28.049991'),
(12,	16,	'ee8353a7-8339-488e-8d10-8676c937f50a',	'Small Capacity Session',	NULL,	9,	'scheduled',	NULL,	NULL,	NULL,	2,	0,	NULL,	NULL,	'2026-01-03 03:24:28.137416',	'2026-01-03 03:24:28.137416'),
(13,	18,	'a4eee390-96a0-4a70-a96c-15db4a5c577b',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:25:53',	'2026-01-03 10:25:53',	20,	0,	NULL,	0,	'2026-01-03 03:25:52.854856',	'2026-01-03 03:25:53.000000'),
(14,	18,	'8eb00910-0a12-47a0-9435-fffda9c7c033',	'Delete Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:25:53',	'2026-01-03 10:25:53',	20,	0,	NULL,	0,	'2026-01-03 03:25:53.219828',	'2026-01-03 03:25:53.000000'),
(15,	18,	'9e0b356c-1236-4dbb-ae01-55428e5a4e37',	'Kick Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:25:53',	'2026-01-03 10:25:53',	20,	0,	NULL,	0,	'2026-01-03 03:25:53.308536',	'2026-01-03 03:25:53.000000'),
(16,	18,	'0db8eda2-7946-407a-89d4-0e3dd90d1eff',	'Small Capacity Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:25:54',	'2026-01-03 10:26:37',	2,	0,	NULL,	43,	'2026-01-03 03:25:53.479306',	'2026-01-03 03:26:37.000000'),
(17,	20,	'5dd7615f-e062-4066-afd5-5ccd70754f73',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:26:01',	'2026-01-03 10:26:45',	20,	0,	NULL,	43,	'2026-01-03 03:26:00.765247',	'2026-01-03 03:26:44.000000'),
(19,	20,	'5f7342f1-3dde-4bbc-81fe-e0a4d8950cbf',	'Kick Test Session',	NULL,	9,	'scheduled',	NULL,	NULL,	NULL,	20,	0,	NULL,	NULL,	'2026-01-03 03:26:01.122248',	'2026-01-03 03:26:01.122248'),
(20,	20,	'8396af69-eaf2-45a9-b748-00acf2fabb10',	'Small Capacity Session',	NULL,	9,	'scheduled',	NULL,	NULL,	NULL,	2,	0,	NULL,	NULL,	'2026-01-03 03:26:01.226525',	'2026-01-03 03:26:01.226525'),
(21,	22,	'32c79f7a-d330-458a-b4d3-531f4747cd9f',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:26:53',	'2026-01-03 10:26:53',	20,	0,	NULL,	0,	'2026-01-03 03:26:52.963232',	'2026-01-03 03:26:53.000000'),
(22,	22,	'9f2c4a98-eaa1-43be-a327-4ea6444ef48b',	'Delete Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:26:53',	'2026-01-03 10:26:53',	20,	0,	NULL,	0,	'2026-01-03 03:26:53.231449',	'2026-01-03 03:26:53.000000'),
(23,	22,	'f7fa9d9a-9862-4071-9989-91a8f9baf918',	'Kick Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:26:53',	'2026-01-03 10:26:53',	20,	0,	NULL,	0,	'2026-01-03 03:26:53.315607',	'2026-01-03 03:26:53.000000'),
(24,	22,	'c5fd3cb8-334c-4000-bfb9-360058b60136',	'Small Capacity Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:26:53',	'2026-01-03 10:26:54',	2,	0,	NULL,	0,	'2026-01-03 03:26:53.467104',	'2026-01-03 03:26:53.000000'),
(25,	28,	'20d76936-8eac-481d-8e09-a61a91a13fb6',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:53:55',	'2026-01-03 10:56:53',	20,	0,	NULL,	178,	'2026-01-03 03:53:54.580882',	'2026-01-03 03:56:53.000000'),
(27,	28,	'b8dac5f3-b90a-4ccc-b0fe-dddb9c36b4f6',	'Kick Test Session',	NULL,	9,	'scheduled',	NULL,	NULL,	NULL,	20,	0,	NULL,	NULL,	'2026-01-03 03:53:54.941168',	'2026-01-03 03:53:54.941168'),
(28,	28,	'46b7ef98-8a3c-496f-ace1-bf473f90bd36',	'Small Capacity Session',	NULL,	9,	'scheduled',	NULL,	NULL,	NULL,	2,	0,	NULL,	NULL,	'2026-01-03 03:53:55.057280',	'2026-01-03 03:53:55.057280'),
(29,	29,	'7d4fabb6-b9bf-4c65-8bd9-deceb4732933',	'End Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:57:33',	'2026-01-03 10:57:33',	20,	0,	NULL,	0,	'2026-01-03 03:57:32.840471',	'2026-01-03 03:57:33.000000'),
(30,	30,	'40a4e8f5-3a81-4c1b-9e36-880453707c35',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:57:52',	'2026-01-03 10:57:52',	20,	0,	NULL,	0,	'2026-01-03 03:57:52.050233',	'2026-01-03 03:57:52.000000'),
(31,	30,	'9f2dd441-c339-435d-9098-105f09467c13',	'Delete Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:57:52',	'2026-01-03 10:57:52',	20,	0,	NULL,	0,	'2026-01-03 03:57:52.296985',	'2026-01-03 03:57:52.000000'),
(32,	30,	'c029c8e4-baf7-4aec-85de-0550fe8ba6b6',	'Kick Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:57:52',	'2026-01-03 10:57:53',	20,	0,	NULL,	0,	'2026-01-03 03:57:52.379366',	'2026-01-03 03:57:52.000000'),
(33,	30,	'28c517c5-15ef-4295-8fd2-99e56b23792a',	'Small Capacity Session',	NULL,	9,	'live',	NULL,	'2026-01-03 10:57:53',	NULL,	2,	2,	NULL,	NULL,	'2026-01-03 03:57:52.539029',	'2026-01-03 03:57:52.000000'),
(34,	32,	'1152b4c5-2a61-4aff-a498-97c657543b6a',	'Auth Test Session',	NULL,	9,	'ended',	NULL,	'2026-01-03 10:59:23',	'2026-01-03 10:59:23',	20,	0,	NULL,	0,	'2026-01-03 03:59:23.085545',	'2026-01-03 03:59:23.000000'),
(35,	32,	'2bafd897-fa43-447e-99ed-2910369efc6b',	'Delete Test Session',	NULL,	9,	'live',	NULL,	'2026-01-03 10:59:24',	NULL,	20,	0,	NULL,	NULL,	'2026-01-03 03:59:23.553752',	'2026-01-03 03:59:23.000000'),
(36,	32,	'701a8ab6-f324-4557-88a6-2ea66ac0ba22',	'Kick Test Session',	NULL,	9,	'scheduled',	NULL,	NULL,	NULL,	20,	0,	NULL,	NULL,	'2026-01-03 03:59:23.737130',	'2026-01-03 03:59:23.737130'),
(37,	32,	'512aea62-1af3-4dfd-b663-4c52b2762e3f',	'Small Capacity Session',	NULL,	9,	'scheduled',	NULL,	NULL,	NULL,	2,	0,	NULL,	NULL,	'2026-01-03 03:59:23.972587',	'2026-01-03 03:59:23.972587');

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
(1,	2,	10,	'2026-01-03 10:16:18',	0,	'unknown',	'2026-01-03 03:16:18.411625'),
(2,	4,	10,	'2026-01-03 10:24:22',	0,	'unknown',	'2026-01-03 10:18:57.698000'),
(3,	5,	10,	'2026-01-03 10:22:52',	0,	'unknown',	'2026-01-03 03:22:52.262196'),
(4,	7,	10,	'2026-01-03 10:22:53',	0,	'unknown',	'2026-01-03 03:22:52.526235'),
(5,	8,	9,	'2026-01-03 10:24:07',	0,	'unknown',	'2026-01-03 03:22:52.678300'),
(6,	8,	10,	'2026-01-03 10:24:07',	0,	'unknown',	'2026-01-03 03:22:52.700826'),
(7,	9,	10,	'2026-01-03 10:24:42',	0,	'unknown',	'2026-01-03 10:24:27.947000'),
(8,	13,	10,	'2026-01-03 10:25:53',	0,	'unknown',	'2026-01-03 03:25:53.042172'),
(9,	15,	10,	'2026-01-03 10:25:53',	0,	'unknown',	'2026-01-03 03:25:53.362065'),
(10,	16,	9,	'2026-01-03 10:26:37',	0,	'unknown',	'2026-01-03 03:25:53.542791'),
(11,	16,	10,	'2026-01-03 10:26:37',	0,	'unknown',	'2026-01-03 03:25:53.567347'),
(12,	17,	10,	'2026-01-03 10:26:45',	0,	'unknown',	'2026-01-03 10:26:01.016000'),
(13,	21,	10,	'2026-01-03 10:26:53',	0,	'unknown',	'2026-01-03 03:26:53.099881'),
(14,	23,	10,	'2026-01-03 10:26:53',	0,	'unknown',	'2026-01-03 03:26:53.367157'),
(15,	24,	9,	'2026-01-03 10:26:54',	0,	'unknown',	'2026-01-03 03:26:53.513876'),
(16,	24,	10,	'2026-01-03 10:26:54',	0,	'unknown',	'2026-01-03 03:26:53.535360'),
(17,	25,	10,	'2026-01-03 10:56:53',	0,	'unknown',	'2026-01-03 10:53:54.839000'),
(18,	30,	10,	'2026-01-03 10:57:52',	0,	'unknown',	'2026-01-03 03:57:52.174117'),
(19,	32,	10,	'2026-01-03 10:57:52',	0,	'unknown',	'2026-01-03 03:57:52.431886'),
(20,	33,	9,	NULL,	1,	'unknown',	'2026-01-03 03:57:52.593944'),
(21,	33,	10,	NULL,	1,	'unknown',	'2026-01-03 03:57:52.618869'),
(22,	34,	10,	'2026-01-03 10:59:23',	0,	'unknown',	'2026-01-03 03:59:23.345083');

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
(1,	6,	'::1',	0,	'73930ae8e9bac868e74cc045323a53aaf917c18f8b13e8501bdd360cb7f0426666a44e231841f85732f9fe3cce5fbb93f5c9e4904a42d0b6b737c6b1780fa367',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.107.1 Chrome/142.0.7444.175 Electron/39.2.3 Safari/537.36',	'2026-01-08 21:56:51',	'2026-01-01 14:56:51.114510'),
(2,	7,	'::1',	0,	'ebb051d2de430372cf9d8165f096cabac8e5677146d438732d53c2aeecf40409ca4c0776a834705e17908b6038100b726bdc8010ecd0a9a9fac93a4c9f15ae3e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 22:23:30',	'2026-01-01 15:23:29.878328'),
(3,	7,	'::1',	1,	'eb3dc25c3bae34f19b7176723881658a827e9459315b99d766c5c2be859d9f6c36ecdc7128acb39ce1d956f36fb85814fe01b1952ab59a6ee40253b9c1ab5d59',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 22:23:38',	'2026-01-01 15:23:38.019414'),
(4,	8,	'::1',	0,	'ed01a00a2e88dae1d284a051c97190af644929598177af2de089f983d627330a181c32359ef540a48a75163efc528d354480232733cdbcdbfe6c0398baf0034f',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 22:24:11',	'2026-01-01 15:24:10.645011'),
(5,	7,	'::1',	1,	'e540a8bc19661a1bb305b28cd9aa93c9a1b14a57366f61f4315fa9fd55dddf076f728572b450268a11459c7e0f5ba4d6f2fc6244f323c46a6795d827e080309a',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 22:24:18',	'2026-01-01 15:24:18.185424'),
(6,	7,	'::1',	0,	'e316c44586545dfe928c068ca00e85c13eda55153b7695773bb36a9ca399094ee8e6b9cb5ce37e4d91332b88323e8eb49cc7b0869653de9b3f9c2c1fa0011223',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 22:29:16',	'2026-01-01 15:29:15.926336'),
(7,	7,	'::1',	0,	'd24d8aad23f9a663580b26911c0340c35d1a7e244af4ec4055820b9c6843b4a366c2077a25457ecf4f85f7fb0961c76d35045054d3c485646afccee77440afc2',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 22:57:15',	'2026-01-01 15:57:14.716284'),
(8,	7,	'::1',	0,	'60fb6f50d836ec88c5988a52e3b5a5dac6a593b0f078e6e188549eeafe887fd59bdab79744cb08f851b8b286c02c85287c52684a6242695072e5340c503fa4e6',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 23:07:06',	'2026-01-01 16:07:05.824356'),
(9,	7,	'::1',	0,	'7f840308ae801c136e00f479aef7d5b62f589ea7599d63f154a730a782d6d6c581730af9fbd0a93057df107051012c527a550c4893aab80615c9ae7f2fbfa809',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 23:07:12',	'2026-01-01 16:07:12.138671'),
(10,	7,	'::1',	0,	'3061f3e2bda7e55511e6e30e250b3bf7bdb61d9d16035ad1a8c5703c7f9fc53f345f9b6de59e681d84275ad47352b322341b658e12ba987e47872d04c68d3bf5',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 23:08:03',	'2026-01-01 16:08:03.466657'),
(11,	7,	'::1',	0,	'b8e221e43b23c4770f4aa395feb3621fb99d0200c42602a74882c3ef324aba8594f2be7032d705571196c2dc718d6fa1b6dfefcf720b2de3c71c217a48c16886',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 23:08:16',	'2026-01-01 16:08:16.114275'),
(12,	8,	'::1',	0,	'06877aa0b3927b1265554db6ae882d1734d4f10645cf3de3c2c390ce9e0f335515abe15908ba94a8c79441fb57316d4f78ab9655c9be249cfe5bde566b10ae34',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 23:08:43',	'2026-01-01 16:08:43.473909'),
(13,	8,	'::1',	0,	'0999368a22d464e6514877f5f2455db562f67a008d2d336a5c4a9c8c90ee4101ccc393861a0ad6b01ea298bebbba80effbe677e741abef3212f86aa3e837ce22',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 23:08:50',	'2026-01-01 16:08:49.963388'),
(14,	7,	'::1',	0,	'c45cbfbb044ba510e944cb24a9ff229de3eb66919c27e2ef727b0811c7ef0f7bc7d445b7312ee2a5f2a8094902c51adcfbd8c8ff0fa4e0562baccb0a99a833a0',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 23:20:13',	'2026-01-01 16:20:12.587828'),
(15,	7,	'::1',	0,	'31ba37011c3caced8d8fcc35d93cfa7fe23548d303abaf4db0dbf4cc1cd0e4e7c15985fa870c19176b501fac9f8707e1243ad44de649df858dcd938c0de11b39',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-08 23:30:17',	'2026-01-01 16:30:16.832440'),
(16,	9,	'::1',	0,	'1e49acfdec33a3a89782deedf279e60abc2dc9d6e2d72e1bbe0c1a861c91e47fe8b1b7decc7bb022dc530d540302d5b73640cf520b5654d0825df3aaaa20a5f0',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:47:28',	'2026-01-03 02:47:28.012166'),
(17,	9,	'::1',	0,	'6c6a11530e88439a398c02a5f890e9acb1fcc423f675c46b25e2ea11aa5d9315c0ca9545a9ae22c856a8670e1ff99ada3bbcfb41da22fdbba0bea141d0bd6e57',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:48:00',	'2026-01-03 02:47:59.902019'),
(18,	10,	'::1',	0,	'0dc79e9858c8a0f07f09554980c3da520a870a1420995e7da5297f3f11e08ebd14ffed2f5d36436c3bbf528c3fbfd8a88b4af02624f0d077c886a0bb471a9ab3',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:48:22',	'2026-01-03 02:48:21.912627'),
(19,	9,	'::1',	0,	'3fdbceb3797f49a681a70ee62d524e414bd2fda505aab52e0be8033e5b7cf0273ad1dafa1faab83c515270e56323e12584b43e57d2ddef1a1771edf1ce2c4e50',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:48:28',	'2026-01-03 02:48:28.126584'),
(20,	10,	'::1',	0,	'2080050d65cf649db045c88f3f2d3298b7032cf4864bf27d8c42f298029e005fa3ded840248c7840727318fe3828b94d1cf1256a934ff29e5331b6dce1192134',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:48:28',	'2026-01-03 02:48:28.223761'),
(21,	9,	'::1',	0,	'922a2cd33e5aaff2423bdc328af7b0c094cac30937cbf9de6a6dc9c7e945247040761079bec08de243a8fa9d4a6d6c6724b218f4bd14208fe26f48b5572deb7a',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:48:53',	'2026-01-03 02:48:53.354260'),
(22,	9,	'::1',	0,	'8443d5a06d0ffe10565bc959922a25f2eb768b9b0eec405a613f939dda8b77408734d4acfc56304c9a5b703b490980921510c099e4de025ace5da7a8f159ed24',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:50:51',	'2026-01-03 02:50:51.278506'),
(23,	10,	'::1',	0,	'558199c3cc0ee80a44a9f4b24ec3a30deb2d68e32f61acddc2725b2f5fe94799a37e27797fe613bce14b243bd67ff0b8994c46c3826bfc010e7b9c2f0fd53930',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:50:51',	'2026-01-03 02:50:51.384771'),
(24,	9,	'::1',	0,	'25407a15bc272fbd02f6eb201be8bb79fc2cd1032180e30e8a35ac79dafc1d1ce71da03200dd00a08dddd7ea92a9ca5a809111502b9e9a6e67557508797549d4',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:51:26',	'2026-01-03 02:51:25.581216'),
(25,	10,	'::1',	0,	'481186722eb89bf592430ecb4bf5c1609159f10c5c308423bd150eb0d6313256d3de53d547dfc607b17e3e599fb5b8821357993c38d3fb307019bf52e38c8ad8',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:51:26',	'2026-01-03 02:51:25.724008'),
(26,	9,	'::1',	0,	'74c58fe108cca568a274eb5404a013d3bccfec0149ff0678a2aa099fe9d4b7d0d0134196b40bef52148d47022b8d6d4cf8b7f8383ac7184b937bf14644fec42d',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:51:35',	'2026-01-03 02:51:35.505354'),
(27,	9,	'::1',	0,	'df82b05e7ede33d0eb2af4b8644fec6fdd70ed757fb325963769ab41e7b018b805e11aa571ec90fad30777735c882ca94a82ce56e8e0d4e5628ae8a9f2f51a9b',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:52:15',	'2026-01-03 02:52:15.356454'),
(28,	10,	'::1',	0,	'3a50d89a923c37956e0abc4cefd7ec0b64fc61097cc15a6d2732d8c8a20b0c84b536dd5e2e0b3e76fd7bbda67461ab0e86d81e44390c98acfdf91fd3f8ad8e9a',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:52:15',	'2026-01-03 02:52:15.502737'),
(29,	9,	'::1',	0,	'3ae85b5fd4f6417b6c0983a897557d41c5acbfe49bd1e02189b9b5609bec6e05f49e058697556749d0f8c8bdd4efd419bba4153eee465df3fede25c5a5e31af2',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:52:54',	'2026-01-03 02:52:54.010210'),
(30,	9,	'::1',	0,	'4858c4b69cba1fcde11eb0145491af186346caa381a41fd98ba0ec0a4b9951044081d9487c4cd97f5f24997d5333cd257c6bacd54d997e7cb138bdde407d89f4',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:53:48',	'2026-01-03 02:53:47.814218'),
(31,	10,	'::1',	0,	'fb2c51396bdd4337344abb7948970d2c270a234c41e9ef19ba21a8f8384c10b29ec3bce6df07601cca8d74875b6aa148080c1e7840fe1874dbe44bc3b18c9a1e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:53:48',	'2026-01-03 02:53:47.963185'),
(32,	9,	'::1',	0,	'f55443bb0e300a82256ee276a242206b00c3716c41afed9883cc18a119d44784aef0c226a4670af11450fe2cea79efe55438380f87ee03f77734e92514634847',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:57:22',	'2026-01-03 02:57:22.130519'),
(33,	9,	'::1',	0,	'9ebeb890623f2cc55258938691bb69546986ab9ae965f514a0e674e6a80d4d927fbc82e8128b0affea7bbf1b56928e1fdc27dce87551dc9dcdb17d22a3af6910',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:57:31',	'2026-01-03 02:57:30.922362'),
(34,	9,	'::1',	0,	'ad8a8b8581fd67c44377bfd4af8d869287bd6748809f24bb4d57e32d2d5d7a7a50be8641a7d090304f1a3d7ad75d10719669b4b4130b79682cc841a22e62f128',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 09:57:40',	'2026-01-03 02:57:39.769099'),
(35,	9,	'::1',	0,	'6e764fcbc99913b61aa0902fb8b8a4ab3116f0a0d32469974ab22c0b815746d8545e864b1f05fab2d63bf67e84a762ec2c6bfc91d6eca3317fee5376150d757f',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:02:25',	'2026-01-03 03:02:24.697582'),
(36,	9,	'::1',	0,	'3e8ee4afca31edf304c6bff84b8cb77020e287a661600100ebc48a8cc7efe7f7add24800219ac48d57197034ee941aa780e750ce7690352177b8b5bc8b035c45',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:02:31',	'2026-01-03 03:02:31.151105'),
(37,	10,	'::1',	0,	'7dc7010a17af51ce8aebb3d4cc4910c81530ad3b20848a57acac1d1c8d2782b7cb8a6b41ef68c0bba74145b24ec118c51b6e914ce3abac593b9e61b5fbb759be',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:02:31',	'2026-01-03 03:02:31.249711'),
(38,	9,	'::1',	0,	'8c47d699866af61388c966151a121470b821c3eec1ad33d3d2ed2a3593cb1179dd0729536230fd4ccf14a6f62c865142e5fe14270f3d250ba71680394f8a2f5c',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:16:18',	'2026-01-03 03:16:18.107766'),
(39,	10,	'::1',	0,	'bf157847440f4b489b9289ecc2237be79910dd3c09f969d044a989dca43531d82a9b0e736355fcda43b11145190c39c704eb24198e7539cf0b92b26ad5899fa7',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:16:18',	'2026-01-03 03:16:18.213486'),
(40,	9,	'::1',	0,	'94bea2902825b2a39d5ed1b0075010120d92c7a20b9b2a201144be65776359df2f26043779185bdd79a1a11ab4723af66731510905cc835582e6028e47d84a64',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:18:57',	'2026-01-03 03:18:57.022427'),
(41,	10,	'::1',	0,	'0bf3c2edf965cf6d187b5f6383b64f889dfc24768f13b2fdfc327fb8d734cfd8b57a42253a37c073719e5ace2709f44f78989d3422115cd4f711238e49c5cc62',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:18:57',	'2026-01-03 03:18:57.123666'),
(42,	11,	'::1',	0,	'5608ab15a9485bf1f26becf68f95632f316f01ef7ece7031b6637fbb0a445cedf56d66b1a1befbb2a9dde8420cdad9292fd7cea837e22338fade545cd473e05f',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:18:57',	'2026-01-03 03:18:57.356349'),
(43,	11,	'::1',	0,	'e48712c3e19ca9c8301ecc4fca1ab459688e426cd4f66dcd5dfd7e0b105b05dbffa240ce925168ce65624ac23a9716f40c5c60d63c6720bd1d7d273b0c9dde92',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:18:57',	'2026-01-03 03:18:57.451361'),
(44,	12,	'::1',	0,	'6c0bcbd13b4e8c01ef569455eae674f226395241f95fff1e000f49e425724e6a4eaaa0535e4adc59183fc5a64d84079c81f864e9115aa79376194a96ded2be05',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:18:58',	'2026-01-03 03:18:57.915087'),
(45,	12,	'::1',	0,	'b2aacea1f682a0d3bb68d151f8e847dbdb9a0be7d7591a685c90dbc14b6a8f8f909d9f93dc1ed457262fb96dfe0342c27e134d1f4b6e89b6aa13d06ef019c4a5',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:18:58',	'2026-01-03 03:18:58.013642'),
(46,	9,	'::1',	0,	'71ff92f95c4c1037188a39de69657451ec69a705050cb2552893faf7e5c644748351479d8094eded88ff1c1f17709c89ed74b0a68cce30e0c1d5f76d7056c92e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:22:52',	'2026-01-03 03:22:51.689681'),
(47,	10,	'::1',	0,	'b91e9a88f03bd00c593a25cf940902d7c88a413fccb33fde3360bd9407712bb3502d8097db3f6a7d02cbc5cbb6bb091d94fdabf4028271a2b8b57da9cc9466bc',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:22:52',	'2026-01-03 03:22:51.794705'),
(48,	13,	'::1',	0,	'a9e0c8622dae8ca8f88b7b5f67279515ddebdd3ddee9640e3a12c49e747931ced332a4024ec8230d78d55f7e1e3f0f56bedd4979e8f191cf86cf5ddf14af41e0',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:22:52',	'2026-01-03 03:22:52.018863'),
(49,	13,	'::1',	0,	'e5e8ec5d04d6ee0c4a71f3d97149ce5ba1d3dc79104407287d5901c8487fd9e1fec5d22ad0caba5e657ca7d045aeae99371cd8a0062d16775f36cef830fb0799',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:22:52',	'2026-01-03 03:22:52.115810'),
(50,	14,	'::1',	0,	'194534e969536813fba7eb5ec43504bdd3c676d37ba3ae02dd49905e8d6463d5af5e0b565888dbfdc95d0411bfec703d3bc9741c3e611ba2640a6404f680f77e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:22:53',	'2026-01-03 03:22:52.797350'),
(51,	14,	'::1',	0,	'be0bb50bb61ee5cdb9ab1d1e205624961453f346e64d21833f715046a3ab45f0bd1af9e8401e3fca73dd676871b56eac161ae841f7d7cf4f30431b77a566c712',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:22:53',	'2026-01-03 03:22:52.897949'),
(52,	9,	'::1',	0,	'88b018686c41948bfe5ade1080bb4028d4377d6dd70409e42b671be46c42e00bf97e4d5a17b90e7ac18e2f31851bc73bd5cf9c8778f947d70fdfded07109c5fd',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:23:53',	'2026-01-03 03:23:53.289090'),
(53,	9,	'::1',	0,	'b729c8415daba5bfb45dfdf508a273e36ce422c6a2369c3947441cfe681ba45e9cc31b5b442921191f8d63e5542fee58a39bfdc8459e8332657d8f69da1fa8d9',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:07',	'2026-01-03 03:24:06.595335'),
(54,	9,	'::1',	0,	'359e652e4381f16889cd56e03f8e1d9a11f75f4119e224f72b28ff127ffc5dd5b2f24099c0b8f80ecb9e113869716e2c17506b544c2ca1eef87867cbde143335',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:22',	'2026-01-03 03:24:21.644485'),
(55,	9,	'::1',	0,	'5a32b53391d592fa408debb4acd465f8fd0ea56488d1614f44d3a461b2423eadae05787bfb62c23e57280f31a035fca2f3498ee9ac99339fa62d58a473aab030',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:27',	'2026-01-03 03:24:27.325451'),
(56,	10,	'::1',	0,	'7e621833ad0175fb5d8eef952faa5cae73257032d63a144ad421ecf48f6d2259f6bfdfd1ceebbeaa0a712b86612949b01b2d9e69530494b88a912e8283ebe94c',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:27',	'2026-01-03 03:24:27.421206'),
(57,	15,	'::1',	0,	'ae2aa2dfb4bcfcda83a550735423abd7a610f4159e075bb6743a1d51788b721b18d2bf2b2105a23a237dd41339a915d47059323734970363b87c9b9bb625d5ad',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:28',	'2026-01-03 03:24:27.625195'),
(58,	15,	'::1',	0,	'8964670c2cc5969750907a74f047d3d745849a9b623d73c70122198858fec900a10df326b3ef5d87c14530010faf812e95ca87b70bdb32e6caa44f636422f833',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:28',	'2026-01-03 03:24:27.719076'),
(59,	16,	'::1',	0,	'06ab3ba5ba0dd12d5ed9ec8e2cf90fd274ccad6cac1cc7755905348ace76f6da7bfdba422918f43456200032a9b79792f9c716e6b283cbea6ce1650306746db9',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:28',	'2026-01-03 03:24:28.262253'),
(60,	16,	'::1',	0,	'8b8f775a4364117a4fcea78182a8f09ef4fc718f1d9edadf8fffe7ff5edb08377a2cf398c8ff759690ef8433a54f5f430e43b94ec4b85592654d3dc93c76abe6',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:28',	'2026-01-03 03:24:28.357906'),
(61,	9,	'::1',	0,	'cfc83e45a434990a9bcb500965a25b5b11e9908b7398392e01662bec30a4f84cc69dd015fea4ce5fb3c27fc4ba30cf3c981ac8cc62451ff7594ed5743b346568',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:24:42',	'2026-01-03 03:24:41.503790'),
(62,	9,	'::1',	0,	'f0e60f48a6ba15b3fcb6617d6dc2bbce851f1260d8ce3a670f0a879e70010ba6f7f4f4c36d6c854d4f900031e67f498dcb7828a1fedcc095674ddf761bdaec88',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:25:52',	'2026-01-03 03:25:52.317471'),
(63,	10,	'::1',	0,	'1e8018a6d89a8bb5418ce912c0b64fcc3dda578a7484d88fdc13c4118ed840f1904141caa74bc821725dd951e987dcf66d937157a401e74520aa03b11e685039',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:25:52',	'2026-01-03 03:25:52.438846'),
(64,	17,	'::1',	0,	'934be75ed177dd39d202eba39d491a7e6b1cf67d2c4ea085ab7fe27f6bd6c00e7c3bbc1ebb9868e73b6187530174ab3ffa1ea4e9f86fec423c5b90cb3b864ae7',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:25:53',	'2026-01-03 03:25:52.719255'),
(65,	17,	'::1',	0,	'4f626dfceac4395958f53a941b87ceca656b46ba64d6afd63fcd84ca4f42ddae1f74c612c62d632f166d67c46a39c9e28dac53778a7076dd8ae7a7419dfa94be',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:25:53',	'2026-01-03 03:25:52.820877'),
(66,	18,	'::1',	0,	'2a16b81151b2b55bc1c02e53e782f0e61216f127f4af7d0bf0944843a2d6c8f12a24097c80e1fb4ee950b158a68b626c7af797a3f95b9764ad465315cfb3f693',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:25:54',	'2026-01-03 03:25:53.665221'),
(67,	18,	'::1',	0,	'0ea16e8cba142e969893dda3727a45d65df54a8184dc63452105e3e8fdbff0c047ef205a1bdd06cfbb7f4738b1d8db684fffbb2bcdd5277eb1d3dc3453edf908',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:25:54',	'2026-01-03 03:25:53.762589'),
(68,	9,	'::1',	0,	'a2e11fed6fe2a4c03db73d6e4f18f124d920576bd0656bc131f8cd4495f2d8616d4a21503d9cefb970b830ef54b0e9fa7ce3d0dd6023de9b4d08643b46a233fb',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:00',	'2026-01-03 03:26:00.244807'),
(69,	10,	'::1',	0,	'e40cd36bd58a030fbab7ad75ac64b248a1196cd7b4502a127930f4f0c7e102107772778e7512300ce8c4ee0a3cfdc1edb81e4d9dbcc717284855c475fc440051',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:00',	'2026-01-03 03:26:00.357479'),
(70,	19,	'::1',	0,	'5f22d787fff93093372833934e119f601d46bced1eb0439d5772f844731e7d4a6608aa3441fd79d90f8ca9bf92fe5de7e7822bdb3493070401ccd3e8d73fa69e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:01',	'2026-01-03 03:26:00.635740'),
(71,	19,	'::1',	0,	'5700dea886be7a8629726ffa9df3acd4135490c758d087e93a87dc228f957f198c5d8d6c1a20f2e582eb29f0d13d24d655ffd9ae7d109a608a6aee1935642abc',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:01',	'2026-01-03 03:26:00.735382'),
(72,	20,	'::1',	0,	'c5cb55d9ddf1bfdce1b6b5d6244e063444c8ee45826f7072911dcaed5019718e59dbb43b149c50dff05ffddfcd004cb54440887b78ded14631354fde5370895f',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:01',	'2026-01-03 03:26:01.357745'),
(73,	20,	'::1',	0,	'54f5a9a6822c606d8446d03a77c1a2014d799fefe8f7a6c20712ae109e50cced71e2e0af27a9fa165166829882c516c38c32f9d701c1f12e87b0382ee0714389',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:01',	'2026-01-03 03:26:01.458124'),
(74,	9,	'::1',	0,	'1842e5f9fb87df2d5812a5c833db99ed023e2bc101af41094674bc6e1f66b12d8968a3bce753dbc20d89cce0b962b9ab3286e42a93f708a32a0f62999000d278',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:20',	'2026-01-03 03:26:20.193718'),
(75,	9,	'::1',	0,	'16ac20c429430213a9e184e1f79a09984341b734829ef968b6ef6191b3906e269795d3601d0290eefa331265f0bbbdeff5eb53adce44eae7c67091e4b15dbceb',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:28',	'2026-01-03 03:26:27.505221'),
(76,	9,	'::1',	0,	'a6cf1b852cbd31aeb7ba7841ffab4f9c220e65d31a9b498cf3e2098b4510d12982612e18147bacd8b0ac2c33576885bcbac9958497cabf1426765ea43bdec100',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:37',	'2026-01-03 03:26:37.340913'),
(77,	9,	'::1',	0,	'558f78d310b4b4c58103a4946e66164e27e1b86c398235bc5bb2612bbf7808c1434ba3f8fa0424a6aea27bafb2d6b8fd0bf75e66fa12e69f1d4320be06e19d31',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:45',	'2026-01-03 03:26:44.772239'),
(78,	9,	'::1',	0,	'bb392390160bb638bb502a7eae80711f4b55a62d9d1bcfa4f7050897c487e2e364d9b207f90882e40a916cc1c027c28d3d2a5b0179ad357e3fdb1792af723c6f',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:52',	'2026-01-03 03:26:52.486040'),
(79,	10,	'::1',	0,	'edfdbd0fcbcaa0ceaae75bab2b303b6541f6b1637a3189d505f560b5e8bfa9569717ff3d203ff366244973db458793f62cb279f55134f66187ad22936464a69b',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:53',	'2026-01-03 03:26:52.598084'),
(80,	21,	'::1',	0,	'6505b2981ba2346b289907ccbfb6860f76ba8f181bb51d00b7bc578914706cb92a922df043d76c4bba2637c367ee211ed8983988ec7f088159597ea334b4e5e5',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:53',	'2026-01-03 03:26:52.846780'),
(81,	21,	'::1',	0,	'b8c3d49ee803ef33b905ab7a3efa2cde3701515d7d08a5a221cfff06d05ff045a97da1c0272c0e4f952776ca64999fdf9117112ca70c430e4af8af174b7bfa45',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:53',	'2026-01-03 03:26:52.937600'),
(82,	22,	'::1',	0,	'2e3119cce2ec2076954f70fcb73f09d086a4b2333eeceeead5e6cce48c5cf76f497124b469d20cb9b76331d6bf2b584b85a1507c3327b32e3330bf8e87627e19',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:54',	'2026-01-03 03:26:53.633469'),
(83,	22,	'::1',	0,	'62285a1a05efbe916545c7ecb5f84387c5c7cd961e7a6b1e9a072b1a0eb5b1b29658279fe590b815161985f1ccdd4c7da75e38d684637426ad22b3773d13851e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:26:54',	'2026-01-03 03:26:53.729668'),
(84,	9,	'::1',	0,	'189637bb2f2a84466a7dcd35727c64826bdf01492b0b8332837ccf17629ec2d64b53423636ff4cef1612f02474653d2dfecdda5455bc06f86b7120a654da756b',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:28:03',	'2026-01-03 03:28:02.910082'),
(85,	9,	'::1',	0,	'd144f229e62f432b7ea8c898eb8cb0af771bf8b2d82af61d485b1dcf4ade8a5f413feda2a5af18a9246cd248f598e6028d667f88737f3d6d84dd2a29706b8954',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:35:13',	'2026-01-03 03:35:13.293748'),
(86,	10,	'::1',	0,	'b83c6308b126b7cd7839b800c7b1bdd2c419d45d11394a7cb0b8832778ab8d559f45fa6aba8a156097674137c3242d26f7588432e6991d7ba7abdfc6fbeafe76',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:35:13',	'2026-01-03 03:35:13.408048'),
(87,	23,	'::1',	0,	'a4cd4b27e79bb8964b19835f70afbbf5f6c01f22da4fd35795476d326f98d658201ff9090be4c408bcc9d2b058fa85bb8d5b46e85fc4360e08b5a5e81929aad8',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:35:14',	'2026-01-03 03:35:13.797277'),
(88,	23,	'::1',	0,	'2562e9dbae7646e5bde65774c8cc571189870797904c4f9420249234f467895a74265354e397da6d11bbf4dd0c994e15e6a24e420c160a3ff38c5662a210fa48',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:35:14',	'2026-01-03 03:35:13.893647'),
(89,	9,	'::1',	0,	'b2f6f57181578a028a855437c165c821bc8576519395b13baaaa4222b43064dd5acff9c60f15afa6dfaf80b23feb76d455a9e96a32bb797edefcb45ffdf0c93c',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:36:17',	'2026-01-03 03:36:17.376085'),
(90,	10,	'::1',	0,	'4dff323bb241c97c915968f3f305aeb9413221e3d35081314cb34c4609f8f1a6e4e5084024ec05abed2e420bcdcf32f8db3f8f5d80acf0249d2e3d27e48060b3',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:36:17',	'2026-01-03 03:36:17.494692'),
(91,	24,	'::1',	0,	'0eac8908dfbf4a338f8a2bfd8ae73a8186e80cc9ba4965bf15dbd9f8860baa4d04d4524450cd7d7262d5adf70f4d7e0539828260fb443176172efe9d9f82f108',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:36:18',	'2026-01-03 03:36:17.881482'),
(92,	24,	'::1',	0,	'30c49dae2ad991a3632866383e21f0461a9cd49136bf50967f9f665d96b41c5cc31788247eb4a8f511d1b6756e898c77bcd9ea55be2bde0ffdb19a9ae07c1d46',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:36:18',	'2026-01-03 03:36:17.978963'),
(93,	9,	'::1',	0,	'7334e188d6eebe3c231afd5f3af2c25e31db148fb51247bbd50733699271283624a0e0bfea951d86e810afb5a4138bae6bd7111d6d5f718cb0fa481a2e2be24e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:36:33',	'2026-01-03 03:36:32.874877'),
(94,	9,	'::1',	0,	'6a09a3fe3f602ef5c019efb0d9ffb2474009ccec512ad0439caac65d216272d90098ad8de418d3fd9df9e21b6807ced1f911bd2c3d53432cb58ffa2b2670e0d5',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:45:44',	'2026-01-03 03:45:44.340684'),
(95,	9,	'::1',	0,	'3ea0ea231a44be430c61226dcf8984b5afccce8f8b0e78de12b86d5275666ebd474b12455570f55efee76e93d81d2545291f009857ac9f9c20d6678a24ddae7b',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:48:05',	'2026-01-03 03:48:04.555597'),
(96,	9,	'::1',	0,	'd15b41b8d45cbb8f8d0c6480e189b0f3d378443f50c3ada24c08c9ae9b165e1d74553bfe8052e909fd092f66e6decc62716ca07ef93d126d8096a9b6f1a504df',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:49:38',	'2026-01-03 03:49:37.610745'),
(97,	9,	'::1',	0,	'7d5b5949484c6c78dd65065ed8925cedbe225ae5f8c809fe20c81287e0bb75ba81fcf0e21326ce068491597d292b86fd966d57db5f1b58d135cafa2f1d01106e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:51:53',	'2026-01-03 03:51:52.601664'),
(98,	9,	'::1',	0,	'4569ef8b07773e6532ad92f5af2a32715ca093c4e341b9c375413b27ccb0d64ef8682c254f6a07be13c279a2aae718a4c1e768db40e2236c66db1df062e11c00',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:52:05',	'2026-01-03 03:52:04.531965'),
(99,	9,	'::1',	0,	'ad110167afe882995a284be691ffd5bbfe42ed51fa27a007f1ecadb836225dd61aa79cd0fdce2292c06d5bc41a63babbe4fd826d5b45e7d84c73989011d00e50',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:52:51',	'2026-01-03 03:52:51.160764'),
(100,	10,	'::1',	0,	'4ad9f100c14ff7b7a2cd51eaaaa33179d3b6b2f6919eec76d094aeec01ba91769f72e361eb00bde96b74ce3bf71af5ed4afbaf23fdbda5d0dfc8ccb20c14e17b',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:52:51',	'2026-01-03 03:52:51.260852'),
(101,	25,	'::1',	0,	'd18205df4ce1d8b9150bf1cfae075b78bca1077d70556764ffd0426639260b2901f44290025597d54d1b170de0f09b29e7546c092e30e10701308ced35dc39bb',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:52:52',	'2026-01-03 03:52:51.619181'),
(102,	25,	'::1',	0,	'2ba5df3d9e29a925034b1f36f964b951ca80455e3f76997d9b0b8686a2181269609d8b9dc57e48fe1ea7a0b05987d0b733da108df4b4b1504245f472bb3a3309',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:52:52',	'2026-01-03 03:52:51.719551'),
(103,	9,	'::1',	0,	'2f40ccf6b5e8005de123fba425055d38c401dc125de140c262a97141805223bc7d2173bd36898ea08e5fd562e22a13a3f84b9e6e64fbc5ced802d5bfa2c0a43b',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:08',	'2026-01-03 03:53:08.315183'),
(104,	9,	'::1',	0,	'7c56e33ea13fa83e54ddf08abcd1660a60fa3b3d1f0ecbf4e3c556a5c8889848db109b5bd9639609d4ece9d4add845473de9a38ff49529d47d8c9b02527939be',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:47',	'2026-01-03 03:53:46.691993'),
(105,	10,	'::1',	0,	'c1f6eb2c7ca674434d91f683ead3f887be93067c688ba79bdc26369c2e33bf444e84d243b68351beec09097a7659ea57cf5022808c664c49dd57e6e5166c49c5',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:47',	'2026-01-03 03:53:46.798222'),
(106,	26,	'::1',	0,	'e5c0ce8a7553c56490d30ec53d7e81d2cb659f858ac59e1e48f2dfcb9e8a9187449fb7c1b08401a5701e24e8e65c4e491f8f5bdc823ef94400fed27c80367886',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:47',	'2026-01-03 03:53:47.153698'),
(107,	26,	'::1',	0,	'27be6c028f79e8ef16f4d7ba80e7c3e75f68f702d79258680ade2bf905437a9b7f9afc1ce0f378f44cbbfb5e426e5319570fb51a244ead02930c3ae70fd14a32',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:47',	'2026-01-03 03:53:47.251746'),
(108,	9,	'::1',	0,	'204469b89370b0f30e22b69157442d8302afd728cf54f07ba87e405d13882c5cd9badf0c609373ef05af0edbf4930f04d02d14d086c30c9ebbf0eee2166e3059',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:54',	'2026-01-03 03:53:54.105075'),
(109,	10,	'::1',	0,	'6b4d4135b7cc5afe34f77d6b9863e062c94da6fcc9ecea028e4b3d63567cba632d7173a23a991e4697f83b738557952c40c0f14eae77a99fd1704c7e52a2e1d0',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:54',	'2026-01-03 03:53:54.209384'),
(110,	27,	'::1',	0,	'bafdca165220c31163f8ca02b83916b9f642fd2382be3e1d030cc553987b6a7bdb2bcc9a6adfdc30068e15fbe81bec2f32d5d77ded5ed87c900bd6b639afff07',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:54',	'2026-01-03 03:53:54.432392'),
(111,	27,	'::1',	0,	'eba0048ff46c8785935b831438f0f61ce58fbfddc565c6e01c3c1d1056f96bec84176666561fae1fa224f31bddc90033be402c700f3f1e147d4e0c92a5119ed9',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:55',	'2026-01-03 03:53:54.544138'),
(112,	28,	'::1',	0,	'9030043d4e4d772f32b55c5143b7836161f257fde87b0128634491b447e7ded325b13ffa043b118004834ac2cdb934d5e39e69939629031ed058ce36079c882b',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:55',	'2026-01-03 03:53:55.196078'),
(113,	28,	'::1',	0,	'c821abdd4e62d82d9036171d35129fb51fef4a2e480d763fd6e737c1befe8af3f0d473a6cd7f01d4cd4d9883101401205ba6730c2e6d16623b95fcf340a29d3e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:53:55',	'2026-01-03 03:53:55.297290'),
(114,	9,	'::1',	0,	'1c744b6cd76fa7a663340a96815d9324ce3895f3b8ad4edd3d1666394560ad8b051feff05151ba2d996e81abad93881e942edd854470ea983fa556d29ee0e519',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:54:23',	'2026-01-03 03:54:22.794332'),
(115,	9,	'::1',	0,	'ff262721ecd3db3f52ce8da5f1847ed7d110523b4b71247dc0ce2deb3927d6d0518b6d4447a566dd5835953cdf4ccefa2e429e66816cf332e6b12c36b2637473',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:55:18',	'2026-01-03 03:55:18.248696'),
(116,	9,	'::1',	0,	'cbb96cf9bdc8df5e500f0fee476f9665dd951d846c988c27f0afaac7224446ff5eebd97b9d5c247e8c42beb4357b5b52e9bb015d4ed4a88aa717197ba8df0962',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:56:53',	'2026-01-03 03:56:53.212851'),
(117,	9,	'::1',	0,	'7c3d7812f7ce43429550e728318f25c8a9dff43f72369621383cadd1517a0dd67d978d4a3c705a77a9cc7a58d846b84c375b6c283c45edbaf7ff4dcb600e5af6',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:57:01',	'2026-01-03 03:57:01.293203'),
(118,	9,	'::1',	0,	'd08835df49528bf7472e4a1dbb4b6785f4328e2b8b915881b25d651889161cd24b3e19b48de326aab1f60d5ab42af32da381301860cfa71210edb60e2e67214a',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:57:33',	'2026-01-03 03:57:32.494814'),
(119,	9,	'::1',	0,	'3237c9750fd5ba6def2bcef11419a05930ae7e8b87ccbdc89fbfa2680e725d2b2337dee3c7c61434d5971d774f674899a0aa6bcf1e68732a5983a5399ac58824',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:57:52',	'2026-01-03 03:57:51.589796'),
(120,	10,	'::1',	0,	'933aa76994152ad948f43eec41fc315c1b255299c33c4c4e42622dadad25fb1662bff966556d1a6e663e8190fd4127eb1106228feaeb826d9684c15a0c113fc8',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:57:52',	'2026-01-03 03:57:51.691276'),
(121,	29,	'::1',	0,	'7ea47e1bfcdde84beddc3aa2c1178b1e2b9cbfda57fa0db95e6aa9c0ae4ae96c1b6dd9e0b1c8179d7432af1002ff6adc400740424bf05cbc00cdb971aa131c4f',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:57:52',	'2026-01-03 03:57:51.925458'),
(122,	29,	'::1',	0,	'f9c8d5381a85196c82fcaad65af513904b54fa8088bc80f769aee6c1fcbcfb2b50dc0a8ef96db8c5094b33390d010d5791aef17d9eafbd479726e249009208d9',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:57:52',	'2026-01-03 03:57:52.022682'),
(123,	30,	'::1',	0,	'4a45a08263b701a11745425dad787788bfa3e4a17fb2b3547be57923c5c5b867fd40abc7a79d72683fb69d776ce490cda8a9f89ab03a964db8a3546731340780',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:57:53',	'2026-01-03 03:57:52.715278'),
(124,	30,	'::1',	0,	'9387233496440d5e7b06b0baeff716611518708f51642330596ff9ee6510fced8f0abee21b103a1d7f59324c8779d94cd160b3be070afce2325e8b19aa2ee8e2',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:57:53',	'2026-01-03 03:57:52.814698'),
(125,	9,	'::1',	0,	'fed7e1877474f3b9ee9705ff29a1e589078b60c086b6425e476330d152ed6c7622f8c0d7f5d8386253f35d12e4732814becef012817b6c5e5025f2fe2e6bd3c1',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:59:22',	'2026-01-03 03:59:22.165382'),
(126,	10,	'::1',	0,	'f0263b912877ac1da4a3d68097923e32386276162c4b0ff04b3cb519f0d2249ffb318c0395779d9ca946cf837a42c9afbcc70c8b0e31c2f1c1781d5764cdec43',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:59:22',	'2026-01-03 03:59:22.362141'),
(127,	31,	'::1',	0,	'2cb61a3200bfac8c3ae8e00f896f8a33a8308dc42affe35bab768d9623ec32c7393a8407d9e6283fc3eee92a83b2b0f83f5847e50cd27918e51c9a701bb99064',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:59:23',	'2026-01-03 03:59:22.887703'),
(128,	31,	'::1',	0,	'999b654d84c411782fa7da1113436e0a66b0180ba0f9a3a74b04d5479719469dc2735709de01a6e45fea3f0e90908fd17a0f375a6c5b47043b1da305a9b8b68d',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:59:23',	'2026-01-03 03:59:23.037518'),
(129,	32,	'::1',	0,	'ef4cfbf37cb6719a81eea0fecb98116f7ac772445d84495f5499c1a005aeda40095cdd6f13971b64d492bbe2d6647f974399e5263c34ebef008442acd1638237',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:59:24',	'2026-01-03 03:59:24.168181'),
(130,	32,	'::1',	0,	'd50b244328b91b27c1c7cebf4f1d9be28c1d6d9346e88eb73ebca5d4f35be85657c70200364315da3900b56c09418a76ce14b13dd978a992423ca11f1a26061a',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 10:59:24',	'2026-01-03 03:59:24.296203'),
(131,	9,	'::1',	0,	'12b5b6a39aa3cdd1e97ae9d1e64ddf25274959fe02b67a648ed8876bcef61ac1ab4379f29de72dc5dd8e98bb5e1876b43ddeafb2f123b29f487882a368f79871',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 11:01:51',	'2026-01-03 04:01:50.982654'),
(132,	10,	'::1',	0,	'7f58400091c28fcdceef309d4bdf389086a90df25c73ff1b24d619079c22306ee55109af7bdc09b2e36800da4f4eb9d934593d0ea2c6e760952f01a5e40cf029',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 11:01:51',	'2026-01-03 04:01:51.080153'),
(133,	33,	'::1',	0,	'239765fe2ed4509835ff19ce9998cd6905f36c6f31004f25c80703ac76ffa7acfd90f0b6f1d766e8462f4582130cc9ee5d0443d90611b3e94e0b6a0932487267',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 11:01:51',	'2026-01-03 04:01:51.435476'),
(134,	33,	'::1',	0,	'cc568016c75f8c368f0612df4b1c4fa839c1993a403edd3d96d234b33c2cfd70bc0bbf647973795767a0193a988e6989bbe3828139fbddfbec42cd765b49ac5e',	'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.7462',	'2026-01-10 11:01:52',	'2026-01-03 04:01:51.535136'),
(135,	1,	'::1',	0,	'a08db6063df256eeb11af93319c889f41c735de84ef9d856e2156524e57b531f3d61fd7eea2e62d07a9f09dc885b19e340a1e3383c589a9d758c9adc8f3ec309',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 12:41:19',	'2026-01-03 05:41:18.972202'),
(136,	1,	'::1',	0,	'69b16b986bdec62cf2cad8334445bb51172e8fe38c1e61fe3a780c233fe9a6d6f3e501e02444023472cbbfbc9fc3c2fc0492986ef9045db1aa18e8f0b06e5f1f',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 12:41:20',	'2026-01-03 05:41:20.006528'),
(137,	1,	'::1',	0,	'93d5ff8b00a0222bf871a08a48b5392107f7c30ce855e8bff12ec9173316385bf6de5b09ed6f69f3a39c17397f5443766244047e76885485f4bf86b045e51886',	'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 Edg/143.0.0.0',	'2026-01-10 12:42:39',	'2026-01-03 05:42:39.246446'),
(138,	1,	'::1',	0,	'4b55602aa34b9bd2f929da10e12c6191fdff4ec7351d88f7ca59a6b1e0b48b521dd01a1f7bb4a3134fdc54f791bcdfc5d3707204aca773d0c0803c9a6f729e48',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 12:47:28',	'2026-01-03 05:47:27.769616'),
(139,	1,	'::1',	0,	'3441667973de7651b6eb4c46b320510639bc073181f47b523552ceafd62e3c09f4bea246f0f479fb1e05b11e2ab090707a0bbbb31d1d56658874072aceca4319',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 12:51:17',	'2026-01-03 05:51:16.696516'),
(140,	1,	'::1',	0,	'7ad64f0c6dbff971a994ed41ae7a7f2d50c5c033a8108907c69749ecf01ead34ef180606307374f351ae77bbd773d6a043d4a0e6d8764c12d07569c6af869362',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 13:06:21',	'2026-01-03 06:06:20.985367'),
(141,	1,	'::1',	0,	'fc96539bc9cf7c168a5197e5ae879079c73b47be0321dfe1a52d76c95a75f79ed5edbc777e605aff844e2767328bb0f9e00d9552c274096b635d56b37a730fc7',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 13:09:17',	'2026-01-03 06:09:16.998288'),
(142,	3,	'::1',	0,	'9b850783c7044a5294f8809ecdd20e01519e147a34c05380e5d99a1763713647ed69fe7f4d287ee302365285bed1e8b54099b4d25e1b82541f05b6d3ab93f13d',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-10 13:12:10',	'2026-01-03 06:12:10.407512'),
(143,	1,	'::1',	0,	'94e5ec4db8e3cbbda7f5bea898ae8bc8888f97397cfb56c8aa59c2d45652d17474235919738d9c14266553038274165ae05b9c4a1abe00d379cc2daed0d2909e',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 13:13:01',	'2026-01-03 06:13:01.500702'),
(144,	1,	'::1',	0,	'03e22aeb4d9ada383c96a02cdd612dd835adb22249a038e561bd86128c0dff470e448e5688759a645fe752b8f4cd0186419f618601e7a9ebf75edf1b0dd6651b',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 13:24:47',	'2026-01-03 06:24:47.437760'),
(145,	3,	'::1',	0,	'58b4abd7e6f444c4fb63a6451386a6b53d75b9be25dff6b094bdfffd6fc4d6ac3b389b8ddcc57c108b627071984620b7b436a8ad5c6ac7c6da21c3c49ecdbb67',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-10 13:25:47',	'2026-01-03 06:25:46.791654'),
(146,	1,	'::1',	0,	'b59be1607db7551e3de21dbc17f4e53109458ed35489f0d1df90b5a1434f29dcda6b6e77f4dd532bef1e208a83d322fb1ed5a14fe0466906b2bfaebcf3376666',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',	'2026-01-10 13:33:16',	'2026-01-03 06:33:15.756833'),
(147,	3,	'::1',	0,	'5c9ab50fd99283ce6690b092e4f015149c7f8afee3e58aeee536a87a5057327df27cc817a06d9ce2051ed5089d34c2dd705ef934d93662fdfa6074f50197c43e',	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',	'2026-01-10 13:33:56',	'2026-01-03 06:33:56.372751');

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
(1,	1,	3,	NULL,	95.00,	NULL,	'graded',	NULL,	1,	NULL,	'2026-01-03 03:00:42.864407',	0),
(2,	1,	4,	NULL,	88.50,	NULL,	'graded',	NULL,	1,	NULL,	'2026-01-03 03:00:42.864407',	0),
(3,	5,	10,	'/uploads/student-work.pdf',	92.50,	'Excellent work! Well done.',	'graded',	'2026-01-03 10:02:31',	9,	'Here is my assignment submission content',	'2026-01-03 03:02:31.350689',	0);

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
(1,	'teacher1@edu.vn',	'TEACHER',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	0,	'2026-01-03 13:33:16',	'',	'2026-01-01 14:56:07.968075',	'2026-01-03 06:33:15.000000'),
(2,	'teacher2@edu.vn',	'TEACHER',	1,	'',	NULL,	0,	NULL,	'',	'2026-01-01 14:56:07.968075',	'2026-01-01 14:56:08.046684'),
(3,	'student1@edu.vn',	'STUDENT',	1,	'$2a$12$XcxFjJ33b1m4IkHF8fffGuRq/5qCSnl6AGTqDiPm2wnGCq6XqHlvi',	NULL,	0,	'2026-01-03 13:33:56',	'',	'2026-01-01 14:56:07.968075',	'2026-01-03 06:33:56.000000'),
(4,	'student2@edu.vn',	'STUDENT',	1,	'',	NULL,	0,	NULL,	'',	'2026-01-01 14:56:07.968075',	'2026-01-01 14:56:08.046684'),
(5,	'student3@edu.vn',	'STUDENT',	1,	'',	NULL,	0,	NULL,	'',	'2026-01-01 14:56:07.968075',	'2026-01-01 14:56:08.046684'),
(6,	'user@example.com',	'STUDENT',	1,	'$2b$10$advHo9aX4d8FyJl4qsucUuzN0qKCEV.L3aZX7vFGKinJQNtDPyy.e',	NULL,	0,	NULL,	'Nguyen Van A',	'2026-01-01 14:56:51.090977',	'2026-01-01 14:56:51.090977'),
(7,	'teacher1@test.com',	'TEACHER',	1,	'$2b$10$3BYWrq5w83LgynGtercjKOuZqrKaeTjB6TUVbLkiVYadMREaaqsRG',	NULL,	0,	'2026-01-01 23:30:17',	'Nguyen Van Teacher Updated',	'2026-01-01 15:23:29.853475',	'2026-01-01 16:30:16.000000'),
(8,	'student1@test.com',	'STUDENT',	1,	'$2b$10$Ax7icKFMHS4MQW4gau6N0OdUVJrrzjoBMhcYweEKqo/wjjdB2Sx9e',	NULL,	0,	'2026-01-01 23:08:50',	'Tran Thi Student',	'2026-01-01 15:24:10.631865',	'2026-01-01 16:08:49.000000'),
(9,	'testteacher@test.com',	'TEACHER',	1,	'$2b$10$V6yj/z9rnwh9ykxVa4eCROfMclQwNPlFko.MVauh1NgD8E0Uh5jTO',	NULL,	0,	'2026-01-03 11:01:51',	'Test Teacher',	'2026-01-03 02:47:27.985638',	'2026-01-03 04:01:50.000000'),
(10,	'teststudent@test.com',	'STUDENT',	1,	'$2b$10$.TloTH.WZ.gBjlnu0RouQuAAzbsNs.F4zQXpcyVb3CMgLCHOtrGoi',	NULL,	0,	'2026-01-03 11:01:51',	'Test Student',	'2026-01-03 02:48:21.903224',	'2026-01-03 04:01:51.000000'),
(11,	'teacher2_1366872389@test.com',	'TEACHER',	1,	'$2b$10$hsYVoFkdp7SYlmd10XpeIezBhZ0Isynvx1EPq1BehCZ.B1bt9dsg6',	NULL,	0,	'2026-01-03 10:18:57',	'Teacher 2',	'2026-01-03 03:18:57.346413',	'2026-01-03 03:18:57.000000'),
(12,	'user3_1909826298@test.com',	'STUDENT',	1,	'$2b$10$o0Ak0ihkh1FU.sb257rUzuOw2JLKD0oSUrb8Z3o7oYiiHEtIRXeom',	NULL,	0,	'2026-01-03 10:18:58',	'User 3',	'2026-01-03 03:18:57.904799',	'2026-01-03 03:18:58.000000'),
(13,	'teacher2_1237191969@test.com',	'TEACHER',	1,	'$2b$10$KczP7MiIyNaG1l/RsjlRueDWDzzwrELVDRTT8YObntOuCqnbp3EPu',	NULL,	0,	'2026-01-03 10:22:52',	'Teacher 2',	'2026-01-03 03:22:52.007715',	'2026-01-03 03:22:52.000000'),
(14,	'user3_1806719341@test.com',	'STUDENT',	1,	'$2b$10$8h4tQX5eDba/N7MV7EQYXOj04DTm2EWX.wVZA8XvtQgr0ytAXV9.u',	NULL,	0,	'2026-01-03 10:22:53',	'User 3',	'2026-01-03 03:22:52.785393',	'2026-01-03 03:22:52.000000'),
(15,	'teacher2_1644259015@test.com',	'TEACHER',	1,	'$2b$10$OnAALRBN2oeKNjULuCtOT.Y92P2ZXImJO.KwS/vVImT/px90tWKAm',	NULL,	0,	'2026-01-03 10:24:28',	'Teacher 2',	'2026-01-03 03:24:27.616368',	'2026-01-03 03:24:27.000000'),
(16,	'user3_672286863@test.com',	'STUDENT',	1,	'$2b$10$O1FuDdtK0BbjyBuV5F4CbuYz7ZqXZEtFPqw2hZ/8esN56QANV0fXW',	NULL,	0,	'2026-01-03 10:24:28',	'User 3',	'2026-01-03 03:24:28.253339',	'2026-01-03 03:24:28.000000'),
(17,	'teacher2_1153811282@test.com',	'TEACHER',	1,	'$2b$10$0IhIdzTsX/YSeHCkCNDH5e31o.89ZfWB7D25pDbSEbiGB6s6a9DKy',	NULL,	0,	'2026-01-03 10:25:53',	'Teacher 2',	'2026-01-03 03:25:52.706577',	'2026-01-03 03:25:52.000000'),
(18,	'user3_303086934@test.com',	'STUDENT',	1,	'$2b$10$TJPYDM5iuNhAyC0zxaBuVOlQ4IG8tJ4fMt7rodypHQxX/dYCMUrXW',	NULL,	0,	'2026-01-03 10:25:54',	'User 3',	'2026-01-03 03:25:53.654778',	'2026-01-03 03:25:53.000000'),
(19,	'teacher2_327482707@test.com',	'TEACHER',	1,	'$2b$10$.Zfwu00oqXMltHRirkbt5uejtmY5I2W3HT25OGTPgy2ovrtNGjGdi',	NULL,	0,	'2026-01-03 10:26:01',	'Teacher 2',	'2026-01-03 03:26:00.622500',	'2026-01-03 03:26:00.000000'),
(20,	'user3_1963797135@test.com',	'STUDENT',	1,	'$2b$10$6M0xyIoTIK.b8VoLK68GnuiPlOZntbqSAlxOE49d/2yDbjqPvAlQ.',	NULL,	0,	'2026-01-03 10:26:01',	'User 3',	'2026-01-03 03:26:01.347783',	'2026-01-03 03:26:01.000000'),
(21,	'teacher2_908995945@test.com',	'TEACHER',	1,	'$2b$10$8T0Ial5H8ChxqbhcuHs7auRY8XlaJppJK1h1csrMeDr2KeHCocN.u',	NULL,	0,	'2026-01-03 10:26:53',	'Teacher 2',	'2026-01-03 03:26:52.836934',	'2026-01-03 03:26:52.000000'),
(22,	'user3_923275335@test.com',	'STUDENT',	1,	'$2b$10$pO2vXs9WLN4ooVepfmXMjeXdCbo4XKuETG53JV9hdAHuJZh7RzTTi',	NULL,	0,	'2026-01-03 10:26:54',	'User 3',	'2026-01-03 03:26:53.621603',	'2026-01-03 03:26:53.000000'),
(23,	'chattest_1386409254@test.com',	'TEACHER',	1,	'$2b$10$u5vuD98E/h2/HLLGvs8j5.jRx/ehadMiWMZdLg9so0UKgIpk.7CxG',	NULL,	0,	'2026-01-03 10:35:14',	'Teacher 2',	'2026-01-03 03:35:13.787478',	'2026-01-03 03:35:13.000000'),
(24,	'chattest_1504426933@test.com',	'TEACHER',	1,	'$2b$10$UhYzux5BnOODxnt0IAn8G.eelM5lGsFZnTNkMdUJIL0cytmlR5HHK',	NULL,	0,	'2026-01-03 10:36:18',	'Teacher 2',	'2026-01-03 03:36:17.870933',	'2026-01-03 03:36:17.000000'),
(25,	'chattest_703724679@test.com',	'TEACHER',	1,	'$2b$10$n4tAleJtF/9ofvqiIes1Ve/HJuEWgm3ImNW.4BbBcubWOIl0Uw5Ma',	NULL,	0,	'2026-01-03 10:52:52',	'Teacher 2',	'2026-01-03 03:52:51.608325',	'2026-01-03 03:52:51.000000'),
(26,	'chattest_362099034@test.com',	'TEACHER',	1,	'$2b$10$pqBBxDNy9sYDnunLCIaUruTzhXfyHB9EOEp9zoTEjRbyEbQ1K8Ddy',	NULL,	0,	'2026-01-03 10:53:47',	'Teacher 2',	'2026-01-03 03:53:47.140299',	'2026-01-03 03:53:47.000000'),
(27,	'teacher2_567107663@test.com',	'TEACHER',	1,	'$2b$10$Sc7542OPPYoKkmcfdHg9teOBy1CBX/wCR46Zh5GvimfVyXwvH606q',	NULL,	0,	'2026-01-03 10:53:55',	'Teacher 2',	'2026-01-03 03:53:54.418356',	'2026-01-03 03:53:54.000000'),
(28,	'user3_208592480@test.com',	'STUDENT',	1,	'$2b$10$QbGHzU4Jk6C65EQF6IQq3OVuIByuoVZabmCwFgKcNgX5OwoeW/6S6',	NULL,	0,	'2026-01-03 10:53:55',	'User 3',	'2026-01-03 03:53:55.184376',	'2026-01-03 03:53:55.000000'),
(29,	'teacher2_1358641146@test.com',	'TEACHER',	1,	'$2b$10$5a38d2dBf94pGEks1tUvrueaUgQJsFndLFk1UngD1fDRo87dInU4a',	NULL,	0,	'2026-01-03 10:57:52',	'Teacher 2',	'2026-01-03 03:57:51.913569',	'2026-01-03 03:57:52.000000'),
(30,	'user3_848621567@test.com',	'STUDENT',	1,	'$2b$10$Dw2Ibp7u7G0xhkoQhSXDjeMUyXavO4/IpKOkk8//0We003pqhWGoW',	NULL,	0,	'2026-01-03 10:57:53',	'User 3',	'2026-01-03 03:57:52.702998',	'2026-01-03 03:57:52.000000'),
(31,	'teacher2_969307492@test.com',	'TEACHER',	1,	'$2b$10$ZuHiqfuflbFlTl5o9kteJOi/mXX5YG/BJCFgiGkFAR6ODyjYcRkfi',	NULL,	0,	'2026-01-03 10:59:23',	'Teacher 2',	'2026-01-03 03:59:22.853417',	'2026-01-03 03:59:23.000000'),
(32,	'user3_1348445546@test.com',	'STUDENT',	1,	'$2b$10$JaEfnkRPI3CBUKDqupqQF.ym.nlHFri7vioEQVYuHu7Me0LosFrpe',	NULL,	0,	'2026-01-03 10:59:24',	'User 3',	'2026-01-03 03:59:24.147801',	'2026-01-03 03:59:24.000000'),
(33,	'chattest_1813383557@test.com',	'TEACHER',	1,	'$2b$10$U4nJWPrGlmQtIr5duJSF/ODgDxd9MfnBuOCapIYEW5S07xJW3qLBC',	NULL,	0,	'2026-01-03 11:01:52',	'Teacher 2',	'2026-01-03 04:01:51.423580',	'2026-01-03 04:01:51.000000');

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

-- 2026-01-07 07:43:07 UTC