// src/app.ts
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import router from "./routes";
import { authMiddleware } from "./middlewares/authMiddleware";
import { errorHandler } from "./middlewares/errorHandler";
import cors from "koa2-cors";
import logger from "./utils/logger";

const app = new Koa();

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const responseTime = Date.now() - start;
  logger.info(`${ctx.method} ${ctx.url} - ${responseTime}ms`);
});

app.use(errorHandler);

app.use(async (ctx, next) => {
  if (ctx.method === "OPTIONS") {
    ctx.status = 204; // No Content
  } else {
    await next();
  }
});

const allowedOrigins = ["https://demo.engine.lendpeak.io", "http://localhost:4200", "*"];

app.use(
  cors({
    origin: (ctx) => {
      const requestOrigin = ctx.headers.origin;
      if (requestOrigin && allowedOrigins.includes(requestOrigin as string)) {
        return requestOrigin; // Reflect the origin if it's allowed
      }
      return "https://demo.engine.lendpeak.io"; // Default origin
    },
    credentials: true,
  })
);

// Apply middleware
app.use(bodyParser());

app.use(authMiddleware);

// Register routes
app.use(router.routes()).use(router.allowedMethods());

export default app;
