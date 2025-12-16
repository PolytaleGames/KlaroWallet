#!/bin/bash
echo "🚀 Starting Klaro Build Pipeline..."

# 1. Setup Environment (Ensure Cargo is in PATH)
export PATH="$HOME/.cargo/bin:$PATH"

# 2. Build
echo "📦 Building Application..."
npm run tauri build

# 3. Deliver
TARGET_DIR="src-tauri/target/release/bundle/dmg"
# Find the DMG file (handling version numbers dynamically)
DMG_FILE=$(ls $TARGET_DIR/*.dmg 2>/dev/null | head -n 1)

if [ -f "$DMG_FILE" ]; then
    cp "$DMG_FILE" ~/Desktop/
    echo "✅ Build Success! Installer copied to Desktop."
    echo "   File: $(basename "$DMG_FILE")"
else
    echo "❌ Build Failed or DMG not found."
    echo "   Check the output above for errors."
    exit 1
fi
