#!/usr/bin/env bash
# Render build script — installs Python deps + builds React frontend
set -e

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Installing Node dependencies..."
cd frontend
npm ci

echo "==> Building React frontend..."
npm run build
cd ..

echo "==> Build complete!"
