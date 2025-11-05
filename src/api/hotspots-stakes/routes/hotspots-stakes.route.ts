import { Route } from "@interfaces/api/routes";
import Router from "koa-router";
import { HotspotsStakesController } from "../controllers/hotspots-stakes.controller";
import { CtxStakesByWalletRequest } from "@interfaces/api/hotspots-stakes/request";

const router = new Router();

const routes: Route<Record<string, never>, { walletAddress: string }>[] = [
    {
        method: "get",
        path: "/by-wallet/:walletAddress",
        handler: async (ctx): Promise<void> => {
            await HotspotsStakesController.stakesByWallet(
                ctx as unknown as CtxStakesByWalletRequest
            );
        },
    },
];

// Register all routes automatically
routes.forEach((route) => {
    switch (route.method) {
        case 'get':
            router.get(route.path, route.handler);
            break;
        case 'post':
            router.post(route.path, route.handler);
            break;
        case 'put':
            router.put(route.path, route.handler);
            break;
        case 'delete':
            router.delete(route.path, route.handler);
            break;
        case 'patch':
            router.patch(route.path, route.handler);
            break;
    }
});
export default router;
