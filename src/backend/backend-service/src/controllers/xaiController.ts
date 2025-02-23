// src/controllers/loanController.ts
import { Context } from "koa";
import { XAIService } from "../services/xaiService";

const xaiService = new XAIService();

export const summarizeLoanChanges = async (ctx: Context) => {
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

/**
 * POST /xai/loan-explanation
 * Expects JSON body: { loanData: object, userKey?: string }
 */
export const postLoanExplanation = async (ctx: Context) => {
  try {
    const { loanData } = ctx.request.body as { loanData: any };
    if (!loanData) {
      ctx.status = 400;
      ctx.body = { error: "Missing loanData in request body." };
      return;
    }

    const explanation = await xaiService.explainLoanForServicing(loanData /* or userKey */);

    ctx.body = { explanation };
    ctx.status = 200;
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
};
