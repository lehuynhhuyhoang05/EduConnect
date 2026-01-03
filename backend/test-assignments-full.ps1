#!/usr/bin/env pwsh
# Complete test for Assignments Module

$BASE_URL = "http://localhost:3000/api"
$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTING ASSIGNMENTS MODULE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    # 1. Login Teacher
    Write-Host "[1/9] Login Teacher..." -ForegroundColor Yellow
    $teacherLogin = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body (@{
        email = "testteacher@test.com"
        password = "TestPass123"
    } | ConvertTo-Json)
    $teacherToken = $teacherLogin.tokens.accessToken
    Write-Host "  Token: $($teacherToken.Substring(0,30))..." -ForegroundColor Green

    # 2. Login Student
    Write-Host "`n[2/9] Login Student..." -ForegroundColor Yellow
    $studentLogin = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body (@{
        email = "teststudent@test.com"
        password = "TestPass123"
    } | ConvertTo-Json)
    $studentToken = $studentLogin.tokens.accessToken
    Write-Host "  Token: $($studentToken.Substring(0,30))..." -ForegroundColor Green

    # 3. Create Class (Teacher)
    Write-Host "`n[3/9] Create Class (Teacher)..." -ForegroundColor Yellow
    $class = Invoke-RestMethod -Uri "$BASE_URL/classes" -Method Post `
        -Headers @{ Authorization = "Bearer $teacherToken" } `
        -ContentType "application/json" -Body (@{
            name = "Test Class for Assignments"
            description = "Class for testing assignments module"
            subject = "Testing"
        } | ConvertTo-Json)
    $classId = $class.id
    $classCode = $class.classCode
    Write-Host "  Class ID: $classId, Code: $classCode" -ForegroundColor Green

    # 4. Student Join Class
    Write-Host "`n[4/9] Student Join Class..." -ForegroundColor Yellow
    $join = Invoke-RestMethod -Uri "$BASE_URL/classes/join" -Method Post `
        -Headers @{ Authorization = "Bearer $studentToken" } `
        -ContentType "application/json" -Body (@{
            classCode = $classCode
        } | ConvertTo-Json)
    Write-Host "  Student joined class" -ForegroundColor Green

    # 5. Create Assignment (Teacher)
    Write-Host "`n[5/9] Create Assignment..." -ForegroundColor Yellow
    $dueDate = (Get-Date).AddDays(7).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $assignment = Invoke-RestMethod -Uri "$BASE_URL/classes/$classId/assignments" -Method Post `
        -Headers @{ Authorization = "Bearer $teacherToken" } `
        -ContentType "application/json" -Body (@{
            title = "Test Assignment $(Get-Date -Format 'HH:mm:ss')"
            description = "Complete the exercises 1-10"
            dueDate = $dueDate
            maxScore = 100
        } | ConvertTo-Json)
    $assignmentId = $assignment.id
    Write-Host "  Assignment ID: $assignmentId" -ForegroundColor Green
    Write-Host "  Title: $($assignment.title)" -ForegroundColor Green

    # 6. Submit Assignment (Student)
    Write-Host "`n[6/9] Submit Assignment (Student)..." -ForegroundColor Yellow
    $submission = Invoke-RestMethod -Uri "$BASE_URL/assignments/$assignmentId/submit" -Method Post `
        -Headers @{ Authorization = "Bearer $studentToken" } `
        -ContentType "application/json" -Body (@{
            content = "Here is my assignment submission content"
            fileUrl = "/uploads/student-work.pdf"
        } | ConvertTo-Json)
    $submissionId = $submission.id
    Write-Host "  Submission ID: $submissionId, Status: $($submission.status)" -ForegroundColor Green

    # 7. Get My Submission (Student)
    Write-Host "`n[7/9] Get My Submission..." -ForegroundColor Yellow
    $mySubmission = Invoke-RestMethod -Uri "$BASE_URL/assignments/$assignmentId/my-submission" -Method Get `
        -Headers @{ Authorization = "Bearer $studentToken" }
    Write-Host "  Status: $($mySubmission.status)" -ForegroundColor Green
    Write-Host "  Content: $($mySubmission.content)" -ForegroundColor Green

    # 8. Grade Submission (Teacher)
    Write-Host "`n[8/9] Grade Submission..." -ForegroundColor Yellow
    $graded = Invoke-RestMethod -Uri "$BASE_URL/submissions/$submissionId/grade" -Method Post `
        -Headers @{ Authorization = "Bearer $teacherToken" } `
        -ContentType "application/json" -Body (@{
            score = 92.5
            feedback = "Excellent work! Well done."
        } | ConvertTo-Json)
    Write-Host "  Score: $($graded.score)/$($assignment.maxScore)" -ForegroundColor Green
    Write-Host "  Status: $($graded.status)" -ForegroundColor Green

    # 9. Get Assignment Stats (Teacher)
    Write-Host "`n[9/9] Get Assignment Stats..." -ForegroundColor Yellow
    $stats = Invoke-RestMethod -Uri "$BASE_URL/assignments/$assignmentId/stats" -Method Get `
        -Headers @{ Authorization = "Bearer $teacherToken" }
    Write-Host "  Total Students: $($stats.totalStudents)" -ForegroundColor Green
    Write-Host "  Submissions: $($stats.totalSubmissions)" -ForegroundColor Green
    Write-Host "  Graded: $($stats.gradedCount)" -ForegroundColor Green
    Write-Host "  Average Score: $($stats.averageScore)" -ForegroundColor Green

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan

} catch {
    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host "  TEST FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails)" -ForegroundColor Red
    }
    exit 1
}
