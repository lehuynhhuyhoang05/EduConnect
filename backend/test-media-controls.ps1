# ============================================
# TEST MEDIA CONTROLS (MIC, CAM, SCREEN SHARE)
# ============================================

$API_URL = "http://localhost:3000"
$ROOM_ID = "test-media-room"
$SESSION_ID = 1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST MEDIA CONTROLS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ===================== STEP 1: LOGIN USERS =====================
Write-Host "[STEP 1] Logging in users..." -ForegroundColor Yellow

# Login Teacher
$teacherLogin = @{
    email = "teacher@test.com"
    password = "123456"
} | ConvertTo-Json

try {
    $teacherResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $teacherLogin -ContentType "application/json"
    $teacherToken = $teacherResponse.tokens.accessToken
    $teacherId = $teacherResponse.user.id
    Write-Host "[OK] Teacher logged in: ID=$teacherId" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Teacher login failed: $_" -ForegroundColor Red
    exit 1
}

# Login Student
$studentLogin = @{
    email = "student1@test.com"
    password = "123456"
} | ConvertTo-Json

try {
    $studentResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $studentLogin -ContentType "application/json"
    $studentToken = $studentResponse.tokens.accessToken
    $studentId = $studentResponse.user.id
    Write-Host "[OK] Student logged in: ID=$studentId" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Student login failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  LOGGED IN SUCCESSFULLY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teacher Token: $($teacherToken.Substring(0,20))..." -ForegroundColor Gray
Write-Host "Student Token: $($studentToken.Substring(0,20))..." -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  MANUAL TEST INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Tokens đã sẵn sàng! Bây giờ thực hiện test thủ công:" -ForegroundColor White
Write-Host ""
Write-Host "1. MỞ 2 TAB TRÌNH DUYỆT:" -ForegroundColor Yellow
Write-Host "   - Tab 1: http://localhost:5173" -ForegroundColor White
Write-Host "   - Tab 2: http://localhost:5173 (Incognito)" -ForegroundColor White
Write-Host ""
Write-Host "2. ĐĂNG NHẬP:" -ForegroundColor Yellow
Write-Host "   Tab 1: teacher@test.com / 123456" -ForegroundColor White
Write-Host "   Tab 2: student1@test.com / 123456" -ForegroundColor White
Write-Host ""
Write-Host "3. KẾT NỐI SOCKET VÀ VÀO PHÒNG:" -ForegroundColor Yellow
Write-Host "   Room ID: $ROOM_ID" -ForegroundColor White
Write-Host "   Session ID: $SESSION_ID" -ForegroundColor White
Write-Host "   Tab 1: Check 'Tôi là Host'" -ForegroundColor White
Write-Host ""
Write-Host "4. TEST MIC (🎤):" -ForegroundColor Yellow
Write-Host "   - Ở Tab Student: Click nút Mic" -ForegroundColor White
Write-Host "   - Kiểm tra:" -ForegroundColor Cyan
Write-Host "     ✓ Tab Student: Icon đổi 🎤 → 🔇, màu xanh → đỏ" -ForegroundColor Gray
Write-Host "     ✓ Tab Teacher: Thấy Student có icon 🔇 đỏ" -ForegroundColor Gray
Write-Host "     ✓ Backend logs: [MEDIA] User X: Mic=false" -ForegroundColor Gray
Write-Host "     ✓ File logs: backend/logs/live-sessions/*.log" -ForegroundColor Gray
Write-Host ""
Write-Host "5. TEST CAMERA (📹):" -ForegroundColor Yellow
Write-Host "   - Ở Tab Student: Click nút Camera" -ForegroundColor White
Write-Host "   - Kiểm tra:" -ForegroundColor Cyan
Write-Host "     ✓ Tab Student: Icon đổi 📹 → 📷, màu xanh → đỏ" -ForegroundColor Gray
Write-Host "     ✓ Tab Teacher: Thấy Student có icon 📷 đỏ" -ForegroundColor Gray
Write-Host "     ✓ Backend logs: [MEDIA] User X: Cam=false" -ForegroundColor Gray
Write-Host ""
Write-Host "6. TEST SCREEN SHARE (🖥️):" -ForegroundColor Yellow
Write-Host "   - Ở Tab Student: Click nút Screen Share" -ForegroundColor White
Write-Host "   - Kiểm tra:" -ForegroundColor Cyan
Write-Host "     ✓ Tab Student: Màu xám → xanh dương" -ForegroundColor Gray
Write-Host "     ✓ Tab Teacher: Thấy Student có icon 🖥️ xanh dương" -ForegroundColor Gray
Write-Host "     ✓ Backend logs: [SCREEN SHARE] User X STARTED" -ForegroundColor Gray
Write-Host ""
Write-Host "7. KIỂM TRA BACKEND LOGS:" -ForegroundColor Yellow
Write-Host "   - Terminal backend sẽ hiển thị:" -ForegroundColor White
Write-Host "     [MEDIA] User 2 (Student 1): Mic=false, Cam=true, Screen=false" -ForegroundColor Green
Write-Host "     [SCREEN SHARE] User 2 (Student 1) STARTED screen sharing" -ForegroundColor Green
Write-Host ""
Write-Host "8. KIỂM TRA FILE LOGS:" -ForegroundColor Yellow
Write-Host "   - Mở file: backend/logs/live-sessions/<date>.log" -ForegroundColor White
Write-Host "   - Tìm các dòng:" -ForegroundColor Cyan
Write-Host "     Screen share started" -ForegroundColor Gray
Write-Host "     Screen share stopped" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXPECTED BACKEND RESPONSES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Khi emit 'media-state':" -ForegroundColor Yellow
Write-Host @"
{
  "success": true,
  "state": {
    "userId": 2,
    "userName": "Student 1",
    "audio": false,
    "video": true,
    "screen": false,
    "timestamp": "2026-01-03T12:00:00.000Z"
  }
}
"@ -ForegroundColor Green

Write-Host "`nKhi emit 'screen-share-start':" -ForegroundColor Yellow
Write-Host @"
{
  "success": true,
  "message": "Screen share started"
}
"@ -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CHECK BACKEND STATUS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check backend health
try {
    $health = Invoke-RestMethod -Uri "$API_URL/api/health" -Method GET
    Write-Host "[✓] Backend is running: $API_URL" -ForegroundColor Green
} catch {
    Write-Host "[✗] Backend is NOT running on $API_URL" -ForegroundColor Red
    Write-Host "    Please start backend: cd backend && npm run start:dev" -ForegroundColor Yellow
}

# Check WebSocket
Write-Host "[i] WebSocket endpoint: http://localhost:3000/live" -ForegroundColor Cyan
Write-Host "[i] Make sure to check browser DevTools → Console for WebSocket messages" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEBUG COMMANDS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Xem logs realtime:" -ForegroundColor Yellow
Write-Host "  Get-Content backend/logs/live-sessions/*.log -Wait -Tail 20" -ForegroundColor White
Write-Host ""
Write-Host "Xem console backend:" -ForegroundColor Yellow
Write-Host "  Terminal nơi chạy 'npm run start:dev'" -ForegroundColor White
Write-Host ""
Write-Host "Xem browser console:" -ForegroundColor Yellow
Write-Host "  F12 → Console tab" -ForegroundColor White
Write-Host "  Kiểm tra WebSocket events" -ForegroundColor White
Write-Host ""

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  SCRIPT COMPLETED" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
Write-Host "Tokens are ready. Follow the manual test steps above." -ForegroundColor White
Write-Host "Press Ctrl+C to exit or close this window." -ForegroundColor Gray
Write-Host ""

# Keep window open
Read-Host "Press Enter to exit"
