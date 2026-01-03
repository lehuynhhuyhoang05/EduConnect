# Live Sessions Module - COMPREHENSIVE Test Script
# Covers: Happy paths, Error cases, Edge cases, Authorization
# Run: .\test-live-sessions-full.ps1

$BASE_URL = "http://localhost:3000/api"
$ErrorActionPreference = "Continue"
$script:passCount = 0
$script:failCount = 0

Write-Host "`n" + "="*60
Write-Host "  COMPREHENSIVE LIVE SESSIONS MODULE TESTING"
Write-Host "="*60 -ForegroundColor Cyan

function Test-Success {
    param($Name, $Method, $Uri, $Body, $Headers, $ExpectedField)
    Write-Host "`n[TEST] $Name" -ForegroundColor Yellow
    try {
        $params = @{ Uri = $Uri; Method = $Method; ContentType = "application/json" }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
        
        $result = Invoke-RestMethod @params
        if ($ExpectedField -and -not $result.$ExpectedField) {
            Write-Host "  FAIL: Missing expected field '$ExpectedField'" -ForegroundColor Red
            $script:failCount++
            return $null
        }
        Write-Host "  PASS" -ForegroundColor Green
        $script:passCount++
        return $result
    } catch {
        Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
        $script:failCount++
        return $null
    }
}

function Test-Error {
    param($Name, $Method, $Uri, $Body, $Headers, $ExpectedStatus, $ExpectedMessage)
    Write-Host "`n[TEST] $Name" -ForegroundColor Yellow
    try {
        $params = @{ Uri = $Uri; Method = $Method; ContentType = "application/json" }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
        
        $result = Invoke-RestMethod @params
        Write-Host "  FAIL: Expected error but got success" -ForegroundColor Red
        $script:failCount++
        return $false
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($ExpectedStatus -and $statusCode -ne $ExpectedStatus) {
            Write-Host "  FAIL: Expected status $ExpectedStatus but got $statusCode" -ForegroundColor Red
            $script:failCount++
            return $false
        }
        if ($ExpectedMessage -and $errorBody.message -notlike "*$ExpectedMessage*") {
            Write-Host "  FAIL: Expected message containing '$ExpectedMessage'" -ForegroundColor Red
            Write-Host "        Got: $($errorBody.message)" -ForegroundColor Yellow
            $script:failCount++
            return $false
        }
        Write-Host "  PASS (Status: $statusCode)" -ForegroundColor Green
        $script:passCount++
        return $true
    }
}

# ============================================================
# SETUP: Create test users and get tokens
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "SETUP: Authentication" -ForegroundColor Cyan
Write-Host "-"*60

$teacherLogin = Test-Success -Name "Login Teacher" -Method "Post" `
    -Uri "$BASE_URL/auth/login" `
    -Body @{ email = "testteacher@test.com"; password = "TestPass123" } `
    -ExpectedField "tokens"
$teacherToken = $teacherLogin.tokens.accessToken
$teacherHeaders = @{ Authorization = "Bearer $teacherToken" }
$teacherId = $teacherLogin.user.id

$studentLogin = Test-Success -Name "Login Student" -Method "Post" `
    -Uri "$BASE_URL/auth/login" `
    -Body @{ email = "teststudent@test.com"; password = "TestPass123" } `
    -ExpectedField "tokens"
$studentToken = $studentLogin.tokens.accessToken
$studentHeaders = @{ Authorization = "Bearer $studentToken" }
$studentId = $studentLogin.user.id

# Create test class
$class = Test-Success -Name "Create Test Class" -Method "Post" `
    -Uri "$BASE_URL/classes" `
    -Headers $teacherHeaders `
    -Body @{ name = "Session Test Class $(Get-Random)"; description = "Testing"; subject = "Test" } `
    -ExpectedField "id"
$classId = $class.id

