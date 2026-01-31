import { makeObservable, observable, action } from "mobx";
export interface PredefinedContext {
  value: string;
  label: string;
  context: string;
}

export interface ContextItem {
  id: string;
  title: string;
  content: string;
  isPredefined: boolean;
}

export interface UserDefinedContext {
  id: string;
  title: string;
  content: string;
}

export interface PredefinedOverride {
  title?: string;
  content?: string;
}

// Predefined user contexts for different roles/domains
export const PREDEFINED_CONTEXTS: PredefinedContext[] = [
  {
    value: "school",
    label: "School",
    context:
      "You are a school and lecture assistant. Your goal is to help the user, a student, understand academic material and answer questions.\n\nWhenever a question appears on the user's screen or is asked aloud, you provide a direct, step-by-step answer, showing all necessary reasoning or calculations. If the user is watching a lecture or working through new material, you offer concise explanations of key concepts and clarify definitions as they come up.",
  },
  {
    value: "meeting",
    label: "Meeting",
    context:
      "You are a meeting assistant. Your goal is to help the user advance the conversation and perform effectively in any meeting.\n\nWhen needed, you answer questions directed at the user, whether spoken or visible on the screen, using all available context. You also refresh the user on what just happened in the meeting—summarizing recent discussion points, decisions, and action items—so the user is always up to speed.",
  },
  {
    value: "developer",
    label: "Software Developer",
    context:
      "I am a software developer who writes code, debugs applications, and builds software solutions. I work with various programming languages, frameworks, and development tools. Please provide responses that help with coding, technical problem-solving, and software engineering best practices.",
  },
  {
    value: "sales",
    label: "Sales",
    context:
      "You are a real-time AI sales assistant, and your goal is to help the user, a sales rep, close the sale.\n\nCompany Information:\n\n[information about the user's company]\n\nProduct Information:\n\n[information about the company's product and answers to common questions about the product]\n\nIf the conversation is at the very beginning or the user is working to build rapport, you suggest friendly, authentic ways for the user to build rapport with the prospect.\n\nAfter rapport is built, if the conversation is just starting, you remind the user to set the agenda clearly. You prompt the user to confirm the prospect's available time, outline the topics to be discussed, and ask if the prospect has any goals they want to address.\n\nWhen the user is in the discovery phase, you listen for the prospect's pain points and needs, and suggest personalized follow-up questions that help the user dig deeper.\n\nIf the prospect voices an objection or concern, you highlight the objection and provide the user with effective responses.\n\nSpecific objections to handle:\n\n- Price (product too expensive): Tell the user to emphasize how the value and long-term benefits justify the cost, and provide examples or ROI calculations if possible.\n- Need to think about it: Suggest questions for the user to ask if there are specific concerns to clarify and follow-ups that would help understand if there's anything that could push them over the edge.\n- Shopping around (considering competitor): Provide the user with what sets your product apart from competitors and direct comparisons given what you to show your advantages.\n\nWhenever a question is asked by the customer, you provide the user with the answer by pulling from on-screen content (if relevant) and your knowledge.\n\nYou should tell the user to try to close the sale when it is appropriate to close the sale. You must ensure every conversation steadily moves toward closing the deal.",
  },
  {
    value: "recruiting",
    label: "Recruiting",
    context:
      "You are a recruiting assistant. Your goal is to help the user interview the candidate effectively.\n\nAs the interview unfolds, you suggest personalized follow-up questions that prompt deeper insights into the candidate's skills and fit for the team based on what the candidate says.\n\nIf the candidate provides information that you know for sure is inaccurate or incorrect, you call this out to the user immediately, providing the correct information and, if helpful, suggesting a tactful way for the user to follow up or clarify with the candidate.\n\nIf the candidate explains a confusing technical project or technical concept, break it down and explain it to the user.\n\nIf the candidate mentions a technology, company, or term that may not be familiar, you provide context and definitions to the user.",
  },
  {
    value: "customer-support",
    label: "Customer Support",
    context:
      "You are a customer support assistant. Your goal is to help the user, a support agent, address the customer's issue as efficiently and thoroughly as possible.\n\nAs problems arise, you diagnose the issue by providing the user with troubleshooting steps or clarifying question to move toward a solution.\n\nIf an error or technical problem is presented, you provide step-by-step resolution instructions and reference documentation or past cases when relevant.\n\nReference Documentation:\n\n[detailed documentation about the product and common issues + solutions]",
  },
  {
    value: "consulting",
    label: "Consultant",
    context:
      "I am a consultant who helps organizations solve problems, improve processes, and implement strategies. I work with analysis, recommendations, and change management. Please provide responses that help with problem-solving, strategic thinking, and client communication.",
  },
  {
    value: "custom",
    label: "Custom Context",
    context: "",
  },
];

/**
 * Store to manage user context that will be included in AI conversations
 * to provide more personalized responses.
 */
export class UserContextStore {
  userContext: string = "";
  selectedContextId: string = "custom";
  activeContextId: string = "custom";
  userDefinedContexts: UserDefinedContext[] = [];
  predefinedOverrides: Record<string, PredefinedOverride> = {};
  favoriteContextIds: string[] = [];

