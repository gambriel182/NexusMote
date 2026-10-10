import { FastifyInstance } from 'fastify';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ActionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export async function launchApp(app: string): Promise<ActionResult> {
  try {
    const proc = spawn(app, { detached: true, stdio: 'ignore' });
    proc.unref();
    return { success: true, output: `Launched ${app}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setAudioVolume(level: number): Promise<ActionResult> {
  try {
    await execFileAsync('pactl', ['set-sink-volume', '@DEFAULT_SINK@', `${Math.round(Math.max(0, Math.min(100, level)))}%`]);
    return { success: true, output: `Volume set to ${level}%` };
  } catch (err: any) {
    return { success: false, error: 'Failed to set volume' };
  }
}

export async function toggleAudioMute(): Promise<ActionResult> {
  try {
    await execFileAsync('pactl', ['set-sink-mute', '@DEFAULT_SINK@', 'toggle']);
    return { success: true, output: 'Audio mute toggled' };
  } catch (err: any) {
    return { success: false, error: 'Failed to toggle mute' };
  }
}

export async function getAudioVolume(): Promise<ActionResult> {
  try {
    const proc = spawn('pactl', ['get-sink-volume', '@DEFAULT_SINK@']);
    const output = await new Promise<string>((resolve, reject) => {
      let data = '';
      proc.stdout.on('data', (chunk) => data += chunk);
      proc.on('close', (code) => code === 0 ? resolve(data) : reject(new Error('Failed to get volume')));
    });
    const match = output.match(/(\d+)%/);
    const volume = match ? parseInt(match[1], 10) : 0;
    return { success: true, output: String(volume) };
  } catch (err: any) {
    return { success: false, error: 'Failed to get volume' };
  }
}

export async function mediaControl(action: 'play-pause' | 'next' | 'previous' | 'stop'): Promise<ActionResult> {
  try {
    await execFileAsync('playerctl', [action]);
    return { success: true, output: `Media ${action}` };
  } catch (err: any) {
    return { success: false, error: 'Media control failed' };
  }
}

export async function switchWorkspace(target: string | number): Promise<ActionResult> {
  try {
    const arg = target === 'next' ? '+1' : target === 'previous' ? '-1' : String(target);
    await execFileAsync('hyprctl', ['dispatch', 'workspace', arg]);
    return { success: true, output: `Switched to workspace ${arg}` };
  } catch (err: any) {
    return { success: false, error: 'Workspace switch failed' };
  }
}

export async function getWorkspaces(): Promise<ActionResult> {
  try {
    const proc = spawn('hyprctl', ['workspaces', '-j']);
    const output = await new Promise<string>((resolve, reject) => {
      let data = '';
      proc.stdout.on('data', (chunk) => data += chunk);
      proc.on('close', (code) => code === 0 ? resolve(data) : reject(new Error('Failed to get workspaces')));
    });
    return { success: true, output };
  } catch (err: any) {
    return { success: false, error: 'Failed to get workspaces' };
  }
}

export async function getActiveWindow(): Promise<ActionResult> {
  try {
    const proc = spawn('hyprctl', ['activewindow', '-j']);
    const output = await new Promise<string>((resolve, reject) => {
      let data = '';
      proc.stdout.on('data', (chunk) => data += chunk);
      proc.on('close', (code) => code === 0 ? resolve(data) : reject(new Error('Failed to get active window')));
    });
    return { success: true, output };
  } catch (err: any) {
    return { success: false, error: 'Failed to get active window' };
  }
}

export function registerActions(fastify: FastifyInstance) {
  fastify.post('/api/actions/launch', async (request, reply) => {
    const { app } = request.body as { app: string };
    if (!app) return reply.code(400).send({ error: 'Missing app parameter' });
    return launchApp(app);
  });

  fastify.post('/api/actions/volume', async (request, reply) => {
    const { level } = request.body as { level: number };
    if (typeof level !== 'number') return reply.code(400).send({ error: 'Missing level parameter' });
    return setAudioVolume(level);
  });

  fastify.post('/api/actions/volume/mute', async () => {
    return toggleAudioMute();
  });

  fastify.get('/api/actions/volume', async () => {
    return getAudioVolume();
  });

  fastify.post('/api/actions/media', async (request, reply) => {
    const { action } = request.body as { action: 'play-pause' | 'next' | 'previous' | 'stop' };
    if (!action) return reply.code(400).send({ error: 'Missing action parameter' });
    return mediaControl(action);
  });

  fastify.post('/api/actions/workspace', async (request, reply) => {
    const { target } = request.body as { target: string | number };
    if (target === undefined) return reply.code(400).send({ error: 'Missing target parameter' });
    return switchWorkspace(target);
  });

  fastify.get('/api/actions/workspaces', async () => {
    return getWorkspaces();
  });

  fastify.get('/api/actions/active-window', async () => {
    return getActiveWindow();
  });
}