# Student join class
Test-Success -Name "Student Join Class" -Method "Post" `
    -Uri "$BASE_URL/classes/join" `
    -Headers $studentHeaders `
    -Body @{ classCode = $class.classCode } | Out-Null

# ============================================================
# TEST GROUP 1: VALIDATION ERRORS
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 1: VALIDATION ERRORS" -ForegroundColor Cyan
Write-Host "-"*60

# 1.1 Create session without title
Test-Error -Name "Create without title (should fail)" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $teacherHeaders `
    -Body @{ description = "No title" } `
    -ExpectedStatus 400

# 1.2 Create session with past scheduled time
$pastTime = (Get-Date).AddHours(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
Test-Error -Name "Create with past scheduledAt (should fail)" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $teacherHeaders `
    -Body @{ title = "Past Session"; scheduledAt = $pastTime } `
    -ExpectedStatus 400

# 1.3 Create with invalid maxParticipants
Test-Error -Name "Create with maxParticipants=1 (should fail)" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $teacherHeaders `
    -Body @{ title = "Small Session"; maxParticipants = 1 } `
    -ExpectedStatus 400

# ============================================================
# TEST GROUP 2: AUTHORIZATION ERRORS
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 2: AUTHORIZATION ERRORS" -ForegroundColor Cyan
Write-Host "-"*60

# 2.1 Student try to create session (should fail)
Test-Error -Name "Student create session (should fail - forbidden)" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $studentHeaders `
    -Body @{ title = "Student Session" } `
    -ExpectedStatus 403

# 2.2 Create session in class user doesn't own
$otherClass = Test-Success -Name "Create another class" -Method "Post" `
    -Uri "$BASE_URL/classes" `
    -Headers $teacherHeaders `
    -Body @{ name = "Other Class"; description = "Test"; subject = "Test" } `
    -ExpectedField "id"

# Create second teacher
$teacher2Email = "teacher2_$(Get-Random)@test.com"
try {
    Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" `
        -Body (@{ email = $teacher2Email; password = "TestPass123"; fullName = "Teacher 2"; role = "TEACHER" } | ConvertTo-Json)
} catch {}
$teacher2Login = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" `
    -Body (@{ email = $teacher2Email; password = "TestPass123" } | ConvertTo-Json)
$teacher2Headers = @{ Authorization = "Bearer $($teacher2Login.tokens.accessToken)" }

Test-Error -Name "Other teacher create in class (should fail)" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $teacher2Headers `
    -Body @{ title = "Unauthorized Session" } `
    -ExpectedStatus 403

# 2.3 Non-member try to view session
$session = Test-Success -Name "Create valid session" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $teacherHeaders `
    -Body @{ title = "Auth Test Session" } `
    -ExpectedField "roomId"
$sessionId = $session.id

Test-Error -Name "Non-member view session (should fail)" -Method "Get" `
    -Uri "$BASE_URL/sessions/$sessionId" `
    -Headers $teacher2Headers `
    -ExpectedStatus 403

# ============================================================
# TEST GROUP 3: BUSINESS LOGIC - SESSION LIFECYCLE
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 3: SESSION LIFECYCLE LOGIC" -ForegroundColor Cyan
Write-Host "-"*60

# 3.1 Cannot join session that hasn't started
Test-Error -Name "Join session before start (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/join" `
    -Headers $studentHeaders `
    -Body @{} `
    -ExpectedStatus 400

# 3.2 Cannot end session that hasn't started
Test-Error -Name "End session before start (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/end" `
    -Headers $teacherHeaders `
    -ExpectedStatus 400

# 3.3 Student cannot start session
Test-Error -Name "Student start session (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/start" `
    -Headers $studentHeaders `
    -ExpectedStatus 403

# 3.4 Start session successfully
$startedSession = Test-Success -Name "Teacher start session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/start" `
    -Headers $teacherHeaders `
    -ExpectedField "startedAt"

if ($startedSession.status -ne "live") {
    Write-Host "  VERIFY FAIL: Status should be 'live', got '$($startedSession.status)'" -ForegroundColor Red
    $script:failCount++
} else {
    Write-Host "  VERIFY: Status is 'live'" -ForegroundColor Green
}

