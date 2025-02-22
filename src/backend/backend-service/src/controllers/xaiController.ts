// src/controllers/loanController.ts
import { Context } from "koa";
import { XAIService } from "../services/xaiService";

const xaiService = new XAIService();

export const postReason = async (ctx: Context) => {
  try {
    // Suppose we pass "changes" in the request body
    const { changes } = ctx.request.body as { changes: any };

    // Call our new method
    const summary = await xaiService.summarizeLoanChanges(changes);

    ctx.body = { summary };
    ctx.status = 200;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};
