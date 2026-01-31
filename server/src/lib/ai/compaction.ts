import { generateText } from "ai";
import { Token } from "./token";

export namespace Compaction {
  const SYSTEM_PROMPT = `
<role>
  You are a powerful api that is responsible for destiling large texts into much smaller ones.
</role>
<goal>
  Provide a detailed but very concise summary.
</goal>
<compression-rules>
  Get straight to the point and NEVER add filler, preamble, or meta-comments.
  Focus on information that would be helpful for continuing the conversation.
  Judge what is important and should be preserved.

  Some compression rules are:
  - Include future, past and present goals
  - Include future, past and present actions
</compression-rules>
`;

  export function isOverflow({ input, budget }: { input: string; budget: number }) {
    const tokens = Token.estimate(input);
    return tokens > budget;
  }

  export function tail(params: { take: number; input: string }) {
    const preserved = params.input.slice(-(params.take * 4)); // "take" in chars
    return preserved;
  }

  export async function run(params: { input: string }) {
    const { text } = await generateText({
      model: "openai/gpt-5-mini",
      system: SYSTEM_PROMPT,
      prompt: params.input,
      temperature: 0,
    });

    return text;
  }
}
