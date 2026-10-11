#!/bin/bash
# NexusMote - Dependency Setup Script
# Run this script to install required system dependencies

set -e

echo "🔧 NexusMote Dependency Setup"
echo "=============================="

# Detect package manager
if command -v apt &> /dev/null; then
    PKG_MGR="apt"
    INSTALL="sudo apt install -y"
    UPDATE="sudo apt update"
elif command -v dnf &> /dev/null; then
    PKG_MGR="dnf"
    INSTALL="sudo dnf install -y"
    UPDATE="sudo dnf check-update || true"
elif command -v pacman &> /dev/null; then
    PKG_MGR="pacman"
    INSTALL="sudo pacman -S --needed --noconfirm"
    UPDATE="sudo pacman -Sy"
elif command -v zypper &> /dev/null; then
    PKG_MGR="zypper"
    INSTALL="sudo zypper install -y"
    UPDATE="sudo zypper refresh"
else
    echo "❌ Unsupported package manager. Please install dependencies manually."
    exit 1
fi

echo "📦 Package manager: $PKG_MGR"

# Update package list
echo "🔄 Updating package list..."
$UPDATE

# Core dependencies
echo "📥 Installing core dependencies..."
$INSTALL curl wget git

# Input backends (choose one)
echo "🖱️  Installing input backend..."
if [ "$PKG_MGR" = "pacman" ]; then
    $INSTALL ydotool xdotool || $INSTALL xdotool
elif [ "$PKG_MGR" = "apt" ]; then
    $INSTALL ydotool xdotool || $INSTALL xdotool
elif [ "$PKG_MGR" = "dnf" ]; then
    $INSTALL ydotool xdotool || $INSTALL xdotool
elif [ "$PKG_MGR" = "zypper" ]; then
    $INSTALL ydotool xdotool || $INSTALL xdotool
fi

# Media control
echo "🎵 Installing media control..."
if [ "$PKG_MGR" = "pacman" ]; then
    $INSTALL playerctl
elif [ "$PKG_MGR" = "apt" ]; then
    $INSTALL playerctl
elif [ "$PKG_MGR" = "dnf" ]; then
    $INSTALL playerctl
elif [ "$PKG_MGR" = "zypper" ]; then
    $INSTALL playerctl
fi

# Workspace management (X11)
echo "🖥️  Installing workspace tools..."
if [ "$PKG_MGR" = "pacman" ]; then
    $INSTALL wmctrl xdotool
elif [ "$PKG_MGR" = "apt" ]; then
    $INSTALL wmctrl xdotool
elif [ "$PKG_MGR" = "dnf" ]; then
    $INSTALL wmctrl xdotool
elif [ "$PKG_MGR" = "zypper" ]; then
    $INSTALL wmctrl xdotool
fi

# Audio control
echo "🔊 Installing audio tools..."
if [ "$PKG_MGR" = "pacman" ]; then
    $INSTALL libpulse
elif [ "$PKG_MGR" = "apt" ]; then
    $INSTALL pulseaudio-utils
elif [ "$PKG_MGR" = "dnf" ]; then
    $INSTALL pulseaudio-utils
elif [ "$PKG_MGR" = "zypper" ]; then
    $INSTALL pulseaudio-utils
fi

# GPU monitoring (optional)
echo "📊 Installing GPU monitoring (optional)..."
if [ "$PKG_MGR" = "pacman" ]; then
    $INSTALL nvidia-utils || true
elif [ "$PKG_MGR" = "apt" ]; then
    $INSTALL nvidia-smi || true
elif [ "$PKG_MGR" = "dnf" ]; then
    $INSTALL nvidia-smi || true
elif [ "$PKG_MGR" = "zypper" ]; then
    $INSTALL nvidia-smi || true
fi

# Setup ydotool daemon (if ydotool installed)
if command -v ydotool &> /dev/null; then
    echo "⚙️  Setting up ydotool daemon..."
    sudo usermod -aG input $USER
    
    # Create systemd user service for ydotoold
    mkdir -p ~/.config/systemd/user
    cat > ~/.config/systemd/user/ydotoold.service << 'EOF'
[Unit]
Description=ydotool daemon
After=graphical-session.target

[Service]
Type=simple
ExecStart=/usr/bin/ydotoold
Restart=on-failure

[Install]
WantedBy=default.target
EOF
    
    systemctl --user daemon-reload
    systemctl --user enable --now ydotoold 2>/dev/null || echo "⚠️  Could not start ydotoold (may need reboot)"
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
if command -v bun &> /dev/null; then
    bun install
else
    npm install
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "⚠️  IMPORTANT: You may need to:"
echo "   1. Reboot or log out/in for input group changes"
echo "   2. Start ydotoold: systemctl --user start ydotoold"
echo "   3. Run the server: npm run dev (or bun run dev)"
echo ""
echo "🌐 Then connect from your phone at: http://<your-lan-ip>:3000"