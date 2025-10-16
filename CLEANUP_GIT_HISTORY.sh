#!/bin/bash
# Git History Cleanup Script for WSL/Linux
# This script removes sensitive files from git history

set -e  # Exit on error

echo "🔐 Git History Cleanup Script"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  Make sure you have:"
echo "   1. Backed up your repository"
echo "   2. Rotated all credentials (Telegram, ePayco, Firebase)"
echo "   3. Committed all current changes"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📋 Step 1: Creating passwords.txt with old credentials..."
echo ""

# Create a file with patterns to replace (add your OLD credentials here)
cat > passwords.txt << 'EOF'
# Add your OLD credentials here (one per line)
# Example:
# 8499797477:AAGT1J46sOped2ciSJ1d2Z81VnOcp6aB_4s
# 0NvRbVCh0-pz6ETv7LP6x2vGtIRVQYaS0t5tgy64uJo
# eyCIpLDdqLLqQ_oPS8q_Aw

# Add patterns to find and replace with *** REMOVED ***
REPLACE_WITH_PATTERN==>***REMOVED***
EOF

echo "⚠️  IMPORTANT: Edit passwords.txt and add your OLD exposed credentials!"
echo "   Then run this script again."
echo ""
read -p "Have you added your old credentials to passwords.txt? (yes/no): " ready

if [ "$ready" != "yes" ]; then
    echo ""
    echo "Please edit passwords.txt with your old credentials, then run:"
    echo "  bash CLEANUP_GIT_HISTORY.sh"
    exit 1
fi

echo ""
echo "📋 Step 2: Checking Java installation..."
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed!"
    echo "   Install it with: sudo apt install default-jre"
    exit 1
fi
echo "✅ Java found: $(java -version 2>&1 | head -1)"

echo ""
echo "📋 Step 3: Running BFG Repo-Cleaner..."
echo ""

# Remove specific files from history
echo "Removing firebase_credentials.json..."
java -jar ~/bin/bfg.jar --delete-files firebase_credentials.json

echo ""
echo "Removing .env files..."
java -jar ~/bin/bfg.jar --delete-files .env

echo ""
echo "Replacing exposed credentials..."
java -jar ~/bin/bfg.jar --replace-text passwords.txt

echo ""
echo "📋 Step 4: Cleaning up repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleaned successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the changes: git log --all --oneline"
echo "   2. Force push (if remote exists): git push --force origin main"
echo "   3. Delete passwords.txt: rm passwords.txt"
echo "   4. Notify team members to re-clone the repository"
echo ""
echo "⚠️  Remember: Everyone with access must re-clone!"

