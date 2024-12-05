import Router from "@koa/router";
import proxyRoutes from "./proxyRoutes";
import loanRoutes from "./loanRoutes";
import mainRoutes from "./mainRoutes";

const router = new Router();

router.use("/proxy", proxyRoutes.routes(), proxyRoutes.allowedMethods());

router.use("/loans", loanRoutes.routes(), loanRoutes.allowedMethods());

router.use("/", mainRoutes.routes(), mainRoutes.allowedMethods());

export default router;
