#!/usr/bin/env pwsh
# Setup test users

$BASE_URL = "http://localhost:3000/api"

Write-Host "Creating test users..." -ForegroundColor Cyan

# Register Teacher
try {
    $teacher = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" -Body (@{
        email = "testteacher@test.com"
        password = "TestPass123"
        fullName = "Test Teacher"
        role = "TEACHER"
    } | ConvertTo-Json) -ErrorAction Stop
    
    Write-Host "✓ Teacher created: testteacher@test.com / TestPass123" -ForegroundColor Green
} catch {
    Write-Host "Teacher may already exist" -ForegroundColor Yellow
}

# Register Student
try {
    $student = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" -Body (@{
        email = "teststudent@test.com"
        password = "TestPass123"
        fullName = "Test Student"
        role = "STUDENT"
    } | ConvertTo-Json) -ErrorAction Stop
    
    Write-Host "✓ Student created: teststudent@test.com / TestPass123" -ForegroundColor Green
} catch {
    Write-Host "Student may already exist" -ForegroundColor Yellow
}

Write-Host "`nTest users ready!" -ForegroundColor Green
