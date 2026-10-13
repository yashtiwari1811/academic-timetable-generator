# start.ps1 – Launch both Timetable backend and frontend with one command
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction SilentlyContinue

$root = $PSScriptRoot

Write-Host ""
Write-Host "  Starting Academic Timetable Generator..." -ForegroundColor Cyan
Write-Host ""

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; python app.py" -WindowStyle Normal

Start-Sleep 2

# Start frontend
$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User')
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User'); cd '$root\frontend'; npm run dev" -WindowStyle Normal

Start-Sleep 3

Write-Host "  Backend  -> http://localhost:5001" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:3001" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:3001"
