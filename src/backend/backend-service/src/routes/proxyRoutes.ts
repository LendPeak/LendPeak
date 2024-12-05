import Router from "@koa/router";
import { proxyController } from "../controllers/proxyController";

const router = new Router();

// Define proxy routes
router.all("/:path(.*)", proxyController);

export default router;
