# Chat Module Test Script
# Run: .\test-chat.ps1

$BASE_URL = "http://localhost:3000/api"
$ErrorActionPreference = "Continue"
$script:passCount = 0
$script:failCount = 0

Write-Host "`n" + "="*60
Write-Host "  CHAT MODULE TESTING"
Write-Host "="*60 -ForegroundColor Cyan

function Test-Success {
    param($Name, $Method, $Uri, $Body, $Headers, $ExpectedField)
    Write-Host "`n[TEST] $Name" -ForegroundColor Yellow
    try {
        $params = @{ Uri = $Uri; Method = $Method; ContentType = "application/json" }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }

        $result = Invoke-RestMethod @params
        if ($ExpectedField -and $null -eq $result.$ExpectedField -and -not ($result.PSObject.Properties.Name -contains $ExpectedField)) {
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
    param($Name, $Method, $Uri, $Body, $Headers, $ExpectedStatus)
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
        if ($ExpectedStatus -and $statusCode -ne $ExpectedStatus) {
            Write-Host "  FAIL: Expected status $ExpectedStatus but got $statusCode" -ForegroundColor Red
            $script:failCount++
            return $false
        }
        Write-Host "  PASS (Status: $statusCode)" -ForegroundColor Green
        $script:passCount++
        return $true
    }
}

# ============================================================
# SETUP
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
    -Body @{ name = "Chat Test Class $(Get-Random)"; description = "Testing Chat"; subject = "Test" } `
    -ExpectedField "id"
$classId = $class.id

# Student join class
Test-Success -Name "Student Join Class" -Method "Post" `
    -Uri "$BASE_URL/classes/join" `
    -Headers $studentHeaders `
    -Body @{ classCode = $class.classCode } | Out-Null

# ============================================================
# TEST GROUP 1: GET CHAT ROOMS
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 1: CHAT ROOMS" -ForegroundColor Cyan
Write-Host "-"*60

$rooms = Test-Success -Name "Get teacher chat rooms" -Method "Get" `
    -Uri "$BASE_URL/chat/rooms" `
    -Headers $teacherHeaders

if ($rooms) {
    Write-Host "  Found $($rooms.Count) rooms" -ForegroundColor Gray
}

$studentRooms = Test-Success -Name "Get student chat rooms" -Method "Get" `
    -Uri "$BASE_URL/chat/rooms" `
    -Headers $studentHeaders

# ============================================================
# TEST GROUP 2: SEND MESSAGES
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 2: SEND MESSAGES" -ForegroundColor Cyan
Write-Host "-"*60

# 2.1 Teacher send first message
$msg1 = Test-Success -Name "Teacher send message" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $teacherHeaders `
    -Body @{ message = "Hello class! Welcome to the chat." } `
    -ExpectedField "id"

if ($msg1) {
    Write-Host "  Message ID: $($msg1.id)" -ForegroundColor Gray
}

# 2.2 Student send message
$msg2 = Test-Success -Name "Student send message" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $studentHeaders `
    -Body @{ message = "Hello teacher! Nice to be here." } `
    -ExpectedField "id"

# 2.3 Reply to message
$msg3 = Test-Success -Name "Reply to message" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $teacherHeaders `
    -Body @{ message = "Thanks for joining!"; replyTo = $msg2.id } `
    -ExpectedField "id"

if ($msg3 -and $msg3.replyTo) {
    Write-Host "  Reply to message ID: $($msg3.replyTo.id)" -ForegroundColor Gray
}

# 2.4 Empty message should fail
Test-Error -Name "Empty message (should fail)" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $teacherHeaders `
    -Body @{ message = "" } `
    -ExpectedStatus 400

# 2.5 Non-member cannot send
$teacher2Email = "chattest_$(Get-Random)@test.com"
try {
    Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" `
        -Body (@{ email = $teacher2Email; password = "TestPass123"; fullName = "Teacher 2"; role = "TEACHER" } | ConvertTo-Json)
} catch {}
$teacher2Login = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" `
    -Body (@{ email = $teacher2Email; password = "TestPass123" } | ConvertTo-Json)
$teacher2Headers = @{ Authorization = "Bearer $($teacher2Login.tokens.accessToken)" }

Test-Error -Name "Non-member send message (should fail)" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $teacher2Headers `
    -Body @{ message = "I shouldn't be able to send this" } `
    -ExpectedStatus 403

# ============================================================
# TEST GROUP 3: GET MESSAGES
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 3: GET MESSAGES" -ForegroundColor Cyan
Write-Host "-"*60

$messages = Test-Success -Name "Get class messages" -Method "Get" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $teacherHeaders `
    -ExpectedField "data"

if ($messages) {
    Write-Host "  Found $($messages.data.Count) messages, hasMore: $($messages.hasMore)" -ForegroundColor Gray
}

# 3.2 With pagination
$paginatedMsgs = Test-Success -Name "Get messages with limit" -Method "Get" `
    -Uri "$BASE_URL/classes/$classId/messages?limit=2" `
    -Headers $teacherHeaders `
    -ExpectedField "data"