  constructor() {
    makeObservable(this, {
      userContext: observable,
      selectedContextId: observable,
      activeContextId: observable,
      userDefinedContexts: observable,
      predefinedOverrides: observable,
      favoriteContextIds: observable,
      setUserContext: action,
      setSelectedContext: action,
      setActiveContext: action,
      updateSelectedContextTitle: action,
      updateSelectedContextContent: action,
      addContext: action,
      deleteSelectedContext: action,
      resetSelectedPredefined: action,
      toggleFavorite: action,
      setFavorite: action,
      removeFavorite: action,
      deleteContextById: action,
      resetPredefinedById: action,
    });

    this.loadFromStorage();
    this.updateUserContextFromActive();
  }

  /**
   * Sets the raw userContext string (used by AI service)
   */
  setUserContext = (context: string): void => {
    this.userContext = context;
    this.saveToStorage();
  };

  /**
   * Return a merged list of predefined + user-defined contexts
   */
  getAllContexts(): ContextItem[] {
    const predefined: ContextItem[] = PREDEFINED_CONTEXTS.map((ctx) => {
      const override = this.predefinedOverrides[ctx.value] || {};
      return {
        id: ctx.value,
        title: override.title ?? ctx.label,
        content: override.content ?? ctx.context,
        isPredefined: true,
      };
    });

    const userDefined: ContextItem[] = this.userDefinedContexts.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      isPredefined: false,
    }));

    return [...predefined, ...userDefined];
  }

  /**
   * Get available contexts as select options
   */
  getContextOptions(): Array<{ value: string; label: string }> {
    return this.getAllContexts().map((c) => ({ value: c.id, label: c.title }));
  }

  /**
   * Get selected context object
   */
  getSelectedContext(): ContextItem | null {
    return this.getAllContexts().find((c) => c.id === this.selectedContextId) ?? null;
  }

  /**
   * Select a context by id
   */
  setSelectedContext = (id: string): void => {
    this.selectedContextId = id;
    this.saveToStorage();
  };

  /** Wrapper for backwards compatibility */
  setSelectedContextType = (contextType: string): void => {
    this.setSelectedContext(contextType);
  };

  /** Updates the selected context's title */
  updateSelectedContextTitle = (title: string): void => {
    const selected = this.getSelectedContext();
    if (!selected) return;
    if (selected.isPredefined) {
      const prev = this.predefinedOverrides[selected.id] || {};
      this.predefinedOverrides[selected.id] = { ...prev, title };
    } else {
      const index = this.userDefinedContexts.findIndex((c) => c.id === selected.id);
      if (index >= 0) this.userDefinedContexts[index].title = title;
    }
    this.saveToStorage();
  };

  /** Updates the selected context's content */
  updateSelectedContextContent = (content: string): void => {
    const selected = this.getSelectedContext();
    if (!selected) return;
    if (selected.isPredefined) {
      const prev = this.predefinedOverrides[selected.id] || {};
      this.predefinedOverrides[selected.id] = { ...prev, content };
    } else {
      const index = this.userDefinedContexts.findIndex((c) => c.id === selected.id);
      if (index >= 0) this.userDefinedContexts[index].content = content;
    }
    if (selected.id === this.activeContextId) {
      this.userContext = content;
    }
    this.saveToStorage();
  };

  /** Create a new user-defined context and select it */
  addContext = (): string => {
    const id = `user-${Date.now()}`;
    const title = this.generateUniqueTitle("New Context");
    const newCtx: UserDefinedContext = { id, title, content: "" };
    this.userDefinedContexts.push(newCtx);
    this.selectedContextId = id;
    this.userContext = "";
    this.saveToStorage();
    return id;
  };

  /** Delete the selected context if it is user-defined */
  deleteSelectedContext = (): void => {
    const selected = this.getSelectedContext();
    if (!selected || selected.isPredefined) return;
    const index = this.userDefinedContexts.findIndex((c) => c.id === selected.id);
    if (index >= 0) this.userDefinedContexts.splice(index, 1);
    this.selectedContextId = "custom";
    if (this.activeContextId === selected.id) {
      this.activeContextId = "custom";
      this.updateUserContextFromActive();
    }
    // Remove from favorites if present
    this.favoriteContextIds = this.favoriteContextIds.filter((fid) => fid !== selected.id);
    this.saveToStorage();
  };

  /** Delete a context by id if it is user-defined */
  deleteContextById = (id: string): void => {
    const ctx = this.getAllContexts().find((c) => c.id === id);
    if (!ctx || ctx.isPredefined) return;
    const index = this.userDefinedContexts.findIndex((c) => c.id === id);
    if (index >= 0) this.userDefinedContexts.splice(index, 1);
    if (this.selectedContextId === id) {
      this.selectedContextId = "custom";
    }
    if (this.activeContextId === id) {
      this.activeContextId = "custom";
      this.updateUserContextFromActive();
    }
    this.favoriteContextIds = this.favoriteContextIds.filter((fid) => fid !== id);
    this.saveToStorage();
  };

  /** Reset overrides for selected predefined context */
  resetSelectedPredefined = (): void => {
    const selected = this.getSelectedContext();
    if (!selected || !selected.isPredefined) return;
    if (this.predefinedOverrides[selected.id]) {
      delete this.predefinedOverrides[selected.id];
      if (this.activeContextId === selected.id) {
        this.updateUserContextFromActive();
      }
      this.saveToStorage();
    }
  };

  /** Reset overrides for a predefined context by id */
  resetPredefinedById = (id: string): void => {
    const isPredefined = PREDEFINED_CONTEXTS.some((p) => p.value === id);
    if (!isPredefined) return;
    if (this.predefinedOverrides[id]) {
      delete this.predefinedOverrides[id];
      if (this.activeContextId === id) {
        this.updateUserContextFromActive();
      }
      this.saveToStorage();
    }
  };

  /** Quick checks for UI */
  isSelectedPredefined(): boolean {
    return PREDEFINED_CONTEXTS.some((p) => p.value === this.selectedContextId);
  }

  hasOverrideForSelected(): boolean {
    return !!this.predefinedOverrides[this.selectedContextId];
  }

  hasOverride(id: string): boolean {
    return !!this.predefinedOverrides[id];
  }

  /** Get the displayable user context string for AI */
  getUserContext(): string {
    return this.getActiveContext()?.content || "";
  }

  /**
   * Generate a unique title by appending an incrementing number
   */
  private generateUniqueTitle(base: string): string {
    let title = base;
    let n = 1;
    const titles = new Set(this.getAllContexts().map((c) => c.title.toLowerCase()));
    while (titles.has(title.toLowerCase())) {
      title = `${base} ${n++}`;
    }
    return title;
  }

  /**
   * Update userContext based on selected context
   */
  private updateUserContextFromActive(): void {
    const active = this.getActiveContext();
    this.userContext = active?.content || "";
  }

  /** Active context helpers */
  getActiveContext(): ContextItem | null {
    return this.getAllContexts().find((c) => c.id === this.activeContextId) ?? null;
  }

  isContextActive(id: string): boolean {
    return this.activeContextId === id;
  }

  setActiveContext = (id: string): void => {
    this.activeContextId = id;
    this.updateUserContextFromActive();
    this.saveToStorage();
  };

  /** Favorites APIs */
  isFavorite(id: string): boolean {
    return this.favoriteContextIds.includes(id);
  }

  setFavorite = (id: string): void => {
    if (!this.favoriteContextIds.includes(id)) {
      this.favoriteContextIds.push(id);
      this.saveToStorage();
    }
  };

  removeFavorite = (id: string): void => {
    const next = this.favoriteContextIds.filter((fid) => fid !== id);
    if (next.length !== this.favoriteContextIds.length) {
      this.favoriteContextIds = next;
      this.saveToStorage();
    }
  };

  toggleFavorite = (id: string): void => {
    if (this.isFavorite(id)) {
      this.removeFavorite(id);
    } else {
      this.setFavorite(id);
    }
  };

  /** Persist to localStorage */
  private saveToStorage(): void {
    try {
      const data = {
        selectedContextId: this.selectedContextId,
        activeContextId: this.activeContextId,
        userDefinedContexts: this.userDefinedContexts,
        predefinedOverrides: this.predefinedOverrides,
        userContext: this.userContext,
        favoriteContextIds: this.favoriteContextIds,
      };
      localStorage.setItem("userContextDataV2", JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save user context to localStorage:", error);
    }
  }

  /** Load from localStorage with backward compatibility */
  private loadFromStorage(): void {
    try {
      const storedV2 = localStorage.getItem("userContextDataV2");
      if (storedV2) {
        const data = JSON.parse(storedV2);
        this.selectedContextId = data.selectedContextId || "custom";
        this.activeContextId = data.activeContextId || this.selectedContextId || "custom";
        this.userDefinedContexts = Array.isArray(data.userDefinedContexts)
          ? data.userDefinedContexts
          : [];
        this.predefinedOverrides = data.predefinedOverrides || {};
        this.userContext = data.userContext || "";
        this.favoriteContextIds = Array.isArray(data.favoriteContextIds)
          ? data.favoriteContextIds
          : [];
        return;
      }

      // Legacy v1 load and migrate
      const storedV1 = localStorage.getItem("userContextData");
      if (storedV1) {
        const data = JSON.parse(storedV1);
        this.selectedContextId = data.selectedContextType || "custom";
        this.activeContextId = this.selectedContextId;
        if (typeof data.customContext === "string") {
          this.predefinedOverrides["custom"] = { content: data.customContext };
        }
        this.updateUserContextFromActive();
        this.saveToStorage();
        return;
      }

      // Very old key
      const oldContext = localStorage.getItem("userContext");
      if (oldContext !== null) {
        this.predefinedOverrides["custom"] = { content: oldContext };
        this.selectedContextId = "custom";
        this.activeContextId = "custom";
        this.userContext = oldContext;
        this.saveToStorage();
        localStorage.removeItem("userContext");
      }
    } catch (error) {
      console.warn("Failed to load user context from localStorage:", error);
    }
  }
}

// Create a singleton instance
export const userContextStore = new UserContextStore();
