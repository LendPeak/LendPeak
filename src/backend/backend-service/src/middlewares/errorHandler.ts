import { Context, Next } from "koa";
import logger from "../utils/logger";

export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (error: any) {
    ctx.status = error.status || 500;
    ctx.body = { message: error.message || "Internal Server Error" };
    logger.error(`Caught error: ${error.message}: ${error.stack}`);
  }
};
