export type PromptInputs = {
  appName: string;
  instructionText: string;
  displayLanguage: string;
  isSearch: boolean;
  hasUserQuery: boolean;
  hasScreenshot: boolean;
  instructionFileContents: string;
  peopleSearchData?: unknown;
};
