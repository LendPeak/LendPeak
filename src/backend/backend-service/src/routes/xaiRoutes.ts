import Router from "@koa/router";
import { postReason } from "../controllers/xaiController";

const router = new Router();

router.post("/reason", postReason);

export default router;
