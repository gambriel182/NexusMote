# NexusMote Desktop

## Development

```bash
cd desktop
npm install
npm start
```

## Build AppImage (Linux)

### Prerequisites
- Node.js 20+
- Linux with `libfuse2` for running AppImage
- Optional: Docker for clean build environment

### Build locally
```bash
cd desktop
npm run pack
# Output: desktop/release/NexusMote-<version>.AppImage
```

### Build via GitHub Actions (CI)
See `.github/workflows/build-desktop.yml`

### Build in Docker (recommended for consistent results)
```bash
docker run --rm -v $(pwd):/src -w /src electronuserland/builder:wine \
  npm run pack
```

## Run AppImage
```bash
chmod +x NexusMote-0.1.0.AppImage
./NexusMote-0.1.0.AppImage
```

## System Requirements (Runtime)
- Linux (X11 or Wayland with XWayland)
- `xdotool` for input injection fallback
- `libfuse2` (Ubuntu/Debian: `sudo apt install libfuse2`)

## Wayland Notes
On Wayland, `xdotool` may not work. Options:
1. Run with XWayland: `GDK_BACKEND=x11 ./NexusMote.AppImage`
2. Use `ydotool` (requires `uinput` group): `sudo usermod -a -G uinput $USER`
3. Install `uiohook-napi` globally: `npm i -g uiohook-napi`