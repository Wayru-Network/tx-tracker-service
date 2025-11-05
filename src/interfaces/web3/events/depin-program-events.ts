import * as anchor from "@coral-xyz/anchor";

/**
 * Event data structure for program instruction execution
 */
export interface InstructionEvent {
    instructionName: string;
    signature: string;
    slot: number;
    timestamp: number;
    accounts?: anchor.web3.PublicKey[];
    data?: any;
}

/**
 * Specific event types for Depin Program instructions
 */
export interface StakeEvent extends InstructionEvent {
    instructionName: 'stake';
    user?: anchor.web3.PublicKey;
    externalNftMint?: anchor.web3.PublicKey;
    stakeNftMint?: anchor.web3.PublicKey;
    amount?: anchor.BN;
    wayruFeeAmount?: anchor.BN;
}

export interface UnstakeEvent extends InstructionEvent {
    instructionName: 'unstake';
    user?: anchor.web3.PublicKey;
    externalNftMint?: anchor.web3.PublicKey;
    stakeNftMint?: anchor.web3.PublicKey;
    amount?: anchor.BN; // Amount received by user (excluding fee)
    wayruFeeAmount?: anchor.BN; // Fee paid to Wayru network
}

export interface InitStakeNftEvent extends InstructionEvent {
    instructionName: 'initStakeNft';
    user?: anchor.web3.PublicKey;
    externalNftMint?: anchor.web3.PublicKey;
    stakeNftMint?: anchor.web3.PublicKey;
    amount?: anchor.BN;
    wayruFeeAmount?: anchor.BN;
}

export interface InitializeNfnodeEvent extends InstructionEvent {
    instructionName: 'initializeNfnode';
    user?: anchor.web3.PublicKey;
    externalNftMint?: anchor.web3.PublicKey;
}

/**
 * Union type for all Depin Program events
 */
export type DepinProgramEvent = StakeEvent | UnstakeEvent | InitStakeNftEvent | InitializeNfnodeEvent;

/**
 * Callback function type for event handlers
 */
export type EventCallback<T extends InstructionEvent = DepinProgramEvent> = (event: T) => void | Promise<void>;

