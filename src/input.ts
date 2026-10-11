import { FastifyInstance } from 'fastify';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface InputResult {
  success: boolean;
  output?: string;
  error?: string;
}

let useYdotool = true;
let backendReady = false;

async function checkYdotool(): Promise<boolean> {
  try {
    await execFileAsync('ydotool', ['version']);
    return true;
  } catch {
    return false;
  }
}

async function checkXdotool(): Promise<boolean> {
  try {
    await execFileAsync('xdotool', ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function initInputBackend() {
  useYdotool = await checkYdotool();
  if (!useYdotool) {
    const hasXdotool = await checkXdotool();
    if (!hasXdotool) {
      console.warn('No input backend found (need ydotool or xdotool)');
    }
  }
  backendReady = true;
}

initInputBackend();

async function runYdotoolOrXdotool(ydotoolArgs: string[], xdotoolArgs: string[]): Promise<void> {
  if (!backendReady) await initInputBackend();
  
  if (useYdotool) {
    try {
      await execFileAsync('ydotool', ydotoolArgs);
      return;
    } catch {
      useYdotool = false;
    }
  }
  await execFileAsync('xdotool', xdotoolArgs);
}

function mapKey(key: string): string {
  const map: Record<string, string> = {
    'Escape': 'Escape',
    'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
    'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
    'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
    '`': 'grave', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
    '6': '6', '7': '7', '8': '8', '9': '9', '0': '0',
    '-': 'minus', '=': 'equal', 'Backspace': 'BackSpace',
    'Tab': 'Tab', 'q': 'q', 'w': 'w', 'e': 'e', 'r': 'r', 't': 't',
    'y': 'y', 'u': 'u', 'i': 'i', 'o': 'o', 'p': 'p',
    '[': 'bracketleft', ']': 'bracketright', '\\': 'backslash',
    'CapsLock': 'Caps_Lock', 'a': 'a', 's': 's', 'd': 'd', 'f': 'f',
    'g': 'g', 'h': 'h', 'j': 'j', 'k': 'k', 'l': 'l',
    ';': 'semicolon', '\'': 'apostrophe', 'Enter': 'Return',
    'ShiftLeft': 'Shift_L', 'z': 'z', 'x': 'x', 'c': 'c', 'v': 'v',
    'b': 'b', 'n': 'n', 'm': 'm', ',': 'comma', '.': 'period',
    '/': 'slash', 'ShiftRight': 'Shift_R',
    'ControlLeft': 'Control_L', 'MetaLeft': 'Super_L', 'AltLeft': 'Alt_L',
    'Space': 'space', 'AltRight': 'Alt_R', 'MetaRight': 'Super_R',
    'ControlRight': 'Control_R',
    'ArrowLeft': 'Left', 'ArrowUp': 'Up', 'ArrowRight': 'Right', 'ArrowDown': 'Down',
    'Left': 'Left', 'Right': 'Right', 'Up': 'Up', 'Down': 'Down',
  };
  return map[key] || key.toLowerCase();
}

export async function moveMouse(x: number, y: number): Promise<InputResult> {
  try {
    await runYdotoolOrXdotool(
      ['mousemove', '--', String(Math.round(x)), String(Math.round(y))],
      ['mousemove', String(Math.round(x)), String(Math.round(y))]
    );
    return { success: true, output: `Mouse moved to ${x},${y}` };
  } catch (err: any) {
    return { success: false, error: 'Mouse move failed' };
  }
}

export async function moveMouseRelative(dx: number, dy: number): Promise<InputResult> {
  try {
    await runYdotoolOrXdotool(
      ['mousemove', '--relative', '--', String(Math.round(dx)), String(Math.round(dy))],
      ['mousemove_relative', '--', String(Math.round(dx)), String(Math.round(dy))]
    );
    return { success: true, output: `Mouse moved relatively by ${dx},${dy}` };
  } catch (err: any) {
    return { success: false, error: 'Mouse relative move failed' };
  }
}

export async function clickMouse(button: 'left' | 'right' | 'middle', down: boolean): Promise<InputResult> {
  try {
    const btnMapYdo: Record<string, string> = { left: '1', right: '3', middle: '2' };
    const btnMapXdo: Record<string, string> = { left: '1', right: '3', middle: '2' };
    
    if (useYdotool) {
      await execFileAsync('ydotool', ['click', down ? '1' : '0', btnMapYdo[button]]);
    } else {
      await execFileAsync('xdotool', down ? ['mousedown', btnMapXdo[button]] : ['mouseup', btnMapXdo[button]]);
    }
    return { success: true, output: `Mouse ${button} ${down ? 'down' : 'up'}` };
  } catch (err: any) {
    return { success: false, error: 'Mouse click failed' };
  }
}

export async function scrollMouse(deltaX: number, deltaY: number): Promise<InputResult> {
  try {
    if (useYdotool) {
      await execFileAsync('ydotool', ['mousescroll', '--', String(Math.round(deltaX)), String(Math.round(deltaY))]);
    } else {
      const clicks = Math.abs(Math.round(deltaY));
      const btn = deltaY > 0 ? '4' : '5';
      for (let i = 0; i < clicks; i++) {
        await execFileAsync('xdotool', ['click', btn]);
      }
    }
    return { success: true, output: `Mouse scrolled ${deltaX},${deltaY}` };
  } catch (err: any) {
    return { success: false, error: 'Mouse scroll failed' };
  }
}

export async function typeText(text: string): Promise<InputResult> {
  try {
    if (useYdotool) {
      await execFileAsync('ydotool', ['type', text]);
    } else {
      await execFileAsync('xdotool', ['type', '--clearmodifiers', text]);
    }
    return { success: true, output: `Typed ${text.length} characters` };
  } catch (err: any) {
    return { success: false, error: 'Keyboard type failed' };
  }
}

export async function pressKey(key: string, down: boolean): Promise<InputResult> {
  try {
    const mappedKey = mapKey(key);
    
    if (useYdotool) {
      if (down) {
        await execFileAsync('ydotool', ['key', mappedKey]);
      } else {
        await execFileAsync('ydotool', ['keyup', mappedKey]);
      }
    } else {
      if (down) {
        await execFileAsync('xdotool', ['keydown', mappedKey]);
      } else {
        await execFileAsync('xdotool', ['keyup', mappedKey]);
      }
    }
    return { success: true, output: `Key ${key} ${down ? 'down' : 'up'}` };
  } catch (err: any) {
    return { success: false, error: 'Keyboard key failed' };
  }
}

export async function keyCombo(keys: string[]): Promise<InputResult> {
  try {
    const mappedKeys = keys.map(mapKey);
    if (useYdotool) {
      for (const key of mappedKeys) {
        await execFileAsync('ydotool', ['key', key]);
      }
    } else {
      await execFileAsync('xdotool', ['key', mappedKeys.join('+')]);
    }
    return { success: true, output: `Key combo: ${keys.join('+')}` };
  } catch (err: any) {
    return { success: false, error: 'Key combo failed' };
  }
}

export function registerInput(fastify: FastifyInstance) {
  fastify.post('/api/input/mouse/move', async (request, reply) => {
    const { x, y, relative } = request.body as { x: number; y: number; relative?: boolean };
    if (typeof x !== 'number' || typeof y !== 'number') {
      return reply.code(400).send({ error: 'Missing x or y parameter' });
    }
    return relative ? moveMouseRelative(x, y) : moveMouse(x, y);
  });

  fastify.post('/api/input/mouse/click', async (request, reply) => {
    const { button, down } = request.body as { button: 'left' | 'right' | 'middle'; down: boolean };
    if (!button || typeof down !== 'boolean') {
      return reply.code(400).send({ error: 'Missing button or down parameter' });
    }
    return clickMouse(button, down);
  });

  fastify.post('/api/input/mouse/scroll', async (request, reply) => {
    const { deltaX, deltaY } = request.body as { deltaX: number; deltaY: number };
    if (typeof deltaX !== 'number' || typeof deltaY !== 'number') {
      return reply.code(400).send({ error: 'Missing deltaX or deltaY parameter' });
    }
    return scrollMouse(deltaX, deltaY);
  });

  fastify.post('/api/input/keyboard/type', async (request, reply) => {
    const { text } = request.body as { text: string };
    if (!text) return reply.code(400).send({ error: 'Missing text parameter' });
    return typeText(text);
  });

  fastify.post('/api/input/keyboard/key', async (request, reply) => {
    const { key, down } = request.body as { key: string; down: boolean };
    if (!key || typeof down !== 'boolean') {
      return reply.code(400).send({ error: 'Missing key or down parameter' });
    }
    return pressKey(key, down);
  });

  fastify.post('/api/input/keyboard/combo', async (request, reply) => {
    const { keys } = request.body as { keys: string[] };
    if (!Array.isArray(keys) || keys.length === 0) {
      return reply.code(400).send({ error: 'Missing keys array' });
    }
    return keyCombo(keys);
  });
}