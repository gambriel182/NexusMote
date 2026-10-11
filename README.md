# NexusMote

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)](https://kernel.org/)
[![Hyprland](https://img.shields.io/badge/Hyprland-58E1FF?logo=hyprland&logoColor=black)](https://hypr.land/)
[![Open Source](https://img.shields.io/badge/Open%20Source-Community-blue)](https://opensource.org/)

**Turn your smartphone into a PC controller.**

NexusMote is an open-source project by **NexusPT** that transforms your smartphone into a versatile controller for a Linux desktop.

Control your desktop with a customizable Stream Deck, a remote mouse and keyboard, and real-time hardware monitoring — all from one mobile-friendly interface.

The initial target is Linux with Hyprland, with the goal of expanding compatibility to other desktop environments.

---

## Features

### 🎛️ Stream Deck
- Customizable desktop action buttons.
- Launch applications and execute predefined actions.
- Control audio and media playback.
- Switch Hyprland workspaces.
- Create shortcuts for everyday tasks.

### 🖱️ Remote Mouse & Keyboard
- Touchpad-style mouse control.
- Mouse clicks and scrolling.
- Remote keyboard input.
- Local network communication.
- No root access required on the smartphone.

### 📊 Hardware Monitoring
- CPU utilization.
- RAM usage.
- System uptime and network status.
- CPU temperatures when supported.
- NVIDIA GPU metrics when available.
- Real-time updates through WebSocket.

### 📱 Mobile Interface
- Responsive, mobile-first design.
- Three main modes: Deck, Mouse, and Monitor.
- Access through a modern mobile browser.
- PWA installation support planned.

> **Development status:** NexusMote is under active development. Some features described above are planned and may not yet be available.

---

## How It Works

NexusMote follows a client-server architecture: the smartphone provides the interface, while the Linux PC handles desktop integration and system monitoring.

```text
             SMARTPHONE
                  |
           Mobile Interface
                  |
             HTTP / WS
                  |
             NEXUSMOTE
               SERVER
                  |
       +----------+----------+
       |          |          |
   Hyprland     Input     Monitoring
   hyprctl     Backend    /proc + /sys
                          nvidia-smi
```

1. **Connect:** Open the NexusMote interface on your smartphone through your local network.
2. **Control:** Send commands from the mobile interface to the PC server.
3. **Execute:** The server validates the requested action and communicates with supported Linux desktop interfaces.
4. **Monitor:** System metrics are collected on the PC and sent to the smartphone through WebSocket.
5. **Customize:** Use the Stream Deck interface to organize supported actions and shortcuts.

The PC runs the server; the smartphone acts as the remote control. The mobile device does not need root access.

---

## Requirements

### Linux PC

- Linux operating system.
- Node.js and npm.
- Git.
- Hyprland for Hyprland-specific functionality.
- A compatible input backend for remote mouse and keyboard features.
- Both devices connected to the same trusted local network.

### Smartphone

- Android or another device with a modern web browser.
- Wi-Fi or another supported network connection.
- No root access required.

---

## Installation

### 1. Install the prerequisites

On Arch Linux:

```bash
sudo pacman -S --needed git nodejs npm
```

On other Linux distributions, install Git, Node.js, and npm using your distribution's package manager.

---

## Quick Setup

Run the automated setup script to install all system dependencies:

```bash
chmod +x setup.sh
./setup.sh
```

This installs the required tools for your distribution and sets up the ydotool daemon.

### Manual Installation

**Arch Linux:**
```bash
sudo pacman -S --needed nodejs npm git ydotool xdotool playerctl wmctrl libpulse nvidia-utils
sudo usermod -aG input $USER
systemctl --user enable --now ydotoold
```

**Debian/Ubuntu:**
```bash
sudo apt update && sudo apt install nodejs npm git ydotool xdotool playerctl wmctrl pulseaudio-utils
sudo usermod -aG input $USER
```

**Fedora:**
```bash
sudo dnf install nodejs npm git ydotool xdotool playerctl wmctrl pulseaudio-utils
sudo usermod -aG input $USER
```

After installing, **reboot or log out/in** for the input group change to take effect.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
# or
bun install
```

### 2. Build the project

```bash
npm run build
```

### 3. Start the server

```bash
npm start
# or for development
npm run dev
```

The server runs on `http://0.0.0.0:3000` by default.

---

## Connecting Your Smartphone

1. Connect your smartphone and PC to the same trusted network.
2. Find the PC's local IP address: `ip addr show | grep inet`
3. Open `http://<PC_IP>:3000` in your smartphone's browser.
4. For PWA install: open in Chrome/Edge → menu → "Install app".

Example: `http://192.168.1.100:3000`

---

## Desktop Environment Support

| Feature | Hyprland (Wayland) | Cinnamon/GNOME (X11) | KDE Plasma |
|---------|-------------------|---------------------|------------|
| Mouse/Keyboard | ydotool ✓ | ydotool/xdotool ✓ | ydotool ✓ |
| Media Control | playerctl ✓ | playerctl ✓ | playerctl ✓ |
| Workspaces | hyprctl ✓ | wmctrl ✓ | wmctrl/kwin ✓ |
| Audio | pactl ✓ | pactl ✓ | pactl ✓ |
| Window Info | hyprctl ✓ | xdotool ✓ | xdotool ✓ |

For **Wayland** (Hyprland, Sway, GNOME Wayland): Use `ydotool` with `ydotoold` daemon running.
For **X11** (Cinnamon, GNOME X11, KDE X11): Use `xdotool` + `wmctrl` as fallback.

---

## Technology Stack

| Component | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Node.js / Bun |
| HTTP server | Fastify |
| Real-time communication | WebSocket |
| Client interface | HTML, CSS, JavaScript (ES Modules) |
| Desktop integration | Hyprland (Wayland), X11 (Cinnamon/GNOME/KDE) |
| Input backend | ydotool (Wayland), xdotool (X11 fallback) |
| Media control | playerctl (MPRIS) |
| Workspace management | hyprctl / wmctrl |
| Audio control | pactl (PulseAudio/PipeWire) |
| System monitoring | Linux `/proc` and `/sys` |
| Optional GPU monitoring | NVIDIA `nvidia-smi` |
| Mobile access | Web browser, PWA |

---

## Project Structure

The planned MVP structure is:

```text
NexusMote/
├── src/
│   ├── server.ts
│   ├── actions.ts
│   ├── metrics.ts
│   └── input.ts
├── public/
│   ├── index.html
│   ├── app.css
│   └── app.js
├── package.json
├── package-lock.json
├── tsconfig.json
├── LICENSE
└── README.md
```

The actual repository structure may change as development progresses.

---

## Development Roadmap

### Phase 1 — Core MVP
- [ ] Set up the Node.js server.
- [ ] Build the mobile interface.
- [ ] Implement predefined desktop actions.
- [ ] Add CPU and RAM monitoring.
- [ ] Implement WebSocket updates.
- [ ] Add authenticated client connections.

### Phase 2 — Remote Input
- [ ] Implement touchpad controls.
- [ ] Add mouse clicks and scrolling.
- [ ] Support remote keyboard input.
- [ ] Validate compatibility with Hyprland and Wayland.
- [ ] Configure input permissions securely.

### Phase 3 — Advanced Features
- [ ] Add customizable Stream Deck buttons.
- [ ] Add GPU and temperature monitoring where available.
- [ ] Implement device pairing.
- [ ] Add PWA installation support.
- [ ] Improve interface customization.
- [ ] Expand Linux desktop compatibility.

---

## Troubleshooting

### Mouse cursor doesn't move
The mouse/keyboard input requires a backend tool and proper permissions:

1. **Install input backend:**
   ```bash
   # Arch
   sudo pacman -S ydotool xdotool
   # Debian/Ubuntu
   sudo apt install ydotool xdotool
   # Fedora
   sudo dnf install ydotool xdotool
   ```

2. **Add user to input group (required for ydotool):**
   ```bash
   sudo usermod -aG input $USER
   ```
   Then **reboot or log out/in**.

3. **Start ydotool daemon (for Wayland):**
   ```bash
   systemctl --user enable --now ydotoold
   ```

4. **Verify it works:**
   ```bash
   ydotool mousemove -- 100 100
   # or
   xdotool mousemove 100 100
   ```

### Media keys not working
- Install `playerctl`: `sudo pacman -S playerctl` (or apt/dnf)
- Make sure a MPRIS-compatible player is running (Spotify, Firefox, VLC, etc.)

### Workspace switching not working
- **Hyprland (Wayland):** Uses `hyprctl` automatically
- **Cinnamon/GNOME/KDE (X11):** Install `wmctrl`: `sudo pacman -S wmctrl`

### Can't connect from phone
- Check firewall: `sudo ufw allow 3000` or `sudo firewall-cmd --add-port=3000/tcp`
- Use PC's LAN IP (not localhost): `ip addr show | grep inet`
- Both devices must be on the same network

### Virtual keyboard / arrow keys not working
- Same input backend requirements as mouse
- Arrow buttons in Mouse tab send Left/Right keys for PowerPoint navigation

---

## Security

Security is a core design requirement.

- Authenticate devices before allowing desktop control.
- Validate every incoming request.
- Allow only explicitly permitted actions.
- Never execute arbitrary shell commands supplied by clients.
- Restrict access to trusted networks.
- Use secure transport where appropriate.
- Apply the principle of least privilege to input permissions.
- Do not expose the control server directly to the public Internet without appropriate security measures.

NexusMote is designed primarily for local network use.

---

## Contributing

Contributions, bug reports, suggestions, and improvements are welcome!

1. Fork the repository.
2. Create a branch for your changes.
3. Implement and test your changes.
4. Submit a pull request with a clear description.

Please keep contributions focused, document new functionality, and test changes before submitting them.

---

## License

NexusMote is intended to be released under the **MIT License**.

Before publishing the project under this license, ensure the repository contains a `LICENSE` file with the complete MIT license text.

---

## Credits

Built with ❤️ by **NexusPT**.

**NexusMote — Your smartphone. Your desktop. Your control.**