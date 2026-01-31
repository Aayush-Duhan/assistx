import Groq from "groq-sdk";

export namespace Tool {
  const WEB_SEARCH_SYSTEM_PROMPT = `
<role>
  You are a powerful api that is responsible searching relevant information about a subject.
</role>
<goal>
  Research the web and find relevant and up to date information about a subject
</goal>
<search-rules>
  Get straight to the point and NEVER add filler, preamble, or meta-comments.
  Focus on information that would be helpful.
  Be very brief and anwer in at max 1 paragraph.
</search-rules>
<important>
  Focus on providing adequate and contextual informations; you are not responsible for framing responses in a user-friendly way.
</important>
`;
  export async function webSearch(params: { query: string }) {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    const completion = await groq.chat.completions.create({
      model: "groq/compound",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: WEB_SEARCH_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: params.query,
        },
      ],
    });

    return completion.choices[0]?.message?.content;
  }
}
