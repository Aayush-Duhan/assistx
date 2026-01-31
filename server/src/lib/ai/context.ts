export namespace Context {
  export enum MaxSize {
    User = 1_000,
    System = 4_000,
    /* avg messages per convo is 8 (~500 tokens) + 2.2k tokens for screen a 2560x1440 pixels screen shot = avg 2.7k tokens */
    Messages = 2_000,
    /* avg transcript size is 6.5k tokens and avg final meeting summary is 200 tokens **/
    Transcript = 3_000,
    /* ~13 tokens per memory title. keep only the last 100 in memory = 1.3k tokens  **/
    KnowledgeBase = 5_000,
  }

  /* AI quality starts to decrease above 8k **/
  /* latency = a * input_tokens + b * output_tokens + c **/
  /* budget for input tokens = 9k **/
  export const MAX_INPUT_SIZE =
    MaxSize.User + MaxSize.System + MaxSize.Messages + MaxSize.Transcript + MaxSize.KnowledgeBase;
}
