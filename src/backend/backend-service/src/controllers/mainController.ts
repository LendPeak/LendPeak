import { Context } from "koa";

export const getHello = async (ctx: Context) => {
  ctx.body = { message: `LendPeak Backend Services ${Date.now()}` };
};
