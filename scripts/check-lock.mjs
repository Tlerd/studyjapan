// A directory lock that stops concurrent `pnpm check` runs in the same checkout.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function lockPath(root) {
  const hash = createHash('sha1').update(root.toLowerCase()).digest('hex').slice(0, 12);
  return join(tmpdir(), `hoc-tieng-nhat-check-${hash}.lock`);
}

function defaultIsAlive(pid) {
  if (typeof pid !== 'number' || Number.isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code !== 'ESRCH' && err?.code !== 'EINVAL';
  }
}

export async function acquire(
  path,
  {
    pid = process.pid,
    isAlive,
    now = Date.now,
    waitMs = 2000,
    timeoutMs = 20 * 60 * 1000,
    staleMs = 30 * 60 * 1000,
    onWait,
  } = {},
) {
  const checkAlive = isAlive ?? defaultIsAlive;
  const startTime = now();
  let warned = false;

  while (true) {
    try {
      mkdirSync(path);
      writeFileSync(join(path, 'owner.json'), JSON.stringify({ pid, startedAt: now() }));
      let released = false;
      return function release() {
        if (released) return;
        try {
          const owner = JSON.parse(readFileSync(join(path, 'owner.json'), 'utf8'));
          if (owner.pid === pid) {
            rmSync(path, { recursive: true, force: true, maxRetries: 3 });
            released = true;
          }
        } catch {
          // Dir or file already removed
        }
      };
    } catch (err) {
      if (err?.code !== 'EEXIST') throw err;
    }

    let owner = null;
    try {
      owner = JSON.parse(readFileSync(join(path, 'owner.json'), 'utf8'));
    } catch {
      if (!existsSync(path)) continue;
      // The owner writes owner.json just after mkdir. A lock without it is broken only when it is old.
      let ageMs = 0;
      try {
        ageMs = Date.now() - statSync(path).mtimeMs;
      } catch {
        continue;
      }
      if (ageMs < 10_000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
    }

    const isOwnerAlive = owner?.pid != null && checkAlive(owner.pid);
    const isOwnerStale = typeof owner?.startedAt === 'number' && now() - owner.startedAt > staleMs;

    if (!owner || !isOwnerAlive || isOwnerStale) {
      try {
        rmSync(path, { recursive: true, force: true, maxRetries: 3 });
      } catch {}
      continue;
    }

    if (now() - startTime >= timeoutMs) {
      throw new Error(`Timeout waiting for check lock held by pid ${owner.pid}`);
    }

    if (!warned) {
      onWait?.(owner.pid);
      warned = true;
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}
