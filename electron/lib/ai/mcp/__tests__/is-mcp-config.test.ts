import { describe, expect, it } from 'vitest';
import { isMaybeMCPServerConfig, isMaybeRemoteConfig, isMaybeStdioConfig } from '../is-mcp-config';

describe('is-mcp-config', () => {
  it('accepts stdio', () => {
    expect(isMaybeStdioConfig({ command: 'node', args: ['-v'] })).toBe(true);
    expect(isMaybeMCPServerConfig({ command: 'node' })).toBe(true);
  });
  it('accepts remote', () => {
    expect(isMaybeRemoteConfig({ url: 'https://example.com' })).toBe(true);
    expect(isMaybeMCPServerConfig({ url: 'https://example.com' })).toBe(true);
  });
  it('rejects invalid', () => {
    expect(isMaybeMCPServerConfig({})).toBe(false);
    expect(isMaybeMCPServerConfig(null)).toBe(false);
    expect(isMaybeMCPServerConfig(123 as any)).toBe(false);
  });
});


