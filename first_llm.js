import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI();

async function main() {
  const question = process.argv[2]?? "Explain what an LLM is in simple terms.";
  const response = await client.responses.create({
    model: "gpt-6.2-astra",
    input: question,
    max_output_tokens: 300,
  });
  console.log(response.output_text);
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