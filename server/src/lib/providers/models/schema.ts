import { deriveModelName } from "./namePatterns";

export function normalizeModelId(modelId: string): string {
  if (typeof modelId !== "string") return modelId;
  return modelId.replace(/(\d)-(\d)/g, "$1.$2");
}

export const MODEL_DEFAULTS = {
  kind: "llm",
  quotaFamily: "normal",
  strip: [] as string[],
  targetFormat: null as string | null
};

export function normalizeModel(raw: any): any {
  const model = typeof raw === "string" ? { id: raw } : raw;
  if (model.name !== undefined) return model;
  return { ...model, name: deriveModelName(model.id) };
}

export function modelKind(model: any): string {
  return model?.kind || model?.type || MODEL_DEFAULTS.kind;
}

export function modelQuotaFamily(model: any): string {
  return model?.quotaFamily || MODEL_DEFAULTS.quotaFamily;
}

export function modelStrip(model: any): string[] {
  return model?.strip || [];
}

export function modelTargetFormat(model: any): string | null {
  return model?.targetFormat || MODEL_DEFAULTS.targetFormat;
}
