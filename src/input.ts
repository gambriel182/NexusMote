import { FastifyInstance } from 'fastify';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface InputResult {
  success: boolean;
  output?: string;
  error?: string;
}

export async function moveMouse(x: number, y: number): Promise<InputResult> {
  try {
    await execFileAsync('ydotool', ['mousemove', '--', String(Math.round(x)), String(Math.round(y))]);
    return { success: true, output: `Mouse moved to ${x},${y}` };
  } catch (err: any) {
    return { success: false, error: 'Mouse move failed' };
  }
}

export async function moveMouseRelative(dx: number, dy: number): Promise<InputResult> {
  try {
    await execFile('ydotool', ['mousemove', '--relative', '--', String(Math.round(dx)), String(Math.round(dy))]);
    return { success: true, output: `Mouse moved relatively by ${dx},${dy}` };
  } catch (err: any) {
    return { success: false, error: 'Mouse relative move failed' };
  }
}

export async function clickMouse(button: 'left' | 'right' | 'middle', down: boolean): Promise<InputResult> {
  try {
    const btnMap: Record<string, string> = { left: '1', right: '3', middle: '2' };
    await execFile('ydotool', ['click', down ? '1' : '0', btnMap[button]]);
    return { success: true, output: `Mouse ${button} ${down ? 'down' : 'up'}` };
  } catch (err: any) {
    return { success: false, error: 'Mouse click failed' };
  }
}

export async function scrollMouse(deltaX: number, deltaY: number): Promise<InputResult> {
  try {
    await execFile('ydotool', ['mousescroll', '--', String(Math.round(deltaX)), String(Math.round(deltaY))]);
    return { success: true, output: `Mouse scrolled ${deltaX},${deltaY}` };
  } catch (err: any) {
    return { success: false, error: 'Mouse scroll failed' };
  }
}

export async function typeText(text: string): Promise<InputResult> {
  try {
    await execFile('ydotool', ['type', text]);
    return { success: true, output: `Typed ${text.length} characters` };
  } catch (err: any) {
    return { success: false, error: 'Keyboard type failed' };
  }
}

export async function pressKey(key: string, down: boolean): Promise<InputResult> {
  try {
    await execFile('ydotool', ['key', `${down ? '' : 'u'}${key}`]);
    return { success: true, output: `Key ${key} ${down ? 'down' : 'up'}` };
  } catch (err: any) {
    return { success: false, error: 'Keyboard key failed' };
  }
}

export async function keyCombo(keys: string[]): Promise<InputResult> {
  try {
    for (const key of keys) {
      await execFile('ydotool', ['key', key]);
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