/**
 * Input controller — converts NexusMote messages into real desktop input.
 *
 * Strategy (Linux):
 *   1. Try uiohook-napi (native, works on X11/Wayland via uinput).
 *   2. Fall back to xdotool command-line tool (works on X11 and XWayland).
 *   3. Last resort: synthetic movement via the compositor if available.
 *
 * All methods are best-effort and log failures so the UI still shows state.
 */
const { execFile } = require('child_process');

let uiohook = null;
try {
  // Optional native dependency. Not required.
  uiohook = require('uiohook-napi');
} catch (err) {
  uiohook = null;
}

let lastX = 0;
let lastY = 0;
let useUiohook = false;

function initUiohook() {
  if (!uiohook) return false;
  try {
    uiohook.on('mousemove', (e) => {
      lastX = e.x;
      lastY = e.y;
    });
    uiohook.setOptions({ autoRepeat: false });
    uiohook.install();
    useUiohook = true;
    console.log('[input] uiohook installed');
    return true;
  } catch (err) {
    console.warn('[input] uiohook install failed, falling back', err.message);
    useUiohook = false;
    return false;
  }
}

function move(dx, dy) {
  if (useUiohook) {
    try {
      uiohook.mouseMove({ x: dx, y: dy, relative: true });
      return;
    } catch (err) {
      console.warn('[input] uiohook mouseMove failed', err.message);
    }
  }
  // xdotool fallback
  execFile('xdotool', ['mousemove', '--relative', String(dx), String(dy)], (err) => {
    if (err) console.warn('[input] xdotool mousemove failed', err.message);
  });
}

function click(button) {
  if (useUiohook) {
    try {
      if (button === 'left') uiohook.mouseClick([0]);
      else if (button === 'right') uiohook.mouseClick([2]);
      else if (button === 'middle') uiohook.mouseClick([1]);
      return;
    } catch (err) {
      console.warn('[input] uiohook click failed', err.message);
    }
  }
  const btn = button === 'right' ? '3' : button === 'middle' ? '2' : '1';
  execFile('xdotool', ['click', btn], (err) => {
    if (err) console.warn('[input] xdotool click failed', err.message);
  });
}

function scroll(dy) {
  if (useUiohook) {
    try {
      uiohook.scroll({ horizontal: 0, vertical: dy });
      return;
    } catch (err) {
      console.warn('[input] uiohook scroll failed', err.message);
    }
  }
  // xdotool: wheel up = 4, wheel down = 5, repeat |dy| times
  const dir = dy < 0 ? 'up' : 'down';
  const count = Math.max(1, Math.round(Math.abs(dy)));
  execFile('xdotool', ['click', dir === 'up' ? '4' : '5', '--repeat', String(count)], (err) => {
    if (err) console.warn('[input] xdotool scroll failed', err.message);
  });
}

function handleInput(msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'mouse.move':
      move(msg.dx || 0, msg.dy || 0);
      break;
    case 'mouse.click':
      click(msg.button || 'left');
      break;
    case 'mouse.scroll':
      scroll(msg.dy || 0);
      break;
    default:
      console.log('[input] unhandled message type', msg.type);
  }
}

// Try to initialize uiohook at startup
initUiohook();

module.exports = { handleInput, move, click, scroll };