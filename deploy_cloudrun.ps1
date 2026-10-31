$ErrorActionPreference = "Stop"

$PROJECT_ID = "gdgcodealchemist"
$REGION = "asia-south1"
$BACKEND_SERVICE = "matruraksha-backend"
$FRONTEND_SERVICE = "matruraksha-frontend"

# Read GEMINI_API_KEY from backend/.env if present
$GEMINI_KEY = $env:GEMINI_API_KEY
if (-not $GEMINI_KEY -and (Test-Path "$PSScriptRoot\backend\.env")) {
    $envLines = Get-Content "$PSScriptRoot\backend\.env"
    foreach ($line in $envLines) {
        if ($line -match "^GEMINI_API_KEY=(.+)$") {
            $GEMINI_KEY = $matches[1].Trim()
        }
    }
}

Write-Host "1. Configuring Google Cloud project: $PROJECT_ID ($REGION)..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID --quiet
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project $PROJECT_ID --quiet

Write-Host "2. Deploying Backend ($BACKEND_SERVICE) to Cloud Run..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\backend"
gcloud run deploy $BACKEND_SERVICE `
  --source . `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 1Gi `
  --quiet `
  --set-env-vars "FIREBASE_PROJECT_ID=$PROJECT_ID,GEMINI_MODEL=gemini-3.8-flash,GEMINI_TTS_MODEL=gemini-3.8-flash,USE_MOCK_AI=false,GEMINI_API_KEY=$GEMINI_KEY"
Pop-Location

$BACKEND_URL = (gcloud run services describe $BACKEND_SERVICE --region $REGION --format "value(status.url)").Trim()
Write-Host "-> Backend Deployed Live at: $BACKEND_URL" -ForegroundColor Green

Write-Host "3. Deploying Frontend ($FRONTEND_SERVICE) to Cloud Run..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\frontend"
gcloud run deploy $FRONTEND_SERVICE `
  --source . `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --quiet `
  --set-env-vars "BACKEND_URL=$BACKEND_URL,NEXT_PUBLIC_API_URL=$BACKEND_URL"
Pop-Location

$FRONTEND_URL = (gcloud run services describe $FRONTEND_SERVICE --region $REGION --format "value(status.url)").Trim()
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "Live Website URL (Frontend): $FRONTEND_URL" -ForegroundColor Yellow
Write-Host "Live API URL (Backend)     : $BACKEND_URL" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green