# 3.5 Cannot start already started session
Test-Error -Name "Double start session (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/start" `
    -Headers $teacherHeaders `
    -ExpectedStatus 409

# 3.6 Now can join
$joinResult = Test-Success -Name "Student join live session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/join" `
    -Headers $studentHeaders `
    -Body @{} `
    -ExpectedField "id"

# 3.7 Double join should return same participant (or be idempotent)
$joinResult2 = Test-Success -Name "Double join (should be idempotent)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/join" `
    -Headers $studentHeaders `
    -Body @{}

# 3.8 Leave session
Test-Success -Name "Student leave session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/leave" `
    -Headers $studentHeaders `
    -Body @{} | Out-Null

# 3.9 Leave session when not in (should fail)
Test-Error -Name "Leave when not in session (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/leave" `
    -Headers $studentHeaders `
    -Body @{} `
    -ExpectedStatus 400

# 3.10 End session
$endedSession = Test-Success -Name "Teacher end session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/end" `
    -Headers $teacherHeaders `
    -ExpectedField "endedAt"

if ($endedSession.status -ne "ended") {
    Write-Host "  VERIFY FAIL: Status should be 'ended'" -ForegroundColor Red
    $script:failCount++
}

# 3.11 Cannot join ended session
Test-Error -Name "Join ended session (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/join" `
    -Headers $studentHeaders `
    -Body @{} `
    -ExpectedStatus 400

# 3.12 Cannot restart ended session
Test-Error -Name "Restart ended session (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$sessionId/start" `
    -Headers $teacherHeaders `
    -ExpectedStatus 400

# 3.13 Cannot delete live session
$liveSession = Test-Success -Name "Create session for delete test" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $teacherHeaders `
    -Body @{ title = "Delete Test Session" } `
    -ExpectedField "id"

Test-Success -Name "Start session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($liveSession.id)/start" `
    -Headers $teacherHeaders | Out-Null

Test-Error -Name "Delete live session (should fail)" -Method "Delete" `
    -Uri "$BASE_URL/sessions/$($liveSession.id)" `
    -Headers $teacherHeaders `
    -ExpectedStatus 400

# End it first then delete
Test-Success -Name "End session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($liveSession.id)/end" `
    -Headers $teacherHeaders | Out-Null

# ============================================================
# TEST GROUP 4: KICK & HOST CONTROLS
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 4: HOST CONTROLS" -ForegroundColor Cyan
Write-Host "-"*60

# Create and start new session for kick tests
$kickSession = Test-Success -Name "Create session for kick test" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $teacherHeaders `
    -Body @{ title = "Kick Test Session" } `
    -ExpectedField "id"

Test-Success -Name "Start session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($kickSession.id)/start" `
    -Headers $teacherHeaders | Out-Null

Test-Success -Name "Student join" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($kickSession.id)/join" `
    -Headers $studentHeaders `
    -Body @{} | Out-Null

# 4.1 Host cannot kick themselves
Test-Error -Name "Host kick self (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($kickSession.id)/kick/$teacherId" `
    -Headers $teacherHeaders `
    -ExpectedStatus 400

# 4.2 Student cannot kick others
Test-Error -Name "Student kick (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($kickSession.id)/kick/$teacherId" `
    -Headers $studentHeaders `
    -ExpectedStatus 403

# 4.3 Host kick student successfully
Test-Success -Name "Host kick student" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($kickSession.id)/kick/$studentId" `
    -Headers $teacherHeaders | Out-Null

# 4.4 Kick non-existent participant
Test-Error -Name "Kick non-participant (should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($kickSession.id)/kick/99999" `
    -Headers $teacherHeaders `
    -ExpectedStatus 400

# End session
Test-Success -Name "End kick test session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($kickSession.id)/end" `
    -Headers $teacherHeaders | Out-Null

# ============================================================
# TEST GROUP 5: CAPACITY LIMITS
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 5: CAPACITY LIMITS" -ForegroundColor Cyan
Write-Host "-"*60

# Create session with max 2 participants
$smallSession = Test-Success -Name "Create small session (max 2)" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/sessions" `
    -Headers $teacherHeaders `
    -Body @{ title = "Small Capacity Session"; maxParticipants = 2 } `
    -ExpectedField "id"

