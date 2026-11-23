import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI();
const model =  "gpt-6.2-astra";

// 1. Mock signed-in user
const currentUser = { id: "USER-101" };

// 2. Mock database
const orders = [
  {
    orderId: "ORD-1024",
    userId: "USER-101",
    status: "Shipped",
  },
  {
    orderId: "ORD-1025",
    userId: "USER-101",
    status: "Processing",
  },
];

// 3. Actual function implementation
async function getOrderStatus(
  orderId,
  userId
) {
  const order = orders.find(
    (order) =>
      order.orderId === orderId &&
      order.userId === userId
  );

  if (!order) {
    return { error: "Order not found" };
  }

  return {
    orderId: order.orderId,
    status: order.status,
  };
}

// 4. Tell the AI which function is available
const tools = [
  {
    type: "function",
    name: "getOrderStatus",
    description:
      "Get the current status of an order belonging to the signed-in customer.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "Order ID, for example ORD-1024",
        },
      },
      required: ["orderId"],
      additionalProperties: false,
    },
    strict: true,
  },
];

async function main() {
  const input = [
    {
      role: "user",
      content: "What is the status of my order ORD-1024?",
    },
  ];

  // 5. Ask the AI to respond or request a function call
  let response = await client.responses.create({
    model,
    input,
    tools,
  });

  // Preserve the model's response, including its function call
  input.push(...response.output);

  console.log("input = ", input);

  // 6. Execute any function requested by the AI
  for (const item of response.output) {
    if (
      item.type === "function_call" &&
      item.name === "getOrderStatus"
    ) {
      const { orderId } = JSON.parse(item.arguments);

      const result = await getOrderStatus(
        orderId,
        currentUser.id
      );

      console.log(`Function result for ${item.name}(${orderId}) = `, result);

      // Send the function result back to the AI
      input.push({
        type: "function_call_output",
        call_id: item.call_id,
        output: JSON.stringify(result),
      });
    }
  }

  console.log("input after function call = ", input);

  // 7. Let the AI generate the final answer
  response = await client.responses.create({
    model,
    input,
    tools,
  });

  console.log(response.output_text);
}

await main().catch(console.error);