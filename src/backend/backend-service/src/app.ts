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
  await next();
  const responseTime = Date.now() - start;
  logger.info(`${ctx.method} ${ctx.url} - ${responseTime}ms`);
});

app.use(errorHandler);

app.use(
  cors({
    origin: "https://demo.engine.lendpeak.io",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "x-target-domain", "Autopal-Instance-Id", "x-forward-headers"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Apply middleware
app.use(bodyParser());

app.use(authMiddleware);

// Register routes
app.use(router.routes()).use(router.allowedMethods());

export default app;
