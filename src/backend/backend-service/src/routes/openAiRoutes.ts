import Router from "@koa/router";
import { summarizeLoanChanges } from "../controllers/openAiController";

const router = new Router();

router.post("/summarizeLoanChanges", summarizeLoanChanges);

export default router;
