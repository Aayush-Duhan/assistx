import { VscSparkleFilled } from "react-icons/vsc";
import { LuWandSparkles, LuMessageCirclePlus, LuRefreshCcw } from "react-icons/lu";
import { Fragment } from "react";
import { StaticInsight, type StaticInsightIcon } from "../components/staticInsight";
// import { useSubmit } from "../hooks/useSubmit";
import { action } from "../types";

type InstructionActionable = {
  displayName: string;
  modelInstructions: string;
  useWebSearch?: boolean;
  seesScreen?: boolean;
};

type ExtraAction = {
  icon: StaticInsightIcon;
  display: string;
  input: string;
  action: action;
};

const STATIC_INSIGHTS: ExtraAction[] = [
  {
    icon: VscSparkleFilled,
    display: "Assist",
    input: "",
    action: "assist",
  },
  {
    icon: LuWandSparkles,
    display: "What should I say?",
    input: "What should I say next? Output only the words I should say.",
    action: "what_next",
  },
  {
    icon: LuMessageCirclePlus,
    display: "Follow-up questions",
    input:
      "Suggest two follow-up questions that I can ask to carry forward the conversation. " +
      "Output as two bullet points.",
    action: "follow_up",
  },
  {
    icon: LuRefreshCcw,
    display: "Recap",
    input: "Recap the most recent thing that happened in the conversation.",
    action: "recap",
  },
];

export function renderInstructionActionablePrompt(action: InstructionActionable) {
  const parts = [action.displayName];
  if (action.modelInstructions.length) {
    parts.push(`Additional instructions: ${action.modelInstructions}`);
  }
  return parts.join("\n\n");
}

/**
 * Renders static actions + actionables from the user's prompt
 */
export function StaticActions() {
  // const submit = useSubmit();

  return (
    <div className="flex flex-wrap">
      {STATIC_INSIGHTS.map((insight, index) => (
        <Fragment key={insight.display}>
          <StaticInsight
            onClick={() => {
              // submit({
              //   action: insight.action,
              //   manualInput: insight.input,
              //   displayInput: insight.display,
              // });
            }}
            icon={insight.icon}
          >
            {insight.display}
          </StaticInsight>
          {index !== STATIC_INSIGHTS.length - 1 && <Divider />}
        </Fragment>
      ))}
    </div>
  );
}

function Divider() {
  return (
    <div className="min-h-full flex items-center mx-0.5">
      <div className="size-[3px] rounded-full bg-shade-10" />
    </div>
  );
}
