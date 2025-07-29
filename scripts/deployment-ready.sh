#!/bin/bash
# Deployment readiness script for DropDaily
# Ensures all health endpoints are responding correctly

echo "🔍 Checking deployment readiness..."

PORT=${PORT:-5000}
HOST=${HOST:-localhost}

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    
    echo "📡 Testing $endpoint..."
    
    response=$(curl -s -w "%{http_code}" "http://$HOST:$PORT$endpoint" -o /tmp/response.txt)
    http_code=$response
    
    if [ "$http_code" = "$expected_status" ]; then
        echo "✅ $endpoint returned $http_code"
        return 0
    else
        echo "❌ $endpoint returned $http_code (expected $expected_status)"
        echo "Response body:"
        cat /tmp/response.txt
        return 1
    fi
}

# Check all health endpoints
echo "🏥 Running health checks..."

check_endpoint "/" 200 || exit 1
check_endpoint "/health" 200 || exit 1
check_endpoint "/healthz" 200 || exit 1
check_endpoint "/ready" 200 || exit 1

# Verify response content
echo "🔍 Verifying response content..."

# Check /health returns JSON with status
health_response=$(curl -s "http://$HOST:$PORT/health")
if echo "$health_response" | grep -q '"status":"healthy"'; then
    echo "✅ Health endpoint returns correct status"
else
    echo "❌ Health endpoint response incorrect: $health_response"
    exit 1
fi

# Check /healthz returns OK
healthz_response=$(curl -s "http://$HOST:$PORT/healthz")
if [ "$healthz_response" = "OK" ]; then
    echo "✅ Healthz endpoint returns OK"
else
    echo "❌ Healthz endpoint response incorrect: $healthz_response"
    exit 1
fi

# Check /ready returns JSON with ready: true
ready_response=$(curl -s "http://$HOST:$PORT/ready")
if echo "$ready_response" | grep -q '"ready":true'; then
    echo "✅ Ready endpoint returns correct status"
else
    echo "❌ Ready endpoint response incorrect: $ready_response"
    exit 1
fi

echo "🎉 All deployment health checks passed!"
echo "📋 Summary:"
echo "   ✅ Root endpoint (/) responding"
echo "   ✅ Health endpoint (/health) responding with status"
echo "   ✅ Healthz endpoint (/healthz) responding with OK"
echo "   ✅ Ready endpoint (/ready) responding with ready status"
echo ""
echo "🚀 Application is ready for deployment!"

# Clean up
rm -f /tmp/response.txt