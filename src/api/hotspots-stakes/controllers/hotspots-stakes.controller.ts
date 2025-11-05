import { CtxStakesByWalletRequest } from "@interfaces/api/hotspots-stakes/request";
import { getStakesByWalletAddress } from "../services/hotspots-stakes.queries";

export class HotspotsStakesController {
    static async stakesByWallet(ctx: CtxStakesByWalletRequest) {
        const walletAddress = ctx.params.walletAddress;
        const { page, pageSize } = ctx.query
        const data = await getStakesByWalletAddress({
            walletAddress,
            page: Number(page ?? 1),
            pageSize: Number(pageSize ?? 8),
        })
        ctx.body = data
        ctx.status = 200
    }
}