import { makeAutoObservable } from "mobx";
import { AiResponse } from "./AiResponse";
import { ContextService } from "../../services/ContextService";
import { FullContext } from "../../services/ContextService";
import { uuidv7 } from "uuidv7";

/**
 * Simple session interface for AI responses.
 * Since we no longer have backend sessions, this is always in 'created' state.
 */
interface SimpleSession {
  state: {
    state: "created";
    sessionId: string;
  };
}

export class AiConversation {
  public prevResponses: AiResponse[] = [];
  public latestResponse: AiResponse;
  public readonlyid = uuidv7();
  public readonly session: SimpleSession;

  constructor(
    private readonly contextService: ContextService,
    options: {
      fullContext: FullContext;
      screenshot: any | null;
      manualInput: string | null;
      displayInput: string | null;
      useWebSearch?: boolean;
      metadata?: Record<string, any>;
    },
  ) {
    // Create a simple local session - always in 'created' state
    this.session = {
      state: {
        state: "created",
        sessionId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    // Create the very first response in the conversation.
    this.latestResponse = this.createResponseFromContext({
      fullContext: options.fullContext,
      newContext: options.fullContext,
      screenshot: options.screenshot,
      manualInput: options.manualInput,
      displayInput: options.displayInput,
      useWebSearch: options.useWebSearch,
      metadata: options.metadata,
    });

    makeAutoObservable(this, {
      // MobX annotations for observable properties and actions
      prevResponses: true,
      latestResponse: true,
      createNewResponse: true,
      state: true,
      responses: true,
    });
  }

  public dispose(): void {
    for (const response of this.prevResponses) {
      response.dispose();
    }
    this.latestResponse.dispose();
  }

  public createNewResponse(options: {
    fullContext: FullContext;
    screenshot: any | null;
    manualInput: string | null;
    displayInput: string | null;
    useWebSearch?: boolean;
    metadata?: Record<string, any>;
  }) {
    if (this.latestResponse.state.state === "finished") {
      this.prevResponses.push(this.latestResponse);
    } else {
      this.latestResponse.dispose();
    }

    const lastContextLength =
      this.prevResponses[this.prevResponses.length - 1]?.input.contextLengthUsed ?? 0;
    const newContext = new FullContext(
      options.fullContext.audioTranscriptions.slice(lastContextLength),
    );

    this.latestResponse = this.createResponseFromContext({
      fullContext: options.fullContext,
      newContext,
      screenshot: options.screenshot,
      manualInput: options.manualInput,
      displayInput: options.displayInput,
      useWebSearch: options.useWebSearch,
      metadata: options.metadata,
    });
  }

  public get state() {
    return this.latestResponse.state;
  }

  public get responses(): AiResponse[] {
    return [...this.prevResponses, this.latestResponse];
  }

  private createResponseFromContext(options: {
    fullContext: FullContext;
    newContext: FullContext;
    screenshot: any | null;
    manualInput: string | null;
    displayInput: string | null;
    useWebSearch?: boolean;
    metadata?: Record<string, any>;
  }): AiResponse {
    let messages: any[] = [];
    const lastResponse = this.prevResponses[this.prevResponses.length - 1];

    if (lastResponse?.state.state === "finished") {
      messages.push(...lastResponse.input.messages);
      messages.push({ role: "assistant", content: lastResponse.state.text });
    }
    const contentParts: string[] = [];
    let hasAudioContext = false;
    if (options.newContext.audioContextAsText) {
      contentParts.push(options.newContext.audioContextAsText);
      hasAudioContext = true;
    }

    const content = [
      { type: "text", text: contentParts.join("\\n\\n") },
      ...(options.screenshot
        ? [
            {
              type: "image",
              image: options.screenshot.url,
            },
          ]
        : []),
    ];

    messages.push({
      role: "user",
      content,
    });

    messages = this.pruneMessages(messages, hasAudioContext);
    const systemPromptVariant = this.contextService.isTranscribing ? "audio" : "screen";

    return new AiResponse(
      {
        messages,
        fullContext: options.fullContext,
        contextLengthUsed: options.fullContext.audioTranscriptions.length,
        manualInput: options.manualInput,
        displayInput: options.displayInput,
        systemPromptVariant,
        useWebSearch: options.useWebSearch,
        metadata: options.metadata,
      },
      this.session,
    );
  }

  private pruneMessages(messages: any[], hasAudioContext: boolean): any[] {
    const newMessages = messages.map((msg) => ({ ...msg }));
    let maxAttachments = 3;

    if (!hasAudioContext && maxAttachments === 0) {
      maxAttachments = 1;
    }

    let attachmentCount = 0;

    for (const msg of [...newMessages].slice().toReversed()) {
      // Count image attachments in the parts array
      const imageParts = Array.isArray(msg.content)
        ? msg.content.filter((part: any) => part.type === "image").length
        : 0;
      attachmentCount += imageParts;
      if (attachmentCount > maxAttachments) {
        // Remove image attachments from the parts array
        if (Array.isArray(msg.content)) {
          msg.content = msg.content.filter((part: any) => part.type !== "image");
        }
      }
    }

    return newMessages;
  }
}
