// src/services/xaiService.ts

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import OpenAI from "openai";

interface XAIKeys {
  [key: string]: string;
}

let cachedXAIKeys: XAIKeys | null = null;

export class XAIService {
  private secretsManager: SecretsManagerClient;
  private isLocal: boolean;

  constructor() {
    // If LOCAL=true, we use local .env variables; otherwise, fetch from Secrets Manager
    this.isLocal = process.env.LOCAL === "true";
    this.secretsManager = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  /**
   * Fetches XAI keys either from local environment (.env) or from AWS Secrets Manager.
   */
  private async getXAIKeys(): Promise<XAIKeys> {
    if (cachedXAIKeys) {
      return cachedXAIKeys;
    }

    if (this.isLocal) {
      // ───────── LOCAL DEV ─────────
      cachedXAIKeys = {
        systemKey: process.env.XAI_SYSTEM_KEY ?? "",
        userAKey: process.env.XAI_USER_A_KEY ?? "",
      };
    } else {
      // ───────── PRODUCTION ─────────
      const secretName = process.env.XAI_KEYS_SECRET_NAME || "lendpeak-xai-keys";
      if (!secretName) {
        throw new Error("XAI_KEYS_SECRET_NAME is not set. Cannot fetch from Secrets Manager.");
      }

      const cmd = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.secretsManager.send(cmd);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} does not have a valid SecretString.`);
      }

      cachedXAIKeys = JSON.parse(response.SecretString);
    }

    if (!cachedXAIKeys) {
      throw new Error("XAI system key is not set.");
    }

    return cachedXAIKeys;
  }

  /**
   * Get a key for a user or fallback to 'systemKey'.
   */
  private async getKeyForUser(userKey?: string): Promise<string> {
    const xaiKeys = await this.getXAIKeys();
    if (userKey && xaiKeys[userKey]) {
      return xaiKeys[userKey];
    }
    return xaiKeys.systemKey;
  }

  /**
   * Example method that calls a custom "XAI" endpoint (via OpenAI SDK) to summarize loan changes.
   *
   * @param changes   An object containing the old/new values of changed loan parameters
   * @returns         A concise summary of what's changed.
   */
  public async summarizeLoanChanges(changes: Record<string, any>): Promise<string> {
    // 1. Get your API key (system or user-specific if you prefer)
    const apiKey = await this.getKeyForUser("systemKey");

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: process.env.XAI_URL || "https://api.x.ai/v1",
    });

    // 3. Construct a concise prompt
    //    For minimal tokens, keep instructions short & direct
    const prompt = `
You are given a set of loan parameters that have recently changed, including old and new values. Please generate a concise summary highlighting:
1) Each changed parameter.
2) The difference between old and new.
3) The likely financial impact on the borrower.

Changes:
${JSON.stringify(changes)}

Output a short paragraph or bullet list with a single final summary sentence.
`;

    // 4. Make the chat completion request to the "grok-2-latest" model
    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: "You are a helpful, concise assistant that summarizes changes clearly.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.7, // a bit of creativity but still fairly factual
    };

    // 5. Return the content from the first choice
    //const summary = response.data.choices[0]?.message?.content ?? "";
    const chatCompletion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
    const summary = chatCompletion.choices[0]?.message?.content ?? "";

    return summary.trim();
  }

  /**
   * Provides a short "loan explanation" for servicing or collections agents.
   * Summarizes key info they need to help a caller or borrower.
   *
   * @param loanData An object with relevant loan parameters (balances, due amounts, interest rates, etc.)
   * @returns A concise explanation tailored to servicing/collections perspective.
   */
  public async explainLoanForServicing(loanData: Record<string, any>): Promise<string> {
    const apiKey = await this.getKeyForUser("systemKey");
    const openai = new OpenAI({
      apiKey,
      baseURL: process.env.XAI_URL || "https://api.x.ai/v1",
    });

    // Construct a prompt focusing on what a loan servicer or collections agent needs
    const prompt = `
You are a concise assistant writing a brief loan overview for a servicing specialist, collections, or customer service agent. 
They need to quickly understand what's happening with the loan in order to assist or address potential borrower issues.

Loan data:
${JSON.stringify(loanData)}

Please:
1) Summarize the loan's basic details (principal, interest rate, term, next payment).
2) Mention any past due amounts or special conditions (e.g. late fees, modifications).
3) Provide any advice on how an agent might approach assisting the borrower (e.g. potential repayment challenges, upcoming deadlines).
Keep it short, direct, and helpful. Output in a small set of bullet points or a brief paragraph.
`;

    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: "You are a concise assistant that explains loan details for servicing agents.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    };

    const chatCompletion = await openai.chat.completions.create(params);
    const explanation = chatCompletion.choices[0]?.message?.content ?? "";
    return explanation.trim();
  }
}
