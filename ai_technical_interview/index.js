import OpenAI from "openai";
import { z } from 'zod'
import { zodTextFormat } from "openai/helpers/zod";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const client = new OpenAI();

const rl = createInterface({ input: stdin, output: stdout });

const model = "gpt-6.2-astra";

const QuestionSchema = z.object({
  question: z.string(),
  whatItTests: z.string(),
});

const EvaluateSchema = z.object({
  score: z.number(),
  verdict: z.enum(["Excellent", "Good", "Needs Improvement"]),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  feedback: z.string(),
  idealAnswer: z.string(),
  studyNext: z.array(z.string()),
})

const CheckedEvaluation = EvaluateSchema.extend({
  score: z.number().min(0).max(10),
});



async function main(){
  try{
    console.log("\n=== AI Technical Interview ===\n");
    const inputTechnology = await rl.question(
      "Technology (React, Node.js, TypeScript, etc.) [React]: "
    );

    const technology = inputTechnology.trim() || "React";

    if(!technology){
      console.log("technology can't be empty")
    }

    const inputLevel = await rl.question(
      "Level (Beginner, Intermediate, Advanced) [Intermediate]: "
    );

    const level = inputLevel.trim() || "Intermediate";

    if(!technology.trim()){
      console.log("level can't be empty")
    }

    const instructions = `
          You are an experienced technical interviewer.
          Generate exactly one meaningful technical interview question.
          Technology: ${technology}
          Candidate level: ${level}
          Match the difficulty to the candidate's level.
          Avoid vague questions. Test understanding, not memorization.
        `;

    const input = `Prepare one ${technology} interview question for a ${level}-level candidate.`

    const questionResponse = await client.responses.parse({
      model,
      instructions,
      input,
      text: {
        format: zodTextFormat(QuestionSchema, "interview_question")
      }
    });

    const questionResult = questionResponse.output_parsed;


    if (!questionResult) {
      throw new Error("Could not generate an interview question.");
    }


    console.log("Your Question:");
    console.log(questionResult.question);
    console.log(`\nWhat it tests: ${questionResult.whatItTests}\n`);

    const answer = await rl.question("Your answer: ");

    if (!answer.trim()) {
      throw new Error("Your answer cannot be empty.");
    }


    const evaluateReponseInstructions = `
        You are a fair, experienced technical interviewer.

        Evaluate the candidate's answer for ${technology} at the
        ${level} level.

        Scoring:
        - 0: Completely incorrect or irrelevant.
        - 1-3: Major gaps in understanding.
        - 4-6: Partially correct; important gaps remain.
        - 7-8: Correct, with minor omissions.
        - 9-10: Accurate, clear, and sufficiently complete.

        Evaluate technical correctness, not writing style alone.
        Do not award points for claims that are incorrect.
        Give constructive, specific feedback.
        Suggest concrete topics the candidate should study next.
        The score must be between 0 and 10.
      `;
    
    const evaluateReponseInput = `
        Technology: ${technology}
        Level: ${level}

        Interview question:
        ${questionResult.question}

        Candidate's answer:
        ${answer}
      `;
    
    const evaluateRespone = await client.responses.parse({
      model,
      instructions: evaluateReponseInstructions,
      input: evaluateReponseInput,
      text: {
        format: zodTextFormat(EvaluateSchema, "evaluation")
      }
    }) 
    
    const rawEvaluation = evaluateRespone.output_parsed;

    if (!rawEvaluation) {
      throw new Error("Could not evaluate your answer.");
    }

    const checked = CheckedEvaluation.safeParse(rawEvaluation);

    if (!checked.success) {
      console.error("Invalid evaluation:", checked.error.issues);
      throw new Error("Evaluation failed validation.");
    }

    const evaluation = checked.data;

    console.log("========== INTERVIEW RESULTS ==========");
    console.log(`Technology: ${technology}`);
    console.log(`Level: ${level}`);
    console.log(`Score: ${evaluation.score}/10`);
    console.log(`Verdict: ${evaluation.verdict}`);

    console.log("\nStrengths:");
    evaluation.strengths.forEach((item) => console.log(`- ${item}`));

    console.log("\nAreas to improve:");
    evaluation.improvements.forEach((item) => console.log(`- ${item}`));

    console.log("\nFeedback:");
    console.log(evaluation.feedback);

    console.log("\nA stronger answer could include:");
    console.log(evaluation.idealAnswer);

    console.log("\nRecommended study topics:");
    evaluation.studyNext.forEach((item, index) => {
      console.log(`${index + 1}. ${item}`);
    });

    console.log("\n========== TOKEN USAGE ==========");
    console.log(
      "Question generation:",
      questionResponse.usage?.total_tokens ?? "N/A"
    );
    console.log(
      "Evaluation:",
      evaluateRespone.usage?.total_tokens ?? "N/A"
    );

  }finally{
      rl.close();
  }
}

await main().catch((error)=>{
  if(error instanceof OpenAI.APIError){
    console.log(`Open AI Errror: ${error.status} : ${error.message} `);
  }else{
    console.log(error);
  }
})