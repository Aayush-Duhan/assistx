/**
 * @file routes/workflows.routes.ts
 * REST API routes for workflows CRUD operations and execution
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  listWorkflows,
  getWorkflowById,
  getWorkflowWithStructure,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  saveWorkflowStructure,
} from "../db";
import { executeWorkflow } from "../lib/workflow/executor";

// Request body types
interface CreateWorkflowBody {
  name: string;
  description?: string;
  icon?: { type: "emoji"; value: string; style?: Record<string, string> };
}

interface UpdateWorkflowBody {
  name?: string;
  description?: string;
  icon?: { type: "emoji"; value: string; style?: Record<string, string> };
  isPublished?: boolean;
  isActive?: boolean;
  triggerType?: "manual" | "schedule" | "ai";
  executionContext?: {
    screenshot?: boolean;
    conversationHistory?: boolean;
    userPreferences?: boolean;
  };
}

interface SaveStructureBody {
  nodes?: Array<{
    id: string;
    workflowId: string;
    kind: string;
    name: string;
    description?: string;
    nodeConfig?: Record<string, unknown>;
    uiConfig?: Record<string, unknown>;
  }>;
  edges?: Array<{
    id: string;
    workflowId: string;
    source: string;
    target: string;
    uiConfig?: Record<string, unknown>;
  }>;
  deleteNodes?: string[];
  deleteEdges?: string[];
}

interface ExecuteWorkflowBody {
  inputData?: Record<string, unknown>;
  context?: {
    screenshot?: boolean;
    conversationHistory?: boolean;
    userPreferences?: boolean;
  };
}

interface IdParams {
  id: string;
}

export async function workflowsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/workflows - List all workflows
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const workflows = listWorkflows();
      return reply.send(workflows);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "workflows.list.error",
        "Failed to list workflows",
      );
      return reply.status(500).send({ error: "Failed to list workflows" });
    }
  });

  // GET /api/workflows/:id - Get workflow by ID (without structure)
  fastify.get<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const workflow = getWorkflowById(id);

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      return reply.send(workflow);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "workflows.get.error",
        "Failed to get workflow",
      );
      return reply.status(500).send({ error: "Failed to get workflow" });
    }
  });

  // GET /api/workflows/:id/structure - Get workflow with nodes and edges
  fastify.get<{ Params: IdParams }>("/:id/structure", async (request, reply) => {
    try {
      const { id } = request.params;
      const workflow = getWorkflowWithStructure(id);

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      return reply.send(workflow);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "workflows.getStructure.error",
        "Failed to get workflow structure",
      );
      return reply.status(500).send({ error: "Failed to get workflow structure" });
    }
  });

  // POST /api/workflows - Create a new workflow
  fastify.post<{ Body: CreateWorkflowBody }>("/", async (request, reply) => {
    try {
      const { name, description, icon } = request.body;

      if (!name) {
        return reply.status(400).send({ error: "name is required" });
      }

      const result = createWorkflow({ name, description, icon });
      return reply.status(201).send(result);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "workflows.create.error",
        "Failed to create workflow",
      );
      return reply.status(500).send({ error: "Failed to create workflow" });
    }
  });

  // PUT /api/workflows/:id - Update workflow metadata
  fastify.put<{ Params: IdParams; Body: UpdateWorkflowBody }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;

      updateWorkflow(id, data);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "workflows.update.error",
        "Failed to update workflow",
      );
      return reply.status(500).send({ error: "Failed to update workflow" });
    }
  });

  // POST /api/workflows/:id/structure - Save nodes and edges
  fastify.post<{ Params: IdParams; Body: SaveStructureBody }>(
    "/:id/structure",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { nodes, edges, deleteNodes, deleteEdges } = request.body;

        saveWorkflowStructure(id, { nodes, edges, deleteNodes, deleteEdges });
        return reply.status(204).send();
      } catch (error) {
        request.ctx?.logger.error(
          error instanceof Error ? error : new Error(String(error)),
          "workflows.saveStructure.error",
          "Failed to save workflow structure",
        );
        return reply.status(500).send({ error: "Failed to save workflow structure" });
      }
    },
  );

  // DELETE /api/workflows/:id - Delete a workflow
  fastify.delete<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      deleteWorkflow(id);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "workflows.delete.error",
        "Failed to delete workflow",
      );
      return reply.status(500).send({ error: "Failed to delete workflow" });
    }
  });

  // POST /api/workflows/:id/publish - Toggle workflow publish status
  fastify.post<{ Params: IdParams }>("/:id/publish", async (request, reply) => {
    try {
      const { id } = request.params;
      const workflow = getWorkflowById(id);

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      updateWorkflow(id, { isPublished: !workflow.isPublished });
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "workflows.publish.error",
        "Failed to toggle workflow publish status",
      );
      return reply.status(500).send({ error: "Failed to toggle publish status" });
    }
  });

  // GET /api/workflows/published - Get all published workflows (for AI tool usage)
  fastify.get("/published", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const workflows = listWorkflows().filter((w) => w.isPublished);
      return reply.send(workflows);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "workflows.published.error",
        "Failed to list published workflows",
      );
      return reply.status(500).send({ error: "Failed to list published workflows" });
    }
  });

  // POST /api/workflows/:id/execute - Execute a workflow
  fastify.post<{ Params: IdParams; Body: ExecuteWorkflowBody }>(
    "/:id/execute",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { inputData, context } = request.body;

        const workflow = getWorkflowWithStructure(id);

        if (!workflow) {
          return reply.status(404).send({ error: "Workflow not found" });
        }

        const result = await executeWorkflow(
          id,
          workflow.nodes,
          workflow.edges,
          inputData ?? {},
          context ?? {},
        );

        return reply.send(result);
      } catch (error) {
        request.ctx?.logger.error(
          error instanceof Error ? error : new Error(String(error)),
          "workflows.execute.error",
          "Failed to execute workflow",
        );
        return reply.status(500).send({ error: "Failed to execute workflow" });
      }
    },
  );
}
