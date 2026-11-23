import OpenAI from "openai";
import "dotenv/config";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const client = new OpenAI();

const Sentiment = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
  reason: z.string(),
});

async function main() {
  const question = process.argv[2]?? "The checkout was quick and the support team was lovely.";

  const response = await client.responses.parse({
    model: "gpt-6.2-astra",
    instructions: "Classify the sentiment of customer feedback. score is your confidence from 0 to 1.",
    input: question,
    max_output_tokens: 300,
      text: { format: zodTextFormat(Sentiment, "sentiment") },
  });
  const result = response.output_parsed; // typed as { sentiment, score, reason }, or null
  if (!result) throw new Error("No structured result (the model may have refused)");
  console.log(result);

  console.log("Tokens:", response.usage?.input_tokens, "in,", response.usage?.output_tokens, "out");
}

await main().catch((error) => {
  if (error instanceof OpenAI.APIError) {
    // 401: bad key, 429: rate limit or no credit, 5xx: try again later
    console.error(`OpenAI error ${error.status}: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exit(1);
});