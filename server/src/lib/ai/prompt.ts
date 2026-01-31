export namespace Prompt {
  export const localize = (params: { language: string; prompt: string }) =>
    [
      params.prompt,
      "<output-language>",
      `  You must answer in the following language: ${params.language}`,
      "</output-language>",
    ].join("\n");
}
