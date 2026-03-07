Write-Host "Restarting Loom Services..."

# Kill existing processes on ports 3000, 4000, 8000
$ports = 3000, 4000, 8000
foreach ($port in $ports) {
    $pid_to_kill = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($pid_to_kill) {
        Write-Host "Killing process on port $port (PID: $pid_to_kill)..."
        Stop-Process -Id $pid_to_kill -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Waiting for ports to clear..."
Start-Sleep -Seconds 2

# Start Backend Gateway
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\LENOVO\Documents\Loom\backend\gateway'; npm run dev"

# Start Backend Analyzer
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\LENOVO\Documents\Loom\backend\analyzer'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\LENOVO\Documents\Loom\frontend'; npm run dev"

Write-Host "Services restarted! Please wait for them to initialize."
