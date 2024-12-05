import Router from "@koa/router";
import { getLoans, createLoan } from "../controllers/loanController";

const router = new Router();

// Define loan routes
router.get("/", getLoans);
router.post("/", createLoan);

export default router;
