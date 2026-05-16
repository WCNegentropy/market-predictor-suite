import fs from 'node:fs';
import path from 'node:path';

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function withFileLock(lockFile, fn, staleMs = 1000 * 60 * 60 * 6) {
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  const now = Date.now();
  if (fs.existsSync(lockFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      const ageMs = now - new Date(existing.createdAt).getTime();
      const alive = Number.isFinite(existing.pid) ? processAlive(existing.pid) : false;
      if (alive && ageMs < staleMs) {
        throw new Error(`Another run is active for this target (pid=${existing.pid})`);
      }
    } catch (error) {
      if (String(error.message || error).includes('Another run is active')) throw error;
    }
    fs.rmSync(lockFile, { force: true });
  }
  fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }, null, 2));
  try {
    return fn();
  } finally {
    fs.rmSync(lockFile, { force: true });
  }
}
