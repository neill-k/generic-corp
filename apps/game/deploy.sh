#!/bin/bash

# Generic Corp Game - Quick Deploy Script
# This script builds and deploys the game frontend

set -e

echo "🚀 Generic Corp - Quick Deploy"
echo "================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from apps/game directory"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Building production bundle...${NC}"
pnpm build

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Built files are in: dist/"
echo ""
echo "Deployment options:"
echo ""
echo "1. Docker deployment:"
echo "   cd ../.."
echo "   docker build -f apps/game/Dockerfile -t generic-corp-game ."
echo "   docker run -p 8080:80 generic-corp-game"
echo ""
echo "2. Static hosting (Netlify, Vercel, etc.):"
echo "   Upload the dist/ folder to your hosting provider"
echo ""
echo "3. Local preview:"
echo "   pnpm preview"
echo ""
echo "Note: Update API_URL in your environment variables to point to your backend server"
