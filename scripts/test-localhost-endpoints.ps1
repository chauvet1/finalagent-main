# BahinLink Localhost Endpoint Testing Script
# This script comprehensively tests all API endpoints and routing configurations

param(
    [switch]$Verbose,
    [switch]$SkipAuth,
    [string]$BaseUrl = "http://localhost",
    [int]$Timeout = 30
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Success,
        [string]$Details = "",
        [int]$StatusCode = 0,
        [string]$ResponseTime = ""
    )
    
    $status = if ($Success) { "✓ PASS" } else { "✗ FAIL" }
    $color = if ($Success) { $Green } else { $Red }
    
    $output = "[$status] $TestName"
    if ($StatusCode -gt 0) { $output += " (HTTP $StatusCode)" }
    if ($ResponseTime) { $output += " [$ResponseTime]" }
    
    Write-Host $output -ForegroundColor $color
    
    if ($Details -and ($Verbose -or -not $Success)) {
        Write-Host "    $Details" -ForegroundColor Gray
    }
}

function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200,
        [string]$TestName
    )
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $params = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = $Timeout
            UseBasicParsing = $true
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $stopwatch.Stop()
        
        $responseTime = "$($stopwatch.ElapsedMilliseconds)ms"
        $success = $response.StatusCode -eq $ExpectedStatus
        
        $details = if ($Verbose) {
            "Response Length: $($response.Content.Length) bytes"
        } else { "" }
        
        Write-TestResult -TestName $TestName -Success $success -Details $details -StatusCode $response.StatusCode -ResponseTime $responseTime
        
        return @{
            Success = $success
            StatusCode = $response.StatusCode
            Content = $response.Content
            ResponseTime = $stopwatch.ElapsedMilliseconds
        }
    }
    catch {
        $stopwatch.Stop() if $stopwatch
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        
        Write-TestResult -TestName $TestName -Success $false -Details $_.Exception.Message -StatusCode $statusCode
        
        return @{
            Success = $false
            StatusCode = $statusCode
            Error = $_.Exception.Message
            ResponseTime = if ($stopwatch) { $stopwatch.ElapsedMilliseconds } else { 0 }
        }
    }
}

function Test-JsonResponse {
    param(
        [string]$Content,
        [string]$TestName
    )
    
    try {
        $json = $Content | ConvertFrom-Json
        Write-TestResult -TestName "$TestName - JSON Parse" -Success $true -Details "Valid JSON response"
        return $json
    }
    catch {
        Write-TestResult -TestName "$TestName - JSON Parse" -Success $false -Details "Invalid JSON: $($_.Exception.Message)"
        return $null
    }
}

function Test-ReactApp {
    param(
        [string]$Url,
        [string]$AppName
    )
    
    $result = Test-Endpoint -Url $Url -TestName "$AppName - Initial Load" -ExpectedStatus 200
    
    if ($result.Success) {
        # Check for React app indicators
        $content = $result.Content
        $hasReactRoot = $content -match 'id="root"'
        $hasReactScripts = $content -match 'react'
        
        Write-TestResult -TestName "$AppName - React Root Element" -Success $hasReactRoot
        Write-TestResult -TestName "$AppName - React Scripts" -Success $hasReactScripts
        
        return $hasReactRoot -and $hasReactScripts
    }
    
    return $false
}

