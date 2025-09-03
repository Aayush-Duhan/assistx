import { useGlobalServices } from "@/services/GlobalServicesContextProvider";
import { observer } from "mobx-react-lite";
import { ScrollableContent } from "../ui/ScrollableContent";
import { WindowMessage } from "../ui/WindowMessage";
import { HeadlessButton } from "../ui/HeadlessButton";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";

const ACTION_ITEM_LIMIT = 4;

const builtInActions = {
    whatShouldISay: {
        display: '✨ What should I say next?',
        input: "Tell the user what they should say next. Answer to the question if a question is asked, or otherwise provide information to advance the conversation. Don't summarize the conversation, just give a response to the user's message.",
    },
    suggestFollowUpQuestions: {
        display: '💬 Suggest follow-up questions',
        input: 'Suggest two follow-up questions that the participant can ask to carry forward the conversation',
    },
    factCheck: {
        display: '🔍 Fact-check recent statements',
        input: "Perform an internet search to fact-check the last three claims made by the other participant in the conversation. Format the output so each claim is a bullet point, with a sub-bullet point for the true / false status, and another sub-bullet point for the source of the information. Only include claims that can be fact-checked. If there are no claims to fact-check, say 'No claims to fact-check'.",
    },
};

const followUpActions = {
    draftFollowUpEmail: {
        display: '✉️ Draft a follow-up email',
        input: "Draft a follow-up email Output the email greeting, body, and closing in a code block Use placeholders for the sender and recipient names, unless the names were explicitly mentioned in the conversation",
    },
    generateActionItems: {
        display: '✅ Generate action items',
        input: 'List all action items discussed, formatted as bullet points',
    },
    generateExecutiveSummary: {
        display: '📝 Generate executive summary',
        input: 'Generate a one-paragraph summary of the conversation, including key points and decisions made',
    },
};

function formatInstructionActionable(actionable: any): string {
    const parts = [actionable.displayName];
    if (actionable.modelInstructions.length) {
        parts.push(`Additional instructions: ${actionable.modelInstructions}`);
    }
    return parts.join('\n\n');
}

export const LiveInsightsUI = observer(({ showSummary }: { showSummary: boolean }) => {
    const { contextService } = useGlobalServices();
    const { liveInsights, audioSession } = contextService;
    const instructionActionables = audioSession?.state.state === 'created' ? audioSession.state.instructionActionables : null;
    const { actions } = liveInsights;
    const hasContent =
        (showSummary && liveInsights.summary.lines.length > 0) ||
        actions.length > 0 ||
        (instructionActionables ?? []).length > 0;

    const isPaused = contextService.isInAudioSessionAndAudioIsPaused;

    return (
        <ScrollableContent maxHeight={500} enableSnapToBottom className="space-y-4">
            {showSummary && <SummarySection />}
            {hasContent && <ActionsSection />}
            {isPaused && <FollowUpsSection />}
            {!hasContent && !isPaused && (
                <WindowMessage className="my-1 opacity-80">
                    Start speaking to see real-time insights…
                </WindowMessage>
            )}
        </ScrollableContent>
    );
})

const SummarySection = observer(() => {
    const { contextService } = useGlobalServices();
    const { summary } = contextService.liveInsights;
    return (
        <div>
            {summary.lines.map((line, index) =>
                line.type === 'heading' ? (
                    <SectionTitle key={index} className="mt-2">{line.text}</SectionTitle>
                ) : (
                    <ActionItem key={index} indent={line.indent}>{line.text}</ActionItem>
                )
            )}
        </div>
    );
});

