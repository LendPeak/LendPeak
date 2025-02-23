import Router from "@koa/router";
import { summarizeLoanChanges, postLoanExplanation } from "../controllers/xaiController";

const router = new Router();

router.post("/summarizeLoanChanges", summarizeLoanChanges);
router.post("/loanExplanation", postLoanExplanation);

export default router;
