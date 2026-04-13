$ErrorActionPreference = "SilentlyContinue"

Write-Host "--- 1. Login Authentication Test ---"
$loginData = '{"email":"admin@kana.stream","password":"password"}'
$response = curl.exe -s -w "`nStatus: %{http_code}" -X POST -H "Content-Type: application/json" -d $loginData http://localhost:8081/api/v1/auth/login
Write-Host "Valid Login Response:"
Write-Host $response

Write-Host "`n--- 2. Login Rate Limit Test ---"
$invalidData = '{"email":"rate_limit_test@kana.stream","password":"wrong"}'
for ($i = 1; $i -le 6; $i++) {
    $r = curl.exe -s -w " | Status: %{http_code}" -X POST -H "Content-Type: application/json" -d $invalidData http://localhost:8081/api/v1/auth/login
    Write-Host "Attempt $i :" $r
}

Write-Host "`n--- 3. API Rate Limit Test (/api/v1/sports) ---"
for ($i = 1; $i -le 15; $i++) {
    $r = curl.exe -s -o NUL -w "%{http_code}" http://localhost:8081/api/v1/sports
    Write-Host "Request $i status: $r"
}

Write-Host "`n--- 4. CSRF Test ---"
$createUser = '{"email":"test@kana.stream","password":"password","role":"user"}'
Write-Host "Attempting POST /api/v1/users without CSRF token:"
$r1 = curl.exe -s -w "`nStatus: %{http_code}" -X POST -H "Content-Type: application/json" -d $createUser http://localhost:8081/api/v1/users
Write-Host $r1

Write-Host "`nGetting CSRF token..."
$csrfResponseStr = curl.exe -s http://localhost:8081/api/v1/auth/csrf
Write-Host $csrfResponseStr
$csrfToken = ($csrfResponseStr | ConvertFrom-Json).data.csrf_token

Write-Host "`nAttempting POST /api/v1/users WITH CSRF token ($csrfToken):"
$r2 = curl.exe -s -w "`nStatus: %{http_code}" -X POST -H "Content-Type: application/json" -H "X-CSRF-Token: $csrfToken" -d $createUser http://localhost:8081/api/v1/users
Write-Host $r2
