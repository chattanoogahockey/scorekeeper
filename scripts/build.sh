#!/bin/bash

# Build script for static GitHub Pages deployment
echo "🚀 Building Hockey Scorekeeper for GitHub Pages..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building project..."
npm run build

# Copy data files to dist
echo "📋 Copying data files..."
mkdir -p ../dist/data
cp -r ../public/data/* ../dist/data/

# Create a simple index redirect for root
echo "🔗 Creating root redirect..."
cat > ../dist/404.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Hockey Scorekeeper</title>
    <script type="text/javascript">
        // Redirect to hash router for GitHub Pages SPA support
        var l = window.location;
        l.replace(l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + l.pathname + '#' + l.pathname);
    </script>
</head>
<body>
    <p>Redirecting to Hockey Scorekeeper...</p>
</body>
</html>
EOF

echo "✅ Build complete! Files are in the dist/ directory"
echo "🌐 Ready for GitHub Pages deployment"