const ActionsSection = observer(() => {
    const { aiResponsesService, contextService } = useGlobalServices();
    const { liveInsights, audioSession } = contextService;
    const { actions } = liveInsights;
    const instructionActionables = audioSession?.state.state === 'created' ? audioSession.state.instructionActionables : null;
    return (
        <div>
            <SectionTitle>Actions</SectionTitle>
            {actions.slice(-ACTION_ITEM_LIMIT).map(action => (
                <ActionItem
                    key={action.id}
                    onClick={() => {
                        aiResponsesService.triggerAi({
                            shouldCaptureScreenshot: true,
                            manualInput: action.text,
                            displayInput: action.text,
                            useWebSearch: action.useWebSearch,
                        });
                    }}
                >
                    {action.text}
                </ActionItem>
            ))}
            <ActionItem
                onClick={() => {
                    aiResponsesService.triggerAi({
                        shouldCaptureScreenshot: true,
                        manualInput: builtInActions.whatShouldISay.input,
                        displayInput: builtInActions.whatShouldISay.display,
                    });
                }}
            >
                {builtInActions.whatShouldISay.display}
            </ActionItem>
            <ActionItem
                onClick={() => {
                    aiResponsesService.triggerAi({
                        shouldCaptureScreenshot: true,
                        manualInput: builtInActions.suggestFollowUpQuestions.input,
                        displayInput: builtInActions.suggestFollowUpQuestions.display,
                    });
                }}
            >
                {builtInActions.suggestFollowUpQuestions.display}
            </ActionItem>
            <ActionItem
                onClick={() => {
                    aiResponsesService.triggerAi({
                        shouldCaptureScreenshot: true,
                        manualInput: builtInActions.factCheck.input,
                        displayInput: builtInActions.factCheck.display,
                        useWebSearch: true,
                    });
                }}
            >
                {builtInActions.factCheck.display}
            </ActionItem>
            {(instructionActionables ?? []).map((actionable, index) => (
                <ActionItem
                    key={index}
                    onClick={() =>
                        aiResponsesService.triggerAi({
                            shouldCaptureScreenshot: true,
                            displayInput: `⭐ ${actionable.displayName}`,
                            useWebSearch: false,
                            manualInput: formatInstructionActionable(actionable),
                        })
                    }
                >
                    ⭐ {actionable.displayName}
                </ActionItem>
            ))}
        </div>
    );
})

const FollowUpsSection = observer(() => {
    const { aiResponsesService } = useGlobalServices();
    return (
      <div>
        <SectionTitle>Follow-Ups</SectionTitle>
        <ActionItem
          onClick={() => {
            aiResponsesService.triggerAi({
              shouldCaptureScreenshot: true,
              manualInput: followUpActions.draftFollowUpEmail.input,
              displayInput: followUpActions.draftFollowUpEmail.display,
            });
          }}
        >
          {followUpActions.draftFollowUpEmail.display}
        </ActionItem>
        <ActionItem
          onClick={() => {
            aiResponsesService.triggerAi({
              shouldCaptureScreenshot: true,
              manualInput: followUpActions.generateActionItems.input,
              displayInput: followUpActions.generateActionItems.display,
            });
          }}
        >
          {followUpActions.generateActionItems.display}
        </ActionItem>
        <ActionItem
          onClick={() => {
            aiResponsesService.triggerAi({
              shouldCaptureScreenshot: true,
              manualInput: followUpActions.generateExecutiveSummary.input,
              displayInput: followUpActions.generateExecutiveSummary.display,
            });
          }}
        >
          {followUpActions.generateExecutiveSummary.display}
        </ActionItem>
      </div>
    );
  });

  const SectionTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <h1 className={cn("text-lg text-white/90 font-semibold mb-2", className)}>{children}</h1>
  );

  const ActionItem = ({
    indent = 0,
    className,
    onClick,
    children,
  }: {
    indent?: number;
    className?: string;
    onClick?: () => void;
    children: React.ReactNode;
  }) => (
    <HeadlessButton
      className={cn(
        "w-full text-left rounded border border-transparent hover:bg-white/10 hover:border-white/20 active:bg-white/20 transition duration-30",
        !onClick && "pointer-events-none",
        className
      )}
      onClick={onClick}
    >
      <div className="-ml-5 -my-1" style={{ paddingLeft: `${indent * 20}px` }}>
        <Markdown hideCopyButton>{`- ${children}`}</Markdown>
      </div>
    </HeadlessButton>
  );