import Router from "@koa/router";
import { mongoController } from "../controllers/mongoController";

const router = new Router();

// Define loan routes
router.get("/loan-account/:id", mongoController);

export default router;
