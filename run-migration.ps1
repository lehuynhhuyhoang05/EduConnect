# Run database migration for adding originalFileName column

Write-Host "Running database migration..." -ForegroundColor Cyan

# Read .env file to get database credentials
$envFile = Get-Content ".env" -ErrorAction SilentlyContinue
if ($envFile) {
    $dbHost = ($envFile | Select-String "DB_HOST=(.+)").Matches.Groups[1].Value
    $dbPort = ($envFile | Select-String "DB_PORT=(.+)").Matches.Groups[1].Value  
    $dbName = ($envFile | Select-String "DB_DATABASE=(.+)").Matches.Groups[1].Value
    $dbUser = ($envFile | Select-String "DB_USERNAME=(.+)").Matches.Groups[1].Value
    $dbPass = ($envFile | Select-String "DB_PASSWORD=(.+)").Matches.Groups[1].Value
} else {
    # Default values
    $dbHost = "localhost"
    $dbPort = "3306"
    $dbName = "lms_db"
    $dbUser = "root"
    $dbPass = ""
}

Write-Host "Database: $dbName on $dbHost:$dbPort" -ForegroundColor Yellow

# SQL command
$sql = @"
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255) NULL AFTER file_url;
"@

# Try to execute using mysql command line
try {
    $sql | mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPass $dbName 2>&1
    Write-Host "`nMigration completed successfully!" -ForegroundColor Green
    Write-Host "Column 'original_file_name' has been added to 'submissions' table." -ForegroundColor Green
} catch {
    Write-Host "`nFailed to run migration automatically." -ForegroundColor Red
    Write-Host "Please run this SQL manually in your MySQL client:" -ForegroundColor Yellow
    Write-Host $sql -ForegroundColor Cyan
}