# Main testing function
function Start-EndpointTesting {
    Write-Host "\n=== BahinLink Localhost Endpoint Testing ===" -ForegroundColor $Blue
    Write-Host "Base URL: $BaseUrl" -ForegroundColor $Cyan
    Write-Host "Timeout: $Timeout seconds" -ForegroundColor $Cyan
    Write-Host "Timestamp: $(Get-Date)" -ForegroundColor $Cyan
    
    $totalTests = 0
    $passedTests = 0
    $testResults = @()
    
    # Test 1: Nginx Health Check
    Write-Host "\n--- Nginx Health Checks ---" -ForegroundColor $Yellow
    $result = Test-Endpoint -Url "$BaseUrl/health" -TestName "Nginx Health Check"
    $totalTests++; if ($result.Success) { $passedTests++ }
    $testResults += $result
    
    # Test 2: Backend API Health
    Write-Host "\n--- Backend API Tests ---" -ForegroundColor $Yellow
    $result = Test-Endpoint -Url "$BaseUrl/api/health" -TestName "Backend API Health"
    $totalTests++; if ($result.Success) { $passedTests++ }
    $testResults += $result
    
    # Test 3: Dashboard API
    $result = Test-Endpoint -Url "$BaseUrl/api/analytics/dashboard" -TestName "Dashboard Analytics API"
    $totalTests++; if ($result.Success) { $passedTests++ }
    if ($result.Success) {
        $json = Test-JsonResponse -Content $result.Content -TestName "Dashboard API"
        $totalTests++; if ($json) { $passedTests++ }
    }
    $testResults += $result
    
    # Test 4: User API endpoints
    $userEndpoints = @(
        @{ Path = "/api/users"; Name = "Users List" },
        @{ Path = "/api/auth/me"; Name = "Auth Me"; ExpectedStatus = 401 }
    )
    
    foreach ($endpoint in $userEndpoints) {
        $expectedStatus = if ($endpoint.ExpectedStatus) { $endpoint.ExpectedStatus } else { 200 }
        $result = Test-Endpoint -Url "$BaseUrl$($endpoint.Path)" -TestName $endpoint.Name -ExpectedStatus $expectedStatus
        $totalTests++; if ($result.Success) { $passedTests++ }
        $testResults += $result
    }
    
    # Test 5: Additional API endpoints
    $apiEndpoints = @(
        "/api/sites",
        "/api/shifts", 
        "/api/reports",
        "/api/agents"
    )
    
    foreach ($endpoint in $apiEndpoints) {
        $result = Test-Endpoint -Url "$BaseUrl$endpoint" -TestName "API: $endpoint"
        $totalTests++; if ($result.Success) { $passedTests++ }
        $testResults += $result
    }
    
    # Test 6: Admin Portal
    Write-Host "\n--- Admin Portal Tests ---" -ForegroundColor $Yellow
    $adminSuccess = Test-ReactApp -Url "$BaseUrl/admin/" -AppName "Admin Portal"
    $totalTests += 3; if ($adminSuccess) { $passedTests += 3 }
    
    # Test 7: Client Portal
    Write-Host "\n--- Client Portal Tests ---" -ForegroundColor $Yellow
    $clientSuccess = Test-ReactApp -Url "$BaseUrl/client/" -AppName "Client Portal"
    $totalTests += 3; if ($clientSuccess) { $passedTests += 3 }
    
    # Test 8: Static file serving
    Write-Host "\n--- Static File Tests ---" -ForegroundColor $Yellow
    $result = Test-Endpoint -Url "$BaseUrl/uploads/" -TestName "Uploads Directory" -ExpectedStatus 403
    $totalTests++; if ($result.Success) { $passedTests++ }
    
    # Test 9: CORS Headers
    Write-Host "\n--- CORS Tests ---" -ForegroundColor $Yellow
    $headers = @{ "Origin" = "http://localhost" }
    $result = Test-Endpoint -Url "$BaseUrl/api/health" -TestName "CORS Headers" -Headers $headers
    $totalTests++; if ($result.Success) { $passedTests++ }
    
    # Test 10: WebSocket endpoint (if available)
    Write-Host "\n--- WebSocket Tests ---" -ForegroundColor $Yellow
    $result = Test-Endpoint -Url "$BaseUrl/socket.io/" -TestName "Socket.IO Endpoint" -ExpectedStatus 400
    $totalTests++; if ($result.Success) { $passedTests++ }
    
    # Performance Analysis
    Write-Host "\n--- Performance Analysis ---" -ForegroundColor $Yellow
    $avgResponseTime = ($testResults | Where-Object { $_.ResponseTime -gt 0 } | Measure-Object -Property ResponseTime -Average).Average
    $slowTests = $testResults | Where-Object { $_.ResponseTime -gt 1000 }
    
    Write-Host "Average Response Time: $([math]::Round($avgResponseTime, 2))ms" -ForegroundColor $Cyan
    if ($slowTests.Count -gt 0) {
        Write-Host "Slow Endpoints (>1s): $($slowTests.Count)" -ForegroundColor $Yellow
    }
    
    # Summary
    Write-Host "\n=== Test Summary ===" -ForegroundColor $Blue
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 1)
    
    Write-Host "Total Tests: $totalTests" -ForegroundColor $Cyan
    Write-Host "Passed: $passedTests" -ForegroundColor $Green
    Write-Host "Failed: $($totalTests - $passedTests)" -ForegroundColor $Red
    Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { $Green } elseif ($successRate -ge 70) { $Yellow } else { $Red })
    
    # Recommendations
    Write-Host "\n--- Recommendations ---" -ForegroundColor $Yellow
    
    if ($successRate -lt 100) {
        Write-Host "• Check failed endpoints and ensure all services are running" -ForegroundColor $Yellow
        Write-Host "• Verify Nginx configuration is correctly installed" -ForegroundColor $Yellow
        Write-Host "• Check service logs for detailed error information" -ForegroundColor $Yellow
    }
    
    if ($avgResponseTime -gt 500) {
        Write-Host "• Consider optimizing slow endpoints" -ForegroundColor $Yellow
        Write-Host "• Check database connection and query performance" -ForegroundColor $Yellow
    }
    
    if ($successRate -ge 90) {
        Write-Host "✓ System is ready for development!" -ForegroundColor $Green
        Write-Host "\nAccess URLs:" -ForegroundColor $Blue
        Write-Host "  Admin Portal: $BaseUrl/admin/" -ForegroundColor $Green
        Write-Host "  Client Portal: $BaseUrl/client/" -ForegroundColor $Green
        Write-Host "  API Health: $BaseUrl/api/health" -ForegroundColor $Green
    }
    
    return @{
        TotalTests = $totalTests
        PassedTests = $passedTests
        SuccessRate = $successRate
        AverageResponseTime = $avgResponseTime
    }
}

# Run the tests
Start-EndpointTesting