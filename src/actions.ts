import { FastifyInstance } from 'fastify';
import { execFile, spawn } from 'child_process';
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
      proc.stdout.on('data', (chunk: Buffer) => data += chunk);
      proc.on('close', (code: number) => code === 0 ? resolve(data) : reject(new Error('Failed to get volume')));
    });
    const match = output.match(/(\d+)%/);
    const volume = match ? parseInt(match[1], 10) : 0;
    return { success: true, output: String(volume) };
  } catch (err: any) {
    return { success: false, error: 'Failed to get volume' };
  }
}

export async function mediaControl(action: 'play-pause' | 'next' | 'previous' | 'stop', player?: string): Promise<ActionResult> {
  try {
    const args = player ? ['-p', player, action] : [action];
    await execFileAsync('playerctl', args);
    return { success: true, output: `Media ${action}${player ? ` on ${player}` : ''}` };
  } catch (err: any) {
    return { success: false, error: 'Media control failed' };
  }
}

export async function switchWorkspace(target: string | number): Promise<ActionResult> {
  try {
    // Try hyprctl first (Hyprland)
    if (target === 'next' || target === 'previous' || typeof target === 'number') {
      const arg = target === 'next' ? '+1' : target === 'previous' ? '-1' : String(target);
      try {
        await execFileAsync('hyprctl', ['dispatch', 'workspace', arg]);
        return { success: true, output: `Switched to workspace ${arg}` };
      } catch {}
    }

    // Try wmctrl (X11/Cinnamon/GNOME)
    if (target === 'next') {
      await execFileAsync('wmctrl', ['-s', '$(($(wmctrl -d | grep "*" | cut -d" " -f1) + 1))'], { shell: true });
      return { success: true, output: 'Switched to next workspace' };
    }
    if (target === 'previous') {
      await execFileAsync('wmctrl', ['-s', '$(($(wmctrl -d | grep "*" | cut -d" " -f1) - 1))'], { shell: true });
      return { success: true, output: 'Switched to previous workspace' };
    }
    if (typeof target === 'number') {
      await execFileAsync('wmctrl', ['-s', String(target - 1)]);
      return { success: true, output: `Switched to workspace ${target}` };
    }

    return { success: false, error: 'No workspace manager found (need hyprctl or wmctrl)' };
  } catch (err: any) {
    return { success: false, error: 'Workspace switch failed' };
  }
}

export async function getWorkspaces(): Promise<ActionResult> {
  try {
    // Try hyprctl first
    try {
      const proc = spawn('hyprctl', ['workspaces', '-j']);
      const output = await new Promise<string>((resolve, reject) => {
        let data = '';
        proc.stdout.on('data', (chunk) => data += chunk);
        proc.on('close', (code) => code === 0 ? resolve(data) : reject(new Error('Failed to get workspaces')));
      });
      return { success: true, output };
    } catch {}

    // Try wmctrl
    const proc = spawn('wmctrl', ['-d']);
    const output = await new Promise<string>((resolve, reject) => {
      let data = '';
      proc.stdout.on('data', (chunk: Buffer) => data += chunk);
      proc.on('close', (code: number) => code === 0 ? resolve(data) : reject(new Error('Failed to get workspaces')));
    });
    const workspaces = output.trim().split('\n').map(line => {
      const parts = line.split(/\s+/);
      return { id: parseInt(parts[0]) + 1, name: parts.slice(8).join(' ') || `Workspace ${parseInt(parts[0]) + 1}`, active: parts[1] === '*' };
    });
    return { success: true, output: JSON.stringify(workspaces) };
  } catch (err: any) {
    return { success: false, error: 'Failed to get workspaces' };
  }
}

export async function getActiveWindow(): Promise<ActionResult> {
  try {
    // Try hyprctl first
    try {
      const proc = spawn('hyprctl', ['activewindow', '-j']);
      const output = await new Promise<string>((resolve, reject) => {
        let data = '';
        proc.stdout.on('data', (chunk) => data += chunk);
        proc.on('close', (code) => code === 0 ? resolve(data) : reject(new Error('Failed to get active window')));
      });
      return { success: true, output };
    } catch {}

    // Try xdotool
    const proc = spawn('xdotool', ['getactivewindow', 'getwindowname']);
    const output = await new Promise<string>((resolve, reject) => {
      let data = '';
      proc.stdout.on('data', (chunk: Buffer) => data += chunk);
      proc.on('close', (code: number) => code === 0 ? resolve(data) : reject(new Error('Failed to get active window')));
    });
    return { success: true, output: JSON.stringify({ title: output.trim() }) };
  } catch (err: any) {
    return { success: false, error: 'Failed to get active window' };
  }
}

export async function getApplications(): Promise<ActionResult> {
  try {
    const proc = spawn('find', ['/usr/share/applications', '/home/' + process.env.USER + '/.local/share/applications', '-name', '*.desktop', '-type', 'f'], { shell: true });
    const output = await new Promise<string>((resolve, reject) => {
      let data = '';
      proc.stdout.on('data', (chunk: Buffer) => data += chunk);
      proc.on('close', (code: number) => code === 0 ? resolve(data) : reject(new Error('Failed to find applications')));
    });
    
    const apps = [];
    for (const file of output.trim().split('\n')) {
      if (!file) continue;
      try {
        const content = await import('fs/promises').then(fs => fs.readFile(file, 'utf-8'));
        const nameMatch = content.match(/^Name=(.+)$/m);
        const execMatch = content.match(/^Exec=(.+)$/m);
        const noDisplay = content.match(/^NoDisplay=true$/m);
        const terminal = content.match(/^Terminal=true$/m);
        
        if (nameMatch && execMatch && !noDisplay && !terminal) {
          let exec = execMatch[1].split(' ')[0];
          exec = exec.replace(/%[fFuU]/g, '');
          apps.push({ name: nameMatch[1], exec, desktopFile: file });
        }
      } catch {}
    }
    
    apps.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, output: JSON.stringify(apps) };
  } catch (err: any) {
    return { success: false, error: 'Failed to get applications' };
  }
}

export async function getMediaPlayers(): Promise<ActionResult> {
  try {
    const proc = spawn('playerctl', ['-l']);
    const output = await new Promise<string>((resolve, reject) => {
      let data = '';
      proc.stdout.on('data', (chunk: Buffer) => data += chunk);
      proc.on('close', (code: number) => code === 0 ? resolve(data) : reject(new Error('Failed to get media players')));
    });
    const players = output.trim().split('\n').filter(p => p);
    return { success: true, output: JSON.stringify(players) };
  } catch (err: any) {
    return { success: false, error: 'No media players found' };
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
    const { action, player } = request.body as { action: 'play-pause' | 'next' | 'previous' | 'stop'; player?: string };
    if (!action) return reply.code(400).send({ error: 'Missing action parameter' });
    return mediaControl(action, player);
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

  fastify.get('/api/actions/applications', async () => {
    return getApplications();
  });

  fastify.get('/api/actions/media-players', async () => {
    return getMediaPlayers();
  });
}