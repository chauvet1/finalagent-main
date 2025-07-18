# BahinLink System Startup Script
# PowerShell version for better cross-platform support

$Host.UI.RawUI.WindowTitle = "BahinLink System Startup"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Header {
    Clear-Host
    Write-ColorOutput Cyan "╔══════════════════════════════════════════════════════════════╗"
    Write-ColorOutput Cyan "║                    BahinLink System Startup                 ║"
    Write-ColorOutput Cyan "║          Security Workforce Management Platform             ║"
    Write-ColorOutput Cyan "╚══════════════════════════════════════════════════════════════╝"
    Write-Output ""
}

function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-ColorOutput Green "✅ Node.js is installed: $nodeVersion"
            return $true
        }
    } catch {
        Write-ColorOutput Red "❌ Node.js is not installed or not in PATH"
        Write-ColorOutput Yellow "Please install Node.js 18+ from https://nodejs.org"
        return $false
    }
}

function Install-Dependencies {
    Write-ColorOutput Yellow "📦 Installing dependencies for all services..."
    
    $services = @("backend", "landing-page", "admin-portal", "client-portal")
    
    foreach ($service in $services) {
        if (Test-Path $service) {
            Write-ColorOutput Blue "Installing $service dependencies..."
            Set-Location $service
            npm install --silent
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput Red "❌ Failed to install $service dependencies"
                Set-Location ..
                return $false
            }
            Set-Location ..
            Write-ColorOutput Green "✅ $service dependencies installed"
        } else {
            Write-ColorOutput Red "❌ Directory $service not found"
            return $false
        }
    }
    
    return $true
}

function Setup-Database {
    Write-ColorOutput Yellow "🔧 Setting up database..."
    
    # Generate Prisma client
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "❌ Failed to generate Prisma client"
        return $false
    }
    
    Write-ColorOutput Green "✅ Database setup completed"
    return $true
}

function Start-System {
    Write-Output ""
    Write-ColorOutput Green "🚀 Starting BahinLink System..."
    Write-Output ""
    Write-ColorOutput Cyan "📍 Application URLs:"
    Write-Output "   • Landing Page:  http://localhost:3000"
    Write-Output "   • Admin Portal:  http://localhost:3001"
    Write-Output "   • Client Portal: http://localhost:3002"
    Write-Output "   • Backend API:   http://localhost:8000"
    Write-Output ""
    Write-ColorOutput Yellow "💡 Press Ctrl+C to stop all services"
    Write-Output ""
    
    # Start all services with concurrently
    npx concurrently --kill-others --names "BACKEND,LANDING,ADMIN,CLIENT" --prefix-colors "blue,green,yellow,magenta" "cd backend && npm run dev" "cd landing-page && npm start" "cd admin-portal && npm start" "cd client-portal && npm start"
}

# Main execution
Write-Header

Write-ColorOutput Blue "🔍 Checking system requirements..."

if (-not (Test-NodeJS)) {
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Install-Dependencies)) {
    Write-ColorOutput Red "❌ Failed to install dependencies"
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Setup-Database)) {
    Write-ColorOutput Red "❌ Failed to setup database"
    Write-ColorOutput Yellow "Make sure PostgreSQL is running or use Docker"
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    Start-System
} catch {
    Write-Output ""
    Write-ColorOutput Yellow "👋 BahinLink System stopped"
} finally {
    Read-Host "Press Enter to exit"
}
