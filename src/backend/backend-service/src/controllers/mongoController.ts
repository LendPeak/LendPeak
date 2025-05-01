import { Context } from "koa";
import { MongoClient } from "mongodb";
import logger from "../utils/logger";
import { ClsMongoRepo } from "../repositories/clsMongoRepo";

/** GET /mongo/loan/:id  – raw CLS contract */
export const mongoController = async (ctx: Context): Promise<void> => {
  /* ─────── 1 ▌ grab headers (case-insensitive) ───────────────────────────── */
  const h = (n: string) => Object.entries(ctx.headers).find(([k]) => k.toLowerCase() === n.toLowerCase())?.[1] as string | undefined;

  const uri = h("lendpeak-mongo-uri"); // required
  const user = h("lendpeak-mongo-user"); // optional
  const pwd = h("lendpeak-mongo-pass"); // optional
  const dbName = h("lendpeak-mongo-db") || "cls-archive";

  const loanId = ctx.params.id; // required

  if (!uri || !loanId) {
    ctx.status = 400;
    ctx.body = { error: "Missing lendpeak-mongo-uri header or loan id" };
    return;
  }

  /* ─────── 2 ▌ build connection string (inject creds only when present) ──── */
  let connStr = uri;
  if (user && pwd) {
    connStr = uri.replace(/^mongodb(\+srv)?:\/\//, (m) => `${m}${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@`);
  }

  /* ─────── 3 ▌ connect, fetch, close ─────────────────────────────────────── */
  let client: MongoClient | null = null;

  try {
    logger.info(`Mongo: connecting to ${uri}`);
    client = await MongoClient.connect(connStr, { maxPoolSize: 3 });

    const repo = new ClsMongoRepo(client, dbName);
    const raw = await repo.loadContract(loanId);

    ctx.status = 200;
    ctx.body = raw; // ← UI gets {loan, schedule, lpts, history}
  } catch (err: any) {
    logger.error(`Mongo route error: ${err.message}`);
    ctx.status = 500;
    ctx.body = { error: err.message };
  } finally {
    if (client) await client.close().catch(() => void 0);
  }
};