if ($paginatedMsgs) {
    Write-Host "  Returned $($paginatedMsgs.data.Count) messages" -ForegroundColor Gray
}

# 3.3 Get single message
$singleMsg = Test-Success -Name "Get single message" -Method "Get" `
    -Uri "$BASE_URL/messages/$($msg1.id)" `
    -Headers $teacherHeaders `
    -ExpectedField "id"

# 3.4 Non-member cannot read
Test-Error -Name "Non-member read messages (should fail)" -Method "Get" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $teacher2Headers `
    -ExpectedStatus 403

# ============================================================
# TEST GROUP 4: EDIT MESSAGES
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 4: EDIT MESSAGES" -ForegroundColor Cyan
Write-Host "-"*60

# 4.1 Edit own message
$editedMsg = Test-Success -Name "Edit own message" -Method "Put" `
    -Uri "$BASE_URL/messages/$($msg1.id)" `
    -Headers $teacherHeaders `
    -Body @{ message = "Hello class! Welcome to the chat. (edited)" } `
    -ExpectedField "id"

if ($editedMsg -and $editedMsg.isEdited) {
    Write-Host "  isEdited: $($editedMsg.isEdited)" -ForegroundColor Gray
}

# 4.2 Cannot edit others' message
Test-Error -Name "Edit other's message (should fail)" -Method "Put" `
    -Uri "$BASE_URL/messages/$($msg2.id)" `
    -Headers $teacherHeaders `
    -Body @{ message = "Trying to edit student's message" } `
    -ExpectedStatus 403

# ============================================================
# TEST GROUP 5: DELETE MESSAGES
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 5: DELETE MESSAGES" -ForegroundColor Cyan
Write-Host "-"*60

# 5.1 Delete own message
$deleteResult = Test-Success -Name "Student delete own message" -Method "Delete" `
    -Uri "$BASE_URL/messages/$($msg2.id)" `
    -Headers $studentHeaders `
    -ExpectedField "success"

# 5.2 Verify deleted message
$deletedMsg = Test-Success -Name "Verify deleted message" -Method "Get" `
    -Uri "$BASE_URL/messages/$($msg2.id)" `
    -Headers $teacherHeaders `
    -ExpectedField "id"

if ($deletedMsg -and $deletedMsg.isDeleted) {
    Write-Host "  isDeleted: $($deletedMsg.isDeleted)" -ForegroundColor Gray
}

# 5.3 Teacher can delete student message (moderator)
$msg4 = Test-Success -Name "Student send another message" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $studentHeaders `
    -Body @{ message = "This will be deleted by teacher" } `
    -ExpectedField "id"

$modDelete = Test-Success -Name "Teacher delete student message (moderator)" -Method "Delete" `
    -Uri "$BASE_URL/messages/$($msg4.id)" `
    -Headers $teacherHeaders `
    -ExpectedField "success"

# ============================================================
# TEST GROUP 6: SEARCH MESSAGES
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 6: SEARCH MESSAGES" -ForegroundColor Cyan
Write-Host "-"*60

$searchResult = Test-Success -Name "Search messages" -Method "Get" `
    -Uri "$BASE_URL/chat/search?q=Hello" `
    -Headers $teacherHeaders `
    -ExpectedField "data"

if ($searchResult) {
    Write-Host "  Found $($searchResult.data.Count) matching messages" -ForegroundColor Gray
}

# Short query should return message
$shortSearch = Test-Success -Name "Short search query" -Method "Get" `
    -Uri "$BASE_URL/chat/search?q=H" `
    -Headers $teacherHeaders `
    -ExpectedField "data"

# ============================================================
# TEST GROUP 7: MESSAGE TYPES
# ============================================================
Write-Host "`n" + "-"*60
Write-Host "GROUP 7: MESSAGE TYPES" -ForegroundColor Cyan
Write-Host "-"*60

# 7.1 Image message with file URL
$imageMsg = Test-Success -Name "Send image message" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $teacherHeaders `
    -Body @{ 
        message = "Check out this image!"
        messageType = "image"
        fileUrl = "https://example.com/image.jpg"
    } `
    -ExpectedField "id"

if ($imageMsg) {
    Write-Host "  Type: $($imageMsg.messageType), FileUrl: $($imageMsg.fileUrl)" -ForegroundColor Gray
}

# 7.2 File message
$fileMsg = Test-Success -Name "Send file message" -Method "Post" `
    -Uri "$BASE_URL/classes/$classId/messages" `
    -Headers $teacherHeaders `
    -Body @{ 
        message = "Here's the assignment document"
        messageType = "file"
        fileUrl = "https://example.com/doc.pdf"
    } `
    -ExpectedField "id"

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
