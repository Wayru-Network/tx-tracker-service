import { CtxBase } from "../routes";

export interface CtxStakesByWalletRequest extends CtxBase<{}, { walletAddress: string }> { }
