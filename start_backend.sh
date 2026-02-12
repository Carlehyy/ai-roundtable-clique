#!/bin/bash

echo "========================================"
echo "  SynapseMind Backend Starter"
echo "========================================"
echo ""

cd "$(dirname "$0")/backend"

echo "Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "Starting FastAPI server..."
echo "API docs: http://localhost:8000/docs"
echo ""

python main.py
