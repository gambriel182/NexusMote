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

### 2. Clone the repository


```bash
git clone https://github.com/gambriel182/NexusMote.git
cd NexusMote
```

### 3. Install the dependencies

If the repository contains a `package-lock.json`, run:

```bash
npm ci
```

Otherwise, if it contains a `package.json`, run:

```bash
npm install
```

### 4. Configure the application

Follow the configuration instructions provided by the project. Depending on the current implementation, this may include setting the server port, configuring device authentication, and enabling supported desktop integrations.

Do not expose the server to untrusted networks.

### 5. Start NexusMote

Use the development or production command defined in `package.json`. For example, if the repository defines a `dev` script:

```bash
npm run dev
```

If the project does not yet contain the server implementation or the corresponding npm scripts, the application cannot be started yet. Check the current development status and available scripts before proceeding.

---

## Connecting Your Smartphone

Once the server is running and the mobile interface is implemented:

1. Connect your smartphone and PC to the same trusted network.
2. Find the PC's local IP address.
3. Open the configured NexusMote address in your smartphone's browser, using the PC's IP address and server port.
4. Complete the device authentication or pairing process, if implemented.
5. Open the Deck, Mouse, or Monitor interface and use the available features.

For example, if the PC's local IP address is `192.168.1.100` and the server uses port `3000`, the address would be:

```text
http://192.168.1.100:3000
```

This is only an example. Use the actual address and port configured for your installation.

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
| System monitoring | Linux `/proc` and `/sys` |
| Optional GPU monitoring | NVIDIA `nvidia-smi` |
| Mobile access | Web browser |
| PWA support | Planned |

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