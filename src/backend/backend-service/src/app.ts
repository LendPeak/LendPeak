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

// Apply CORS middleware
app.use(
  cors({
    origin: "*", // Or specify your Angular app's origin
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-target-domain", "x-forward-headers", "Autopal-Instance-Id"],
  })
);

// Apply middleware
app.use(bodyParser());

app.use(authMiddleware);

// Register routes
app.use(router.routes()).use(router.allowedMethods());

export default app;
