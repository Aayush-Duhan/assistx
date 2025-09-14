import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Locker } from "../../utils";
import { McpOAuthRepository, McpOAuthSession } from "../../../types/mcp";
import { uuidv7 } from "uuidv7";
import { error } from "node:console";
type Store = {
  sessions: McpOAuthSession[];
};

const FILE_NAME = "mcp-oauth-sessions.json";
const locker = new Locker();

async function getStorePath(): Promise<string> {
  const userData = app.getPath("userData");
  return path.join(userData, FILE_NAME);
}

async function readStore(): Promise<Store> {
  const filePath = await getStorePath();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data) as Store;
    // Revive Date fields
    parsed.sessions = (parsed.sessions || []).map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }));
    return parsed;
  } catch (e: any) {
    if (e?.code === "ENOENT") {
      return { sessions: [] };
    }
    throw e;
  }
}

async function writeStore(store: Store): Promise<void> {
  const filePath = await getStorePath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true }).catch(() => {
    console.error(`Failed to create directory ${dir}:`, error);
    throw error;
  });
  const clean: Store = {
    sessions: store.sessions.map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    })),
  };
  await fs.writeFile(filePath, JSON.stringify(clean, null, 2), "utf-8");
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const jsonMcpOAuthRepository: McpOAuthRepository = {
  async getAuthenticatedSession(mcpServerId) {
    await locker.wait();
    const store = await readStore();
    const sessions = store.sessions
      .filter((s) => s.mcpServerId === mcpServerId && !!s.tokens)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return sessions[0] ? clone(sessions[0]) : undefined;
  },

  async getSessionByState(state) {
    if (!state) return undefined;
    await locker.wait();
    const store = await readStore();
    const session = store.sessions.find((s) => s.state === state);
    return session ? clone(session) : undefined;
  },

  async createSession(mcpServerId, data) {
    await locker.wait();
    locker.lock();
    try {
      const store = await readStore();
      const now = new Date();
      const session: McpOAuthSession = {
        id: uuidv7(),
        mcpServerId,
        serverUrl: (data.serverUrl as string) || "",
        clientInfo: data.clientInfo,
        tokens: data.tokens,
        codeVerifier: data.codeVerifier,
        state: data.state || uuidv7(),
        createdAt: now,
        updatedAt: now,
      };
      store.sessions.push(session);
      await writeStore(store);
      return clone(session);
    } finally {
      locker.unlock();
    }
  },

  async updateSessionByState(state, data) {
    await locker.wait();
    locker.lock();
    try {
      const store = await readStore();
      const idx = store.sessions.findIndex((s) => s.state === state);
      if (idx === -1) {
        throw new Error(`OAuth session with state '${state}' not found. This may indicate an expired or invalid authorization session.`);
      }
      const now = new Date();
      const updated: McpOAuthSession = {
        ...store.sessions[idx],
        ...data,
        updatedAt: now,
      } as McpOAuthSession;
      store.sessions[idx] = updated;
      await writeStore(store);
      return clone(updated);
    } finally {
      locker.unlock();
    }
  },

  async saveTokensAndCleanup(state, mcpServerId, data) {
    await locker.wait();
    locker.lock();
    try {
      const store = await readStore();
      const idx = store.sessions.findIndex((s) => s.state === state);
      if (idx === -1) {
        throw new Error(`OAuth session with state '${state}' not found. This may indicate an expired or invalid authorization session.`);
      }
      const updated: McpOAuthSession = {
        ...store.sessions[idx],
        ...data,
        updatedAt: new Date(),
      } as McpOAuthSession;
      store.sessions[idx] = updated;

      // Cleanup: remove sessions for same server without tokens and different state
      store.sessions = store.sessions.filter(
        (s) => !(s.mcpServerId === mcpServerId && !s.tokens && s.state !== state),
      );

      await writeStore(store);
      return clone(updated);
    } finally {
      locker.unlock();
    }
  },

  async deleteByState(state) {
    await locker.wait();
    locker.lock();
    try {
      const store = await readStore();
      store.sessions = store.sessions.filter((s) => s.state !== state);
      await writeStore(store);
    } finally {
      locker.unlock();
    }
  },
};
