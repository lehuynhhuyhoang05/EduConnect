-- ============================================
-- FIX TRIGGER ERROR (Optional)
-- Chỉ chạy nếu muốn trigger hoạt động
-- ============================================

-- OPTION 1: Set global variable (yêu cầu quyền admin)
-- SET GLOBAL log_bin_trust_function_creators = 1;

-- OPTION 2: Tạo trigger với DETERMINISTIC (nếu option 1 không được)
DROP TRIGGER IF EXISTS `tr_live_sessions_participants_insert`;

DELIMITER $$

CREATE TRIGGER `tr_live_sessions_participants_insert`
AFTER INSERT ON `chat_messages`
FOR EACH ROW
DETERMINISTIC
BEGIN
    IF NEW.room_type = 'live_session' THEN
        UPDATE `live_sessions` 
        SET `current_participants` = (
            SELECT COUNT(DISTINCT sender_id) 
            FROM `chat_messages` 
            WHERE room_id = NEW.room_id
        )
        WHERE `room_id` = NEW.room_id;
    END IF;
END$$

DELIMITER ;

-- NOTE: Nếu vẫn lỗi, bỏ qua trigger này.
-- Backend sẽ tự update current_participants qua API.
