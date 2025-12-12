#!/bin/bash

# Cherry-pick Verification Script
# This script verifies that commit a73c9c6 has been successfully cherry-picked to branches 3.4 and 3.5

echo "=== Cherry-pick Verification ==="
echo ""

echo "1. Checking release/3.4 branch..."
git log release/3.4 --oneline -5 | head -1
git log release/3.4 --format="%H %s" -1 | grep -q "docs: update Animate API docs" && echo "✓ Cherry-pick found on release/3.4" || echo "✗ Cherry-pick NOT found on release/3.4"
echo ""

echo "2. Checking release/3.5 branch..."
git log release/3.5 --oneline -5 | head -1
git log release/3.5 --format="%H %s" -1 | grep -q "docs: update Animate API docs" && echo "✓ Cherry-pick found on release/3.5" || echo "✗ Cherry-pick NOT found on release/3.5"
echo ""

echo "3. Commit details on release/3.4:"
git log release/3.4 --format="%H - %s - %an" -1
echo ""

echo "4. Commit details on release/3.5:"
git log release/3.5 --format="%H - %s - %an" -1
echo ""

echo "5. Files changed in release/3.4 cherry-pick:"
git diff release/3.4~1 release/3.4 --stat | tail -1
echo ""

echo "6. Files changed in release/3.5 cherry-pick:"
git diff release/3.5~1 release/3.5 --stat | tail -1
echo ""

echo "=== Verification Complete ==="
