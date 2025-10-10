#!/bin/bash
echo "🔐 Git History Cleanup - Quick Version"
echo "========================================"
echo ""
echo "This will remove sensitive files from git history"
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed!"
    echo "   Install with: sudo apt install default-jre"
    exit 1
fi

echo "✅ Java found"
echo ""
echo "Step 1: Removing firebase_credentials.json from history..."
java -jar ~/bin/bfg.jar --delete-files firebase_credentials.json .

echo ""
echo "Step 2: Removing .env from history..."
java -jar ~/bin/bfg.jar --delete-files .env .

echo ""
echo "Step 3: Cleaning up repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ DONE! Git history cleaned."
echo ""
echo "⚠️  Next steps:"
echo "   1. If you have a remote: git push --force origin main"
echo "   2. Rotate your credentials (see QUICK_START.md)"
echo ""
