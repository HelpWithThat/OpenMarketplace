#!/bin/bash

# Fix all route handlers to await params (Next.js 16 change)

# Find all route files with params and fix them
find app/api -name "route.ts" -type f | while read file; do
  # Check if file has params pattern
  if grep -q "params }: { params: {" "$file"; then
    echo "Fixing $file"
    
    # Create a temporary TypeScript file to properly handle the fix
    cat > /tmp/fix_route.ts << 'EOF'
// This script will be used as reference
EOF
  fi
done

echo "Manual fixes needed - params must be awaited in Next.js 16"
