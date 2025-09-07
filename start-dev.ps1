# Hockey Scorekeeper Development Startup Script
Write-Host "🏒 Starting Hockey Scorekeeper Development Environment..." -ForegroundColor Green

# Kill any existing Node processes
Write-Host "Stopping any existing Node.js processes..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 2

# Start Backend Server in background
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\marce\OneDrive\Documents\app_development\scorekeeper2\backend'; npm start"

# Wait for backend to initialize
Start-Sleep -Seconds 10

# Start Frontend Server in background
Write-Host "Starting Frontend Server..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\marce\OneDrive\Documents\app_development\scorekeeper2\frontend'; npm run dev"

# Wait for frontend to initialize
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🎉 Development Environment Started!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Magenta
Write-Host ""
Write-Host "Press any key to open the application in your browser..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open the application in default browser
Start-Process "http://localhost:5173"
