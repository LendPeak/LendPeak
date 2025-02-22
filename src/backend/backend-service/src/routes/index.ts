import Router from "@koa/router";
import proxyRoutes from "./proxyRoutes";
import loanRoutes from "./loanRoutes";
import mainRoutes from "./mainRoutes";
import xaiRoutes from "./xaiRoutes";

const router = new Router();

router.use("/proxy", proxyRoutes.routes(), proxyRoutes.allowedMethods());

router.use("/loans", loanRoutes.routes(), loanRoutes.allowedMethods());

router.use("/xai", xaiRoutes.routes(), xaiRoutes.allowedMethods());

router.use("/", mainRoutes.routes(), mainRoutes.allowedMethods());

export default router;
