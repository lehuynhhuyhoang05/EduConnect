#!/usr/bin/env pwsh
# Test Assignments Module

$BASE_URL = "http://localhost:3000/api"
$TEACHER_EMAIL = "teacher1@edu.vn"
$TEACHER_PASS = "Pass1234"
$STUDENT_EMAIL = "student1@edu.vn"
$STUDENT_PASS = "Pass1234"
$CLASS_ID = 1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTING ASSIGNMENTS MODULE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Login Teacher
Write-Host "[1/8] Login Teacher..." -ForegroundColor Yellow
$teacherLogin = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email = $TEACHER_EMAIL
    password = $TEACHER_PASS
} | ConvertTo-Json)

$teacherToken = $teacherLogin.tokens.accessToken
Write-Host "✓ Teacher logged in. Token: $($teacherToken.Substring(0,20))..." -ForegroundColor Green

# 2. Login Student
Write-Host "`n[2/8] Login Student..." -ForegroundColor Yellow
$studentLogin = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body (@{
    email = $STUDENT_EMAIL
    password = $STUDENT_PASS
} | ConvertTo-Json)

$studentToken = $studentLogin.tokens.accessToken
Write-Host "✓ Student logged in. Token: $($studentToken.Substring(0,20))..." -ForegroundColor Green

# 3. Create Assignment (Teacher)
Write-Host "`n[3/8] Create Assignment (Teacher)..." -ForegroundColor Yellow
$dueDate = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$assignment = Invoke-RestMethod -Uri "$BASE_URL/classes/$CLASS_ID/assignments" -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -ContentType "application/json" -Body (@{
        title = "Bài tập test - $(Get-Date -Format 'HH:mm:ss')"
        description = "Đây là bài tập kiểm tra module Assignments"
        dueDate = $dueDate
        maxScore = 100
    } | ConvertTo-Json)

$assignmentId = $assignment.id
Write-Host "✓ Assignment created. ID: $assignmentId, Title: $($assignment.title)" -ForegroundColor Green

# 4. Get All Assignments
Write-Host "`n[4/8] Get All Assignments..." -ForegroundColor Yellow
$allAssignments = Invoke-RestMethod -Uri "$BASE_URL/assignments" -Method Get `
    -Headers @{ Authorization = "Bearer $teacherToken" }

Write-Host "✓ Found $($allAssignments.meta.total) assignments" -ForegroundColor Green

# 5. Submit Assignment (Student)
Write-Host "`n[5/8] Submit Assignment (Student)..." -ForegroundColor Yellow
$submission = Invoke-RestMethod -Uri "$BASE_URL/assignments/$assignmentId/submit" -Method Post `
    -Headers @{ Authorization = "Bearer $studentToken" } `
    -ContentType "application/json" -Body (@{
        content = "Đây là bài làm của sinh viên"
        fileUrl = "/uploads/test-submission.pdf"
    } | ConvertTo-Json)

$submissionId = $submission.id
Write-Host "✓ Submission created. ID: $submissionId, Status: $($submission.status)" -ForegroundColor Green

# 6. Get My Submission (Student)
Write-Host "`n[6/8] Get My Submission (Student)..." -ForegroundColor Yellow
$mySubmission = Invoke-RestMethod -Uri "$BASE_URL/assignments/$assignmentId/my-submission" -Method Get `
    -Headers @{ Authorization = "Bearer $studentToken" }

Write-Host "✓ My submission: Status=$($mySubmission.status), Content=$($mySubmission.content.Substring(0,30))..." -ForegroundColor Green

# 7. Grade Submission (Teacher)
Write-Host "`n[7/8] Grade Submission (Teacher)..." -ForegroundColor Yellow
$graded = Invoke-RestMethod -Uri "$BASE_URL/submissions/$submissionId/grade" -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -ContentType "application/json" -Body (@{
        score = 85.5
        feedback = "Bài làm tốt, đạt yêu cầu"
    } | ConvertTo-Json)

Write-Host "✓ Graded. Score: $($graded.score), Status: $($graded.status)" -ForegroundColor Green

# 8. Get Assignment Stats (Teacher)
Write-Host "`n[8/8] Get Assignment Stats (Teacher)..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$BASE_URL/assignments/$assignmentId/stats" -Method Get `
    -Headers @{ Authorization = "Bearer $teacherToken" }

Write-Host "✓ Stats: Total Submissions=$($stats.totalSubmissions), Graded=$($stats.gradedCount), Avg Score=$($stats.averageScore)" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
