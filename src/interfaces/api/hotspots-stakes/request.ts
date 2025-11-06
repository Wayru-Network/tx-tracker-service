import { CtxBase } from "../routes";

export type CtxStakesByWalletRequest = CtxBase<Record<string, never>, { walletAddress: string }>;
