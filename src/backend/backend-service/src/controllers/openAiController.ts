// src/backend/controllers/openAiController.ts

import { Context } from "koa";
import { OpenAiService } from "../services/openAiService";

const openAiService = new OpenAiService();

/**
 * POST /openai/summarizeLoanChanges
 * Expects JSON body: { prompt: string, userKey?: string }
 */
export const summarizeLoanChanges = async (ctx: Context) => {
  try {
    const { changes } = ctx.request.body as { changes: any };
    if (!changes) {
      ctx.status = 400;
      ctx.body = { error: "Missing prompt in request body." };
      return;
    }

    // If userKey is provided, we can fetch that key. Otherwise fallback to systemKey.
    const result = await openAiService.summarizeLoanChanges(changes);

    ctx.body = { result };
    ctx.status = 200;
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
};
