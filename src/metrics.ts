import { FastifyInstance } from 'fastify';
import { readFile } from 'fs/promises';
import { spawn } from 'child_process';

export interface CpuMetrics {
  usage: number;
  cores: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  available: number;
  usage: number;
}

export interface GpuMetrics {
  name: string;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
}

export interface NetworkMetrics {
  interfaces: Array<{
    name: string;
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
  }>;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  gpu?: GpuMetrics;
  network?: NetworkMetrics;
  uptime: number;
  timestamp: number;
}

let lastCpuTimes: number[] = [];

async function readCpuStats(): Promise<{ total: number; idle: number }> {
  const data = await readFile('/proc/stat', 'utf-8');
  const lines = data.trim().split('\n');
  const cpuLine = lines[0].split(/\s+/).slice(1).map(Number);
  const total = cpuLine.reduce((a, b) => a + b, 0);
  const idle = cpuLine[3];
  return { total, idle };
}

export async function getCpuMetrics(): Promise<CpuMetrics> {
  const { total, idle } = await readCpuStats();

  if (lastCpuTimes.length === 0) {
    lastCpuTimes = [total, idle];
    return { usage: 0, cores: (await readFile('/proc/cpuinfo', 'utf-8')).match(/^processor\s*:/gm)?.length || 1 };
  }

  const totalDiff = total - lastCpuTimes[0];
  const idleDiff = idle - lastCpuTimes[1];
  const usage = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;

  lastCpuTimes = [total, idle];

  const cores = (await readFile('/proc/cpuinfo', 'utf-8')).match(/^processor\s*:/gm)?.length || 1;
  return { usage, cores };
}

export async function getMemoryMetrics(): Promise<MemoryMetrics> {
  const data = await readFile('/proc/meminfo', 'utf-8');
  const lines = data.trim().split('\n');
  const memInfo: Record<string, number> = {};

  for (const line of lines) {
    const [key, value] = line.split(':');
    if (key && value) {
      memInfo[key.trim()] = parseInt(value.trim().split(' ')[0], 10) * 1024;
    }
  }

  const total = memInfo.MemTotal || 0;
  const free = memInfo.MemFree || 0;
  const available = memInfo.MemAvailable || 0;
  const used = total - available;
  const usage = total > 0 ? Math.round((used / total) * 100) : 0;

  return { total, used, free, available, usage };
}

export async function getUptime(): Promise<number> {
  const data = await readFile('/proc/uptime', 'utf-8');
  return Math.round(parseFloat(data.split(' ')[0]));
}

export async function getGpuMetrics(): Promise<GpuMetrics | null> {
  try {
    const proc = spawn('nvidia-smi', [
      '--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu',
      '--format=csv,noheader,nounits'
    ]);

    let spawnError: Error | null = null;
    proc.on('error', (err) => { spawnError = err; });

    const output = await new Promise<string>((resolve, reject) => {
      let data = '';
      proc.stdout.on('data', (chunk) => data += chunk);
      proc.on('close', (code) => {
        if (spawnError) return reject(spawnError);
        code === 0 ? resolve(data) : reject(new Error('nvidia-smi failed'));
      });
    });

    const [name, utilization, memoryUsed, memoryTotal, temperature] = output.trim().split(', ');
    return {
      name: name.trim(),
      utilization: parseInt(utilization, 10),
      memoryUsed: parseInt(memoryUsed, 10) * 1024 * 1024,
      memoryTotal: parseInt(memoryTotal, 10) * 1024 * 1024,
      temperature: parseInt(temperature, 10),
    };
  } catch {
    return null;
  }
}

export async function getNetworkMetrics(): Promise<NetworkMetrics> {
  const data = await readFile('/proc/net/dev', 'utf-8');
  const lines = data.trim().split('\n').slice(2);
  const interfaces = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 10) {
      const name = parts[0].replace(':', '');
      if (name !== 'lo') {
        interfaces.push({
          name,
          rxBytes: parseInt(parts[1], 10),
          txBytes: parseInt(parts[9], 10),
          rxPackets: parseInt(parts[2], 10),
          txPackets: parseInt(parts[10], 10),
        });
      }
    }
  }

  return { interfaces };
}

export async function getAllMetrics(): Promise<SystemMetrics> {
  const [cpu, memory, uptime, gpu, network] = await Promise.all([
    getCpuMetrics(),
    getMemoryMetrics(),
    getUptime(),
    getGpuMetrics(),
    getNetworkMetrics(),
  ]);

  return {
    cpu,
    memory,
    gpu: gpu || undefined,
    network,
    uptime,
    timestamp: Date.now(),
  };
}

export function registerMetrics(fastify: FastifyInstance) {
  fastify.get('/api/metrics', async () => {
    return getAllMetrics();
  });

  fastify.get('/api/metrics/cpu', async () => {
    return getCpuMetrics();
  });

  fastify.get('/api/metrics/memory', async () => {
    return getMemoryMetrics();
  });

  fastify.get('/api/metrics/gpu', async () => {
    return getGpuMetrics();
  });

  fastify.get('/api/metrics/network', async () => {
    return getNetworkMetrics();
  });

  fastify.get('/api/metrics/uptime', async () => {
    return { uptime: await getUptime() };
  });
}