// src/backend/services/openAiService.ts

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import OpenAI from "openai";

interface OpenAIKeys {
  [key: string]: string;
}

let cachedOpenAIKeys: OpenAIKeys | null = null;

export class OpenAiService {
  private secretsManager: SecretsManagerClient;
  private isLocal: boolean;

  constructor() {
    this.isLocal = process.env.LOCAL === "true";
    this.secretsManager = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  private async getOpenAIKeys(): Promise<OpenAIKeys> {
    if (cachedOpenAIKeys) {
      return cachedOpenAIKeys;
    }

    if (this.isLocal) {
      // LOCAL mode → read from .env
      cachedOpenAIKeys = {
        systemKey: process.env.OPENAI_SYSTEM_KEY ?? "",
        userAKey: process.env.OPENAI_USER_A_KEY ?? "",
      };
    } else {
      // PRODUCTION → fetch from Secrets Manager
      const secretName = process.env.OPENAI_KEYS_SECRET_NAME || "lendpeak-openai-keys";
      if (!secretName) {
        throw new Error("OPENAI_KEYS_SECRET_NAME not set. Cannot fetch from Secrets Manager.");
      }

      const cmd = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.secretsManager.send(cmd);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no valid SecretString.`);
      }

      // e.g. { "systemKey": "sk-abc123", "userAKey": "sk-xyz456" }
      cachedOpenAIKeys = JSON.parse(response.SecretString);
    }

    if (!cachedOpenAIKeys) {
      throw new Error("OpenAI system key is not set.");
    }

    return cachedOpenAIKeys;
  }

  private async getApiKeyForUser(userKey?: string): Promise<string> {
    const keys = await this.getOpenAIKeys();
    if (userKey && keys[userKey]) {
      return keys[userKey];
    }
    return keys["systemKey"];
  }

  /**
   * Example method that calls a GPT-4o mini model to do some chat completion.
   * For demonstration, it returns a short summary or chat result.
   */
  public async summarizeLoanChanges(changes: Record<string, any>): Promise<string> {
    const apiKey = await this.getApiKeyForUser("systemKey");

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: process.env.OPENAI_URL || "https://api.openai.com/v1",
    });

    const prompt = `
You are given a set of loan parameters that have recently changed, including old and new values. Please generate a concise summary highlighting:
1) Each changed parameter.
2) The difference between old and new.
3) The likely financial impact on the borrower.

Changes:
${JSON.stringify(changes)}

Output a short paragraph or bullet list with a single final summary sentence.
`;

    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: "gpt-4o-mini",
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
      temperature: 0.2,
    };

    const chatCompletion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
    const summary = chatCompletion.choices[0]?.message?.content ?? "";
    return summary.trim();
  }
}
