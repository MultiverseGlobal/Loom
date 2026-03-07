# Helper script to start Stripe Listener
Write-Host "Starting Stripe Listener..." -ForegroundColor Green
Write-Host "Forwarding to: localhost:4000/api/billing/webhook" -ForegroundColor Gray
.\stripe listen --forward-to localhost:4000/api/billing/webhook
