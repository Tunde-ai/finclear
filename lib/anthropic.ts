import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function analyzeTransactions(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    system:
      "You are a financial advisor AI. Analyze the user's financial data and provide clear, actionable insights. Be concise and specific.",
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}
