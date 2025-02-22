import Router from "@koa/router";
import { summarizeLoanChanges } from "../controllers/xaiController";

const router = new Router();

router.post("/summarizeLoanChanges", summarizeLoanChanges);

export default router;
