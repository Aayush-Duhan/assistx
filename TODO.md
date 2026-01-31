# AssistX Project Roadmap & TODOs

This document outlines the development phases and specific tasks for building **AssistX**, a multi-functional AI assistant with workflows, audio processing, and agent orchestration.

## 📅 Timeline Overview
- **Phase 1: Foundation & Infrastructure** (Jan 5 – Jan 11)
- **Phase 2: Workflow Engine (n8n-style)** (Jan 12 – Jan 25)
- **Phase 3: Advanced Audio (Granola-style)** (Jan 26 – Feb 8)
- **Phase 4: Agent Ecosystem & MCP** (Feb 9 – Feb 22)
- **Phase 5: Polish & Excellence** (Feb 23 – Mar 1)

---

## 🏗️ Phase 1: Foundation & Infrastructure
**Goal:** Stabilize the core architecture and local-first data layer.
**Deadline:** Jan 11, 2026

- [ ] **Data Layer Stabilization**
  - [ ] Initialize Drizzle ORM with SQLite for all local data.
  - [ ] Create schemas for: Models, API Keys, Agents, Workflows, and Audio Sessions.
  - [ ] Implement migration handling within the Electron app.
- [ ] **Service Integration**
  - [ ] Consolidate Fastify server routes for local-only execution.
  - [ ] Ensure seamless IPC communication between Electron main, Dashboard, and Server.
- [ ] **State Management Cleanup**
  - [ ] Unify state management (standardize on Zustand or Jotai) to reduce bundle size and complexity.
- [ ] **Modes & Prompts**
  - [ ] Refactor `modesPage.tsx` to persist to SQLite instead of `localStorage`.

---

## 🔄 Phase 2: Workflow Engine (n8n-style)
**Goal:** Build a powerful, visual automation engine that can be driven by AI.
**Deadline:** Jan 25, 2026

- [ ] **Visual Editor**
  - [ ] Integrate a flow-based editor (e.g., React Flow) in `workflowsPage.tsx`.
  - [ ] Create node templates for common tasks (AI Prompt, HTTP Request, Tool Call, Conditional).
- [ ] **Execution Engine**
  - [ ] Build a robust background executor for workflows.
  - [ ] Support manual triggers vs. AI-generated triggers.
- [ ] **AI-Assisted Workflows**
  - [ ] Implement "Describe to Build" feature where AI generates the workflow graph from natural language.
- [ ] **Shared Tools**
  - [ ] Allow workflows to utilize MCP tools directly.

---

## 🎙️ Phase 3: Advanced Audio (Granola-style)
**Goal:** Capture, process, and extract value from system audio in real-time.
**Deadline:** Feb 8, 2026

- [ ] **Audio Capture Pipeline**
  - [ ] Implement high-quality system audio capture (using WASAPI on Windows).
  - [ ] Add speaker identification (Diarization) using server-side models.
- [ ] **Transcription & Processing**
  - [ ] Integrate real-time transcription via Deepgram/Groq/SambaNova.
  - [ ] Build a "Live Insights" sidebar that summarizes conversations as they happen.
- [ ] **Meeting Memory**
  - [ ] Automated action item extraction and calendar integration.
  - [ ] Searchable archive of all audio sessions with semantic search.

---

## 🤖 Phase 4: Agent Ecosystem & MCP
**Goal:** Create a multi-agent environment where tools are dynamically discovered and used.
**Deadline:** Feb 22, 2026

- [ ] **Multi-Agent Orchestration**
  - [ ] Implement agent "swarms" or hierarchical coordination.
  - [ ] Add support for agent-to-agent communication.
- [ ] **MCP Dynamic Loading**
  - [ ] Build a discovery service for local and remote MCP servers.
  - [ ] Implement a configuration UI for managing MCP server environment variables.
- [ ] **Advanced Tooling**
  - [ ] Browser-automation tool (Playwright-based) for agents.
  - [ ] Local file-system and terminal tools with safety guards.

---

## ✨ Phase 5: Polish & Excellence
**Goal:** Refine the UI/UX and ensure performance reaches a "premium" feel.
**Deadline:** Mar 1, 2026

- [ ] **Visual Excellence**
  - [ ] Implement smooth, spring-based animations for all panel transitions.
  - [ ] Refine the Dark Mode/Glassmorphism aesthetic across all "Apps".
- [ ] **Global Search (Command Center)**
  - [ ] A unified Command+K interface to search across Workflows, Transcripts, and Agents.
- [ ] **Performance Audit**
  - [ ] Optimize boot time and memory footprint (especially for audio processing).
  - [ ] Ensure offline-first capabilities for all non-essential AI tasks.

---

## 📝 Status Keys
- [ ] Not Started
- [/] In Progress
- [x] Completed
- [!] Blocked / Needs Attention
