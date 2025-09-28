import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileBasedMCPConfigsStorage } from '../fb-mcp-config-storage';

describe('createFileBasedMCPConfigsStorage', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
    file = join(dir, 'config.json');
  });

  afterEach(() => {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  });

  it('initializes and reads empty config', async () => {
    const storage = createFileBasedMCPConfigsStorage(file);
    await storage.init({} as any);
    const all = await storage.loadAll();
    expect(all).toEqual([]);
  });

  it('saves and retrieves config entries', async () => {
    const storage = createFileBasedMCPConfigsStorage(file);
    await storage.init({} as any);
    const saved = await storage.save({ name: 'server-a', config: { command: 'node', args: ['-v'] } });
    expect(saved.id).toBe('server-a');
    const all = await storage.loadAll();
    expect(all.length).toBe(1);
    expect(await storage.has('server-a')).toBe(true);
    expect(await storage.get('server-a')).not.toBeNull();
  });

  it('deletes config entries', async () => {
    const storage = createFileBasedMCPConfigsStorage(file);
    await storage.init({} as any);
    await storage.save({ name: 'server-a', config: { command: 'node' } });
    await storage.delete('server-a');
    expect(await storage.has('server-a')).toBe(false);
  });

  it('detects external file changes on refresh', async () => {
    const storage = createFileBasedMCPConfigsStorage(file);
    await storage.init({} as any);
    writeFileSync(file, JSON.stringify({ test: { command: 'bash', args: ['-lc', 'echo hi'] } }, null, 2));
    const all = await storage.loadAll();
    expect(all.find((s) => s.name === 'test')).toBeTruthy();
  });
});


