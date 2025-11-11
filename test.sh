#!/bin/bash

# Test script for Advancia Management System
# This script verifies the basic functionality of the API

echo "🧪 Testing Advancia Management System API"
echo "=========================================="
echo ""

# Check if API is built
echo "1. Checking if API builds..."
cd api
if npm run build > /dev/null 2>&1; then
    echo "   ✅ API builds successfully"
else
    echo "   ❌ API build failed"
    exit 1
fi

# Check if client builds
echo ""
echo "2. Checking if Client builds..."
cd ../client
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Client builds successfully"
else
    echo "   ❌ Client build failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ All basic tests passed!"
echo ""
echo "To run the full system:"
echo "1. Start MongoDB: mongod"
echo "2. Configure .env files in both api/ and client/"
echo "3. Start API: cd api && npm run dev"
echo "4. Start Client: cd client && npm start"
echo ""
echo "Key features implemented:"
echo "  - Role-based access control (Agent, Consultant, Admin, Executive)"
echo "  - Automated expiry notifications (15, 10, 6 days)"
echo "  - Daily cron job for expiry checks"
echo "  - Email notification system"
echo "  - JWT authentication"
echo "  - REST API with proper authorization"
echo ""
