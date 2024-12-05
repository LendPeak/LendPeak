// src/app.ts
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import router from "./routes";
import { authMiddleware } from "./middlewares/authMiddleware";
import { errorHandler } from "./middlewares/errorHandler";
import cors from "@koa/cors";
import logger from "./utils/logger";

const app = new Koa();

app.use(async (ctx, next) => {
  const start = Date.now();
  logger.info(`START: ${ctx.method} ${ctx.url}`);
  try {
    await next();
  } catch (error: any) {
    logger.error(`Caught error: ${error.message}: ${error.stack}`);
  }
  const responseTime = Date.now() - start;
  logger.info(`DONE: ${ctx.method} ${ctx.url} - ${responseTime}ms`);
});

app.use(errorHandler);

app.use(
  cors({
    origin: "https://demo.engine.lendpeak.io",
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-target-domain",
      "Autopal-Instance-Id",
      "x-forward-headers",
      "LendPeak-Authorization",
      "LendPeak-Autopal-Instance-Id",
      "LendPeak-Forward-Headers",
      "LendPeak-Target-Domain",
      "lendpeak-authorization",
      "lendpeak-autopal-instance-id",
      "lendpeak-forward-headers",
      "lendpeak-target-domain",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Apply middleware
app.use(bodyParser());

app.use(authMiddleware);

// Register routes
app.use(router.routes()).use(router.allowedMethods());

export default app;
