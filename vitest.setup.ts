// Mock of electron for unit tests in node environment
import { vi } from 'vitest';

vi.mock('electron', () => {
  const listeners: Record<string, Function[]> = {};
  return {
    app: {
      getPath: (name: string) => {
        if (name === 'userData') return process.cwd();
        return process.cwd();
      },
      whenReady: () => Promise.resolve(),
    },
    shell: {
      openExternal: vi.fn(),
      openPath: vi.fn(),
      showItemInFolder: vi.fn(),
    },
  } as any;
});


