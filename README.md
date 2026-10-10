# NexusMote

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)](https://kernel.org/)
[![Hyprland](https://img.shields.io/badge/Hyprland-58E1FF?logo=hyprland&logoColor=black)](https://hypr.land/)
[![Open Source](https://img.shields.io/badge/Open%20Source-Community-blue)](https://opensource.org/)

**Turn your smartphone into a PC controller.**

NexusMote is an open-source project by **NexusPT** that transforms a smartphone into a versatile controller for a Linux desktop.

It combines a customizable Stream Deck, a remote mouse and keyboard, and real-time hardware monitoring in one interface.

The project initially targets Linux desktops running Hyprland, with the goal of making desktop control simple, accessible, and customizable.

---

## Features

### 🎛️ Stream Deck

- Customizable action buttons.
- Launch desktop applications.
- Control audio and media playback.
- Switch Hyprland workspaces.
- Create shortcuts for everyday tasks.
- Build a personalized control panel.

### 🖱️ Remote Mouse & Keyboard

- Touchpad-style mouse control.
- Mouse clicks and scrolling.
- Remote keyboard input.
- Designed for local network communication.
- No root access required on the smartphone.

### 📊 Hardware Monitoring

- CPU utilization.
- RAM usage.
- System uptime.
- Network status.
- CPU temperatures when supported.
- NVIDIA GPU metrics when available.
- Real-time updates through WebSocket.

### 📱 Smartphone Interface

- Responsive mobile-first interface.
- Designed for Android smartphones and modern mobile browsers.
- Three main modes: Deck, Mouse, and Monitor.
- Potential Progressive Web App (PWA) support.

---

## Architecture

NexusMote uses a client-server architecture.

```text
                 NEXUSMOTE
                     |
          +----------+----------+
          |                     |
   Smartphone Client       Linux PC Server
          |                     |
     Web Interface       Node.js + TypeScript
          |                     |
          +---- HTTP / WS ------+
                                |
                   +------------+------------+
                   |            |            |
                Hyprland      Input       Monitoring
                hyprctl    Backend       /proc + /sys
                                          nvidia-smi
```

### Smartphone Client

The client provides the user interface for remote desktop control. It communicates with the server over the local network using HTTP and WebSocket.

### Linux Server

The server receives authenticated requests, validates actions, executes permitted operations, and provides hardware metrics.

### Desktop Integration

Hyprland integration uses its available control interfaces. Mouse and keyboard input use a compatible Linux input backend.

### Hardware Monitoring

System metrics are collected through Linux system interfaces, with optional GPU metrics when supported by the installed drivers and hardware.

---

## Technology Stack

| Component | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| HTTP server | Fastify |
| Real-time communication | WebSocket |
| Client interface | HTML, CSS, JavaScript/TypeScript |
| Desktop integration | Hyprland |
| Hardware monitoring | Linux `/proc` and `/sys` |
| Optional GPU monitoring | NVIDIA `nvidia-smi` |
| Mobile deployment | PWA, planned |

---

## Requirements

### PC

- Linux operating system.
- Node.js and npm.
- Hyprland for Hyprland-specific features.
- A compatible input backend for remote mouse and keyboard.
- Smartphone and PC connected to the same trusted local network.

### Smartphone

- Android or another device with a modern web browser.
- Wi-Fi or another supported network connection.
- No root access required.

---

## Getting Started

NexusMote is currently under development. The following steps describe the planned development setup.

### 1. Install dependencies

On Arch Linux:

```bash
sudo pacman -S --needed nodejs npm git
```

### 2. Create the project

```bash
mkdir -p ~/Projetos/NexusMote
cd ~/Projetos/NexusMote

npm init -y
npm install fastify @fastify/static ws
npm install -D typescript tsx @types/node @types/ws

npx tsc --init
```

### 3. Start development

Once the server and client have been implemented, configure the appropriate development script in `package.json` and start the server.

> The application is not yet ready for production. These commands initialize the development environment; they do not install a finished NexusMote application.

---

## Project Structure

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
├── tsconfig.json
├── LICENSE
└── README.md
```

The structure represents the planned MVP and may change during development.

---

## Development Roadmap

### Phase 1 — Core MVP

- [ ] Set up the Node.js server.
- [ ] Build the mobile interface.
- [ ] Implement predefined desktop actions.
- [ ] Add CPU and RAM monitoring.
- [ ] Implement WebSocket updates.
- [ ] Establish authenticated client connections.

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

## Security

Security is a core design requirement.

- Authenticate devices before allowing control.
- Validate every incoming request.
- Allow only explicitly permitted desktop actions.
- Never execute arbitrary shell commands supplied by clients.
- Restrict server access to trusted networks.
- Use secure transport when appropriate.
- Apply the principle of least privilege to input permissions.
- Do not expose the control server directly to the public Internet without appropriate security measures.

NexusMote is designed primarily for local network use.

---

## Contributing

Contributions, bug reports, suggestions, and improvements are welcome.

If you want to contribute:

1. Fork the repository.
2. Create a branch for your changes.
3. Implement and test your changes.
4. Submit a pull request with a clear description.

Please keep changes focused and document new functionality.

---

## License

NexusMote is intended to be released under the **MIT License**.

The MIT license permits reuse, modification, and distribution subject to its terms. The repository should include a `LICENSE` file containing the complete MIT license text before the project is published under that license.

---

## Credits

Built with ❤️ by **NexusPT**.

**NexusMote — Your smartphone. Your desktop. Your control.**