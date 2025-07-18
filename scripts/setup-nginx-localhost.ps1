# BahinLink Nginx Localhost Setup Script
# This script automates the setup and testing of the unified localhost configuration

param(
    [switch]$Install,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Test,
    [switch]$Status,
    [string]$NginxPath = "C:\nginx"
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

function Test-Service {
    param([string]$Url, [string]$Name)
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10 -UseBasicParsing
        Write-Status "✓ $Name - Status: $($response.StatusCode)" $Green
        return $true
    } catch {
        Write-Status "✗ $Name - Error: $($_.Exception.Message)" $Red
        return $false
    }
}

function Install-NginxConfig {
    Write-Status "Installing Nginx configuration..." $Blue
    
    # Check if Nginx is installed
    if (-not (Test-Path "$NginxPath\nginx.exe")) {
        Write-Status "Nginx not found at $NginxPath" $Red
        Write-Status "Please install Nginx or specify correct path with -NginxPath parameter" $Yellow
        return $false
    }
    
    # Backup existing configuration
    if (Test-Path "$NginxPath\conf\nginx.conf") {
        $backupPath = "$NginxPath\conf\nginx.conf.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item "$NginxPath\conf\nginx.conf" $backupPath
        Write-Status "Backed up existing configuration to $backupPath" $Yellow
    }
    
    # Copy new configuration
    $configSource = "nginx\localhost-dev.conf"
    if (Test-Path $configSource) {
        Copy-Item $configSource "$NginxPath\conf\nginx.conf"
        Write-Status "Installed new Nginx configuration" $Green
        
        # Test configuration
        $testResult = & "$NginxPath\nginx.exe" -t 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Nginx configuration test passed" $Green
            return $true
        } else {
            Write-Status "Nginx configuration test failed: $testResult" $Red
            return $false
        }
    } else {
        Write-Status "Configuration file not found: $configSource" $Red
        return $false
    }
}

function Start-Services {
    Write-Status "Starting services..." $Blue
    
    # Check if services are already running
    $backendRunning = Test-Port 8000
    $adminRunning = Test-Port 3001
    $clientRunning = Test-Port 3003
    $nginxRunning = Test-Port 80
    
    if ($backendRunning) {
        Write-Status "Backend already running on port 8000" $Yellow
    } else {
        Write-Status "Starting backend on port 8000..." $Blue
        Write-Status "Please run: cd backend; npm run dev" $Yellow
    }
    
    if ($adminRunning) {
        Write-Status "Admin portal already running on port 3001" $Yellow
    } else {
        Write-Status "Starting admin portal on port 3001..." $Blue
        Write-Status "Please run: cd admin-portal; npm start" $Yellow
    }
    
    if ($clientRunning) {
        Write-Status "Client portal already running on port 3003" $Yellow
    } else {
        Write-Status "Starting client portal on port 3003..." $Blue
        Write-Status "Please run: cd client-portal; `$env:PORT=3003; npm start" $Yellow
    }
    
    if ($nginxRunning) {
        Write-Status "Nginx already running on port 80" $Yellow
    } else {
        Write-Status "Starting Nginx..." $Blue
        try {
            Start-Process -FilePath "$NginxPath\nginx.exe" -WorkingDirectory $NginxPath -WindowStyle Hidden
            Start-Sleep 2
            if (Test-Port 80) {
                Write-Status "Nginx started successfully" $Green
            } else {
                Write-Status "Failed to start Nginx" $Red
            }
        } catch {
            Write-Status "Error starting Nginx: $($_.Exception.Message)" $Red
        }
    }
}

function Stop-Services {
    Write-Status "Stopping services..." $Blue
    
    # Stop Nginx
    try {
        & "$NginxPath\nginx.exe" -s stop
        Write-Status "Nginx stopped" $Green
    } catch {
        Write-Status "Error stopping Nginx: $($_.Exception.Message)" $Red
    }
    
    Write-Status "Please manually stop other services (backend, admin-portal, client-portal)" $Yellow
}

function Test-Setup {
    Write-Status "Testing unified localhost setup..." $Blue
    
    $endpoints = @(
        @{ Url = "http://localhost/health"; Name = "Nginx Health Check" },
        @{ Url = "http://localhost/api/health"; Name = "Backend API Health" },
        @{ Url = "http://localhost/api/analytics/dashboard"; Name = "Dashboard API" },
        @{ Url = "http://localhost/admin/"; Name = "Admin Portal" },
        @{ Url = "http://localhost/client/"; Name = "Client Portal" }
    )
    
    $successCount = 0
    $totalCount = $endpoints.Count
    
    foreach ($endpoint in $endpoints) {
        if (Test-Service $endpoint.Url $endpoint.Name) {
            $successCount++
        }
    }
    
    Write-Status "" 
    Write-Status "Test Results: $successCount/$totalCount endpoints working" $Blue
    
    if ($successCount -eq $totalCount) {
        Write-Status "✓ All services are working correctly!" $Green
        Write-Status "You can now access:" $Blue
        Write-Status "  - Admin Portal: http://localhost/admin/" $Green
        Write-Status "  - Client Portal: http://localhost/client/" $Green
        Write-Status "  - API Documentation: http://localhost/api/health" $Green
    } else {
        Write-Status "✗ Some services are not working. Check the logs above." $Red
    }
}

function Show-Status {
    Write-Status "Checking service status..." $Blue
    
    $services = @(
        @{ Port = 80; Name = "Nginx" },
        @{ Port = 8000; Name = "Backend API" },
        @{ Port = 3001; Name = "Admin Portal" },
        @{ Port = 3003; Name = "Client Portal" }
    )
    
    foreach ($service in $services) {
        $running = Test-Port $service.Port
        $status = if ($running) { "Running" } else { "Stopped" }
        $color = if ($running) { $Green } else { $Red }
        Write-Status "$($service.Name) (Port $($service.Port)): $status" $color
    }
}

function Show-Help {
    Write-Host @"
BahinLink Nginx Localhost Setup Script

Usage:
  .\setup-nginx-localhost.ps1 [OPTIONS]

Options:
  -Install          Install Nginx configuration
  -Start            Start all services
  -Stop             Stop Nginx service
  -Test             Test all endpoints
  -Status           Show service status
  -NginxPath <path> Specify Nginx installation path (default: C:\nginx)

Examples:
  .\setup-nginx-localhost.ps1 -Install
  .\setup-nginx-localhost.ps1 -Start
  .\setup-nginx-localhost.ps1 -Test
  .\setup-nginx-localhost.ps1 -Status
  .\setup-nginx-localhost.ps1 -Install -NginxPath "D:\nginx"

Setup Process:
  1. Run with -Install to configure Nginx
  2. Start backend: cd backend && npm run dev
  3. Start admin portal: cd admin-portal && npm start
  4. Start client portal: cd client-portal && set PORT=3003 && npm start
  5. Run with -Start to start Nginx
  6. Run with -Test to verify everything is working

"@
}

# Main script logic
if ($Install) {
    Install-NginxConfig
} elseif ($Start) {
    Start-Services
} elseif ($Stop) {
    Stop-Services
} elseif ($Test) {
    Test-Setup
} elseif ($Status) {
    Show-Status
} else {
    Show-Help
}

Write-Status "Script completed." $Blue