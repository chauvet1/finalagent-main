#!/bin/bash

# BahinLink System - Start All Services
echo "🚀 Starting BahinLink System - All Services"
echo "============================================"

# Kill any existing processes first
echo "🧹 Cleaning up existing processes..."
pkill -f "ts-node-dev\|react-scripts\|npm.*dev\|npm.*start" 2>/dev/null || true
sleep 2

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Working from: $SCRIPT_DIR"

# Start Backend (Port 8000)
echo ""
echo "🔧 Starting Backend API..."
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"

# Wait a moment for backend to initialize
sleep 5

# Start Admin Portal (Port 3002)
echo ""
echo "👨‍💼 Starting Admin Portal..."
cd "$SCRIPT_DIR/admin-portal"
BROWSER=none PORT=3002 npx react-scripts start &
ADMIN_PID=$!
echo "✅ Admin Portal started with PID: $ADMIN_PID"

# Start Client Portal (Port 3000)
echo ""
echo "👥 Starting Client Portal..."
cd "$SCRIPT_DIR/client-portal"
BROWSER=none PORT=3000 npx react-scripts start &
CLIENT_PID=$!
echo "✅ Client Portal started with PID: $CLIENT_PID"

echo ""
echo "🎉 All services are starting up!"
echo "============================================"
echo "📊 Backend API:      http://localhost:8000"
echo "👨‍💼 Admin Portal:    http://localhost:3002"
echo "👥 Client Portal:    http://localhost:3000"
echo "============================================"
echo ""
echo "📝 Service PIDs:"
echo "   Backend: $BACKEND_PID"
echo "   Admin:   $ADMIN_PID"
echo "   Client:  $CLIENT_PID"
echo ""
echo "⚠️  To stop all services, run: kill $BACKEND_PID $ADMIN_PID $CLIENT_PID"
echo "   Or use Ctrl+C to stop this script and then kill the processes"
echo ""
echo "🔍 Monitoring services... (Press Ctrl+C to exit)"

# Keep script running and monitor processes
trap 'echo ""; echo "🛑 Stopping all services..."; kill $BACKEND_PID $ADMIN_PID $CLIENT_PID 2>/dev/null; exit 0' INT

# Wait for all background processes
wait
