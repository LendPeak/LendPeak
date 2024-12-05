import { Context, Next } from "koa";

export const authMiddleware = async (ctx: Context, next: Next) => {
  // Implement authentication logic
  await next();
};
