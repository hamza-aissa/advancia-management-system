#!/bin/bash

# Test script for Advancia Management System
# This script verifies the API tests and both production builds.

echo "🧪 Testing Advancia Management System API"
echo "=========================================="
echo ""

echo "1. Tests API..."
cd api
if npm test && npm run build; then
    echo "   ✅ Tests et build API réussis"
else
    echo "   ❌ Échec API"
    exit 1
fi

# Check if client builds
echo ""
echo "2. Contrôles frontend..."
cd ../client
if npm run lint && npm run build; then
    echo "   ✅ Lint et build frontend réussis"
else
    echo "   ❌ Client build failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Vérification locale réussie"
echo ""
