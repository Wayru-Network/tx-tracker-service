import Router from "koa-router";
import { ROUTES } from "@constants/router";
import hotspotsStakesRouter from "./hotspots-stakes/routes/hotspots-stakes.route";
import { authValidator } from "@middlewares/auth-validator";

const mainRouter = new Router({
    prefix: ROUTES.API, // Define the base prefix /api here
});

// Group protected routes
const protectedRoutes = new Router();
protectedRoutes.use(ROUTES.HOTSPOTS_STAKES, hotspotsStakesRouter.routes());
protectedRoutes.use(ROUTES.HOTSPOTS_STAKES, hotspotsStakesRouter.allowedMethods());

// Configure routes in mainRouter
mainRouter.use(authValidator);  // Apply authentication middleware first
mainRouter.use(protectedRoutes.routes());  // Then add protected routes

export default mainRouter;