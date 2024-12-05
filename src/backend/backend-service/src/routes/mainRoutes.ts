import Router from "@koa/router";
import { getHello } from "../controllers/mainController";

const router = new Router();

// Define loan routes
router.get("/", getHello);

export default router;
