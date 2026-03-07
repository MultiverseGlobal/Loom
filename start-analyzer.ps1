
# Start the Analyzer Service
Write-Host "Starting Loom Analyzer..."
Set-Location backend/analyzer

# Check if venv exists, if not create it (Optional, assuming system python for now or user managed)
# python -m venv venv
# .\venv\Scripts\Activate.ps1

# Install deps if needed (User can comment out if already installed)
# pip install -r requirements.txt
# Using pyproject.toml usually requires 'pip install .' or 'pip install -e .'
# pip install -e .

# Run Uvicorn
# Assuming app.main:app is the entry point based on file structure
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
