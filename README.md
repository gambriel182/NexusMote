NexusMote 🖱️📱

    #Turn your phone into a wireless touchpad for your Linux desktop.


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://www.electronjs.org/)
[![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

✨ What is NexusMote?

NexusMote is an open source application that turns your Android smartphone into a virtual touchpad to control the cursor on your Linux desktop.

No cables. No complicated drivers. No manual network configuration. Just two devices on the same Wi-Fi network — and your phone becomes your PC's mouse.

It's made of two applications that talk to each other over WebSocket on the local network:

    📱 NexusMote Mobile — an Android app (.apk) that acts as the touchpad.

    🖥️ NexusMote Desktop — a Linux application (.AppImage) that receives events and injects real movements/clicks into the desktop.

🎯 Why use it?

    🛋️ Control your PC from the couch

    🎤 Presentations and demos without a physical mouse

    🖥️ Media centers and HTPC setups

    🧪 Technical curiosity — networking + low-level input in a simple project

🖱️ Features
📱 Mobile (Android APK)

    ✅ Fullscreen touchpad with natural gestures

    ✅ Relative movement: finger → right, cursor → right

    ✅ Tap = left click

    ✅ Long press = right click

    ✅ Two fingers = scroll

    ✅ Optional L / R buttons for dedicated clicks

    ✅ Haptic feedback on clicks

    ✅ Server discovery and connection via QR Code or IP

    ✅ Built with Expo / React Native + TypeScript

🖥️ Desktop (Linux AppImage)

    ✅ Local WebSocket server (LAN)

    ✅ QR Code / IP pairing — connect in seconds

    ✅ Token-based authentication per device

    ✅ Event parsing and handling:

        mouse.move → relative cursor movement

        mouse.left → left click

        mouse.right → right click

        mouse.scroll → vertical scroll

    ✅ Real input injection via uiohook / native X11 / Wayland integration

    ✅ Real-time status:

        🟢 Connected

        🔴 Disconnected

        📱 Paired device name

    ✅ Distributed as an AppImage (portable, no install)



📡 Protocol

Minimalist JSON communication over WebSocket.
Movement
json

{ "type": "mouse.move", "dx": 14, "dy": -7 }

Click
json

{ "type": "mouse.click", "button": "left" }

Scroll
json

{ "type": "mouse.scroll", "dy": 3 }

Pairing
json

{
  "type": "pair",
  "deviceName": "Gabriel Phone",
  "token": "..."
}

📦 Installation

NexusMote ships as two ready-to-use binaries. No need to compile anything.
🖥️ 1. Desktop — Linux (AppImage)

    Go to the Releases page and download the latest file:
    text

    NexusMote-x.x.x.AppImage

    Make it executable:
    bash

    chmod +x NexusMote-x.x.x.AppImage

    Run it:
    bash

    ./NexusMote-x.x.x.AppImage

    In the app window you'll see:

        Your PC's local IP

        A QR Code to pair your phone

        The connection status (🟢 / 🔴)

    💡 Wayland note: if you're on Wayland and the cursor doesn't move, try running with --ozone-platform=x11 or use an X11 session. Native support is on the roadmap.

    🔓 Permissions: some distros may require extra permissions to inject input (uinput). If you run into issues, check the FAQ.

📱 2. Mobile — Android (APK)

    Go to the Releases page and download:
    text

    NexusMote-x.x.x.apk

    On your phone, allow installation from unknown sources (Settings → Security).

    Open the .apk and install.

    Open the NexusMote app and:

        Option A: point your camera at the QR Code shown on the desktop

        Option B: manually type the IP + port shown on the desktop

    Done — your phone is now a touchpad. 🎉

📶 Network requirements

    Both devices on the same Wi-Fi network

    Linux firewall must allow the WebSocket port (default: 8080)

    Some routers with AP isolation may block the connection — disable it if needed

🛠️ Stack
Layer	Technologies
Desktop	Linux, Electron, Node.js, TypeScript, WebSocket, uiohook / X11 / Wayland, AppImage
Mobile	Expo, React Native, TypeScript, WebSocket, Gesture Handler, APK
Communication	WebSocket over LAN
❓ FAQ

The cursor doesn't move on Wayland.
Wayland restricts input injection for security. Use an X11 session or run with --ozone-platform=x11. Native Wayland support is on the roadmap.

My phone can't find the PC.
Make sure they're on the same Wi-Fi network and the firewall allows the port. Some routers have AP isolation enabled — disable it.

The AppImage won't open.
You're likely missing libfuse2. On Ubuntu/Debian:
bash

sudo apt install libfuse2

Can I use more than one phone?
In this MVP version, only one device at a time. Multi-device support is on the roadmap.
🗺️ Roadmap

    □

    Native Wayland support
    □

    Windows support
    □

    Extra gestures (pinch, 3-finger swipe)
    □

    Auto-reconnect
    □

    End-to-end encryption
    □

    "Presentation" mode with hotkeys
    □

    Multi-device support
    □

    Publish on F-Droid and Flathub


Distributed under the MIT license. See the LICENSE file for more information.
<div align="center">

NexusMote — your phone, now your mouse. 🖱️✨

Made with ❤️ for the Linux community
</div>
