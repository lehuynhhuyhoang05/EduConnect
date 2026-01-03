# Live Sessions Module Test Script
# Run: .\test-live-sessions.ps1

$BASE_URL = "http://localhost:3000/api"
$ErrorActionPreference = "Stop"

Write-Host "`n========================================"
Write-Host "  TESTING LIVE SESSIONS MODULE"
Write-Host "========================================" -ForegroundColor Cyan

# Helper function
function Test-Api {
    param($Name, $Method, $Uri, $Body, $Headers)
    Write-Host "`n[$Name]..." -ForegroundColor Yellow
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            ContentType = "application/json"
        }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
        
        $result = Invoke-RestMethod @params
        Write-Host "  SUCCESS" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        throw
    }
}

try {
    # 1. Login as Teacher
    $teacherLogin = Test-Api -Name "1. Login Teacher" -Method "Post" `
        -Uri "$BASE_URL/auth/login" `
        -Body @{ email = "testteacher@test.com"; password = "TestPass123" }
    $teacherToken = $teacherLogin.tokens.accessToken
    $teacherHeaders = @{ Authorization = "Bearer $teacherToken" }
    Write-Host "  Teacher ID: $($teacherLogin.user.id)"

    # 2. Login as Student
    $studentLogin = Test-Api -Name "2. Login Student" -Method "Post" `
        -Uri "$BASE_URL/auth/login" `
        -Body @{ email = "teststudent@test.com"; password = "TestPass123" }
    $studentToken = $studentLogin.tokens.accessToken
    $studentHeaders = @{ Authorization = "Bearer $studentToken" }
    Write-Host "  Student ID: $($studentLogin.user.id)"

    # 3. Create a class for testing
    $class = Test-Api -Name "3. Create Class" -Method "Post" `
        -Uri "$BASE_URL/classes" `
        -Headers $teacherHeaders `
        -Body @{ name = "Live Session Test Class"; description = "Testing live sessions"; subject = "Testing" }
    $classId = $class.id
    Write-Host "  Class ID: $classId, Code: $($class.classCode)"

    # 4. Student join class
    $joinResult = Test-Api -Name "4. Student Join Class" -Method "Post" `
        -Uri "$BASE_URL/classes/join" `
        -Headers $studentHeaders `
        -Body @{ classCode = $class.classCode }
    Write-Host "  Joined successfully"

    # 5. Create a scheduled live session
    $scheduledTime = (Get-Date).AddHours(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $session = Test-Api -Name "5. Create Live Session (Scheduled)" -Method "Post" `
        -Uri "$BASE_URL/classes/$classId/sessions" `
        -Headers $teacherHeaders `
        -Body @{ 
            title = "Test Live Session"
            description = "Testing WebRTC signaling"
            scheduledAt = $scheduledTime
            maxParticipants = 30
        }
    $sessionId = $session.id
    Write-Host "  Session ID: $sessionId, Room: $($session.roomId)"

    # 6. Get session details
    $sessionDetails = Test-Api -Name "6. Get Session Details" -Method "Get" `
        -Uri "$BASE_URL/sessions/$sessionId" `
        -Headers $teacherHeaders
    Write-Host "  Title: $($sessionDetails.title), Status: $($sessionDetails.status)"

    # 7. Update session
    $updatedSession = Test-Api -Name "7. Update Session" -Method "Put" `
        -Uri "$BASE_URL/sessions/$sessionId" `
        -Headers $teacherHeaders `
        -Body @{ title = "Updated Live Session Title"; maxParticipants = 50 }
    Write-Host "  Updated title: $($updatedSession.title)"

    # 8. Start session
    $startedSession = Test-Api -Name "8. Start Session" -Method "Post" `
        -Uri "$BASE_URL/sessions/$sessionId/start" `
        -Headers $teacherHeaders
    Write-Host "  Status: $($startedSession.status), Started: $($startedSession.startedAt)"

    # 9. Student join session
    $joinSession = Test-Api -Name "9. Student Join Session" -Method "Post" `
        -Uri "$BASE_URL/sessions/$sessionId/join" `
        -Headers $studentHeaders `
        -Body @{ socketId = "test-socket-123" }
    Write-Host "  Participant ID: $($joinSession.id)"

    # 10. Get session with participants
    $sessionWithParticipants = Test-Api -Name "10. Get Session with Participants" -Method "Get" `
        -Uri "$BASE_URL/sessions/$sessionId" `
        -Headers $teacherHeaders
    Write-Host "  Participants: $($sessionWithParticipants.participants.Count)"

    # 11. Get session stats
    $stats = Test-Api -Name "11. Get Session Stats" -Method "Get" `
        -Uri "$BASE_URL/sessions/$sessionId/stats" `
        -Headers $teacherHeaders
    Write-Host "  Current: $($stats.currentParticipants), Total Joins: $($stats.totalJoins)"

    # 12. Student leave session
    $leaveResult = Test-Api -Name "12. Student Leave Session" -Method "Post" `
        -Uri "$BASE_URL/sessions/$sessionId/leave" `
        -Headers $studentHeaders `
        -Body @{}
    Write-Host "  Left successfully"

    # 13. End session
    $endedSession = Test-Api -Name "13. End Session" -Method "Post" `
        -Uri "$BASE_URL/sessions/$sessionId/end" `
        -Headers $teacherHeaders
    Write-Host "  Status: $($endedSession.status), Duration: $($endedSession.durationSeconds)s"

    # 14. Get all sessions
    $allSessions = Test-Api -Name "14. Get All Sessions" -Method "Get" `
        -Uri "$BASE_URL/sessions" `
        -Headers $teacherHeaders
    Write-Host "  Total sessions: $($allSessions.meta.total)"

    # 15. Create instant session (no scheduled time)
    $instantSession = Test-Api -Name "15. Create Instant Session" -Method "Post" `
        -Uri "$BASE_URL/classes/$classId/sessions" `
        -Headers $teacherHeaders `
        -Body @{ title = "Instant Session"; description = "Start now" }
    Write-Host "  Instant Session ID: $($instantSession.id)"

    # 16. Delete scheduled session (cleanup)
    $deleteResult = Test-Api -Name "16. Delete Instant Session" -Method "Delete" `
        -Uri "$BASE_URL/sessions/$($instantSession.id)" `
        -Headers $teacherHeaders
    Write-Host "  Deleted successfully"

    Write-Host "`n========================================"
    Write-Host "  ALL LIVE SESSIONS TESTS PASSED!"
    Write-Host "========================================" -ForegroundColor Green

} catch {
    Write-Host "`n========================================"
    Write-Host "  TEST FAILED!"
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
