#!/bin/bash

# Build frontend
echo "Building frontend..."
npm run build

# Make netlify functions directory
echo "Setting up Netlify functions..."
mkdir -p netlify/functions

# Build serverless function
echo "Building serverless function..."
npx esbuild netlify/functions/api.js --platform=node --packages=external --bundle --format=esm --outfile=netlify/functions/api.js

echo "Build complete!"