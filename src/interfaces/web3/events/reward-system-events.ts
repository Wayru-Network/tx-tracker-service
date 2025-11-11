import * as anchor from "@coral-xyz/anchor";

/**
 * Event data structure for Reward System program instruction execution
 */
export interface RewardSystemInstructionEvent {
    instructionName: string;
    signature: string;
    slot: number;
    timestamp: number;
    accounts?: anchor.web3.PublicKey[];
    data?: unknown;
}

/**
 * OwnerClaimRewards event
 * Fired when a user claims rewards for their hotspot
 */
export interface OwnerClaimRewardsEvent extends RewardSystemInstructionEvent {
    instructionName: 'ownerClaimRewards';
    user?: anchor.web3.PublicKey; // Index 1: user (wallet that claims)
    userAdmin?: anchor.web3.PublicKey; // Index 0: userAdmin
    nftMintAddress?: anchor.web3.PublicKey; // Index 2: nftMintAddress (hotspot NFT)
    tokenMint?: anchor.web3.PublicKey; // Index 5: tokenMint
    rewardAmount?: anchor.BN; // Amount of rewards claimed (u64)
    memo?: string; // Memo text from transaction
    memoData?: {
        hotspotId?: string;
        walletAddress?: string;
    };
}

/**
 * Union type for all Reward System events
 */
export type RewardSystemEvent = OwnerClaimRewardsEvent;

/**
 * Callback function type for event handlers
 */
export type RewardSystemEventCallback<T extends RewardSystemInstructionEvent = RewardSystemEvent> = (event: T) => void | Promise<void>;