Test-Success -Name "Start small session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($smallSession.id)/start" `
    -Headers $teacherHeaders | Out-Null

# Teacher join (1/2)
Test-Success -Name "Teacher join (1/2)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($smallSession.id)/join" `
    -Headers $teacherHeaders `
    -Body @{} | Out-Null

# Student join (2/2) 
Test-Success -Name "Student join (2/2)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($smallSession.id)/join" `
    -Headers $studentHeaders `
    -Body @{} | Out-Null

# Create 3rd user and try to join
$user3Email = "user3_$(Get-Random)@test.com"
try {
    Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" `
        -Body (@{ email = $user3Email; password = "TestPass123"; fullName = "User 3"; role = "STUDENT" } | ConvertTo-Json)
} catch {}
$user3Login = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" `
    -Body (@{ email = $user3Email; password = "TestPass123" } | ConvertTo-Json)
$user3Headers = @{ Authorization = "Bearer $($user3Login.tokens.accessToken)" }

# User 3 join class first
Invoke-RestMethod -Uri "$BASE_URL/classes/join" -Method Post -ContentType "application/json" `
    -Headers $user3Headers -Body (@{ classCode = $class.classCode } | ConvertTo-Json) -ErrorAction SilentlyContinue

# Try to join full session
Test-Error -Name "Join full session (3/2 - should fail)" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($smallSession.id)/join" `
    -Headers $user3Headers `
    -Body @{} `
    -ExpectedStatus 409

# End session
Test-Success -Name "End small session" -Method "Post" `
    -Uri "$BASE_URL/sessions/$($smallSession.id)/end" `
    -Headers $teacherHeaders | Out-Null

# ============================================================
# TEST GROUP 6: STATISTICS & DATA INTEGRITY
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 6: STATISTICS & DATA INTEGRITY" -ForegroundColor Cyan
Write-Host "-"*60

# Get stats from ended session
$stats = Test-Success -Name "Get session stats" -Method "Get" `
    -Uri "$BASE_URL/sessions/$sessionId/stats" `
    -Headers $teacherHeaders `
    -ExpectedField "totalJoins"

Write-Host "  Stats: Joins=$($stats.totalJoins), Status=$($stats.status)" -ForegroundColor Gray

# Student cannot view stats
Test-Error -Name "Student view stats (should fail)" -Method "Get" `
    -Uri "$BASE_URL/sessions/$sessionId/stats" `
    -Headers $studentHeaders `
    -ExpectedStatus 403

# Get sessions with filters
$liveSessions = Test-Success -Name "Query live sessions" -Method "Get" `
    -Uri "$BASE_URL/sessions?status=live" `
    -Headers $teacherHeaders `
    -ExpectedField "data"

$endedSessions = Test-Success -Name "Query ended sessions" -Method "Get" `
    -Uri "$BASE_URL/sessions?status=ended" `
    -Headers $teacherHeaders `
    -ExpectedField "data"

Write-Host "  Live: $($liveSessions.data.Count), Ended: $($endedSessions.data.Count)" -ForegroundColor Gray

# ============================================================
# SUMMARY
# ============================================================
Write-Host "`n" + "="*60
Write-Host "  TEST SUMMARY"
Write-Host "="*60

$total = $script:passCount + $script:failCount
$percentage = if ($total -gt 0) { [math]::Round(($script:passCount / $total) * 100, 1) } else { 0 }

Write-Host "  PASSED: $($script:passCount)" -ForegroundColor Green
Write-Host "  FAILED: $($script:failCount)" -ForegroundColor $(if ($script:failCount -gt 0) { "Red" } else { "Green" })
Write-Host "  TOTAL:  $total"
Write-Host "  RATE:   $percentage%"

if ($script:failCount -eq 0) {
    Write-Host "`n  ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n  SOME TESTS FAILED!" -ForegroundColor Red
    exit 1
}
