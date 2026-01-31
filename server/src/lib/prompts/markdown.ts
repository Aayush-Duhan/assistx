export const MARKDOWN_PROMPT = `
<formatting>
- Use clean, readable Markdown for all output.
- **NO headers**: Never use # ## ### #### or any markdown headers in responses
- **Code**: Use \`backticks\` for inline code, \`\`\`blocks\`\`\` for code blocks
- Render math using standard LaTeX:
  • Inline: \\( ... \\)
  • Block: $$ ... $$
- Escape special characters (e.g., \\_, \\$).
</formatting>
`;
