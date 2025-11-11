import * as anchor from "@coral-xyz/anchor";
import { getSolanaConnection } from "../solana/solana-connection.service";
import { getRewardSystemProgramId } from "../program/reward-system/reward-system.service";
import {
    getRewardSystemInstructionName
} from "@constants/reward-system-instructions";
import {
    RewardSystemEvent,
    RewardSystemEventCallback,
    OwnerClaimRewardsEvent,
} from "@interfaces/web3/events/reward-system-events";

/**
 * Memo Program ID in Solana
 */
const MEMO_PROGRAM_ID = new anchor.web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * Expected memo prefix for our transactions
 */
const MEMO_PREFIX = "CLAIM:explorer-web:";

/**
 * Service to listen for Reward System Program events by monitoring transaction logs
 * Detects instruction execution by parsing log discriminators
 * Processes all ownerClaimRewards transactions (memo is optional - if present and matches format, it will be parsed)
 */
export class RewardSystemEventListener {
    private static instance: RewardSystemEventListener | null = null;
    private subscriptionId: number | null = null;
    private connection: anchor.web3.Connection;
    private programId!: anchor.web3.PublicKey; // Assigned in getInstance
    private isListening: boolean = false;

    // Event callbacks
    private ownerClaimRewardsCallbacks: RewardSystemEventCallback<OwnerClaimRewardsEvent>[] = [];
    private allEventCallbacks: RewardSystemEventCallback<RewardSystemEvent>[] = [];

    private constructor() {
        this.connection = getSolanaConnection('confirmed');
    }

    /**
     * Get singleton instance of the event listener
     */
    static async getInstance(): Promise<RewardSystemEventListener> {
        if (!RewardSystemEventListener.instance) {
            RewardSystemEventListener.instance = new RewardSystemEventListener();
            const programId = await getRewardSystemProgramId();
            RewardSystemEventListener.instance.programId = new anchor.web3.PublicKey(programId);
        }
        return RewardSystemEventListener.instance;
    }

    /**
     * Start listening for program events
     */
    startListening(): void {
        if (this.isListening) {
            console.warn('⚠️ Reward System event listener is already running');
            return;
        }

        try {
            console.log('🎧 Starting Reward System event listener...');

            this.subscriptionId = this.connection.onLogs(
                this.programId,
                (logs, context) => {
                    void this.handleLogs(logs, context);
                },
                'confirmed'
            );

            this.isListening = true;
            console.log(`✅ Reward System event listener started for program: ${this.programId.toString()}`);
        } catch (error) {
            console.error('❌ Failed to start Reward System event listener:', error);
            throw error;
        }
    }

    /**
     * Stop listening for program events
     */
    stopListening(): void {
        if (!this.isListening || this.subscriptionId === null) {
            console.warn('⚠️ Reward System event listener is not running');
            return;
        }

        try {
            void this.connection.removeOnLogsListener(this.subscriptionId);
            this.subscriptionId = null;
            this.isListening = false;
            console.log('🛑 Reward System event listener stopped');
        } catch (error) {
            console.error('❌ Error stopping Reward System event listener:', error);
        }
    }

    /**
     * Find memo instruction in transaction
     */
    private findMemoInstruction(tx: anchor.web3.TransactionResponse | anchor.web3.VersionedTransactionResponse | null): { data: Buffer; text: string } | null {
        if (!tx?.transaction) return null;

        const message = tx.transaction.message;
        let instructions: anchor.web3.TransactionInstruction[] = [];

        // Handle both legacy and versioned transactions
        if ('version' in message && message.version !== undefined) {
            // Versioned transaction (V0)
            const versionedMessage = message as unknown as anchor.web3.VersionedMessage;
            const accountKeys = versionedMessage.getAccountKeys();
            const compiledInstructions = versionedMessage.compiledInstructions;

            instructions = compiledInstructions.map(compiledIx => {
                const programKey = accountKeys.staticAccountKeys[compiledIx.programIdIndex];
                return {
                    programId: programKey,
                    keys: compiledIx.accountKeyIndexes.map(
                        (idx: number) => ({ pubkey: accountKeys.staticAccountKeys[idx], isSigner: false, isWritable: false })
                    ),
                    data: Buffer.from(compiledIx.data),
                };
            });
        } else {
            // Legacy transaction
            const legacyMessage = message as anchor.web3.Message;
            const accountKeys = legacyMessage.accountKeys.map(
                (key: anchor.web3.PublicKey | string) =>
                    typeof key === 'string' ? new anchor.web3.PublicKey(key) : key
            );
            const compiledInstructions = legacyMessage.instructions as unknown as anchor.web3.CompiledInstruction[];

            instructions = compiledInstructions.map(compiledIx => {
                const programKey = accountKeys[compiledIx.programIdIndex];
                return {
                    programId: programKey,
                    keys: compiledIx.accounts.map(
                        (idx: number) => ({
                            pubkey: accountKeys[idx],
                            isSigner: false,
                            isWritable: false
                        })
                    ),
                    data: Buffer.from(compiledIx.data),
                };
            });
        }

        // Find memo instruction
        for (const instruction of instructions) {
            if (instruction.programId.equals(MEMO_PROGRAM_ID)) {
                const memoText = instruction.data.toString('utf-8');
                return { data: instruction.data, text: memoText };
            }
        }

        return null;
    }

    /**
     * Parse memo data
     * Format: CLAIM:explorer-web:hotspot-${hotspotId}:wallet-${walletAddress}
     */
    private parseMemoData(memoText: string): { hotspotId?: string; walletAddress?: string } | null {
        if (!memoText.startsWith(MEMO_PREFIX)) {
            return null;
        }

        const parts = memoText.split(':');
        if (parts.length < 4) {
            return null;
        }

        // Format: CLAIM:explorer-web:hotspot-${hotspotId}:wallet-${walletAddress}
        const hotspotPart = parts[2]; // hotspot-${hotspotId}
        const walletPart = parts[3]; // wallet-${walletAddress}

        return {
            hotspotId: hotspotPart?.replace('hotspot-', ''),
            walletAddress: walletPart?.replace('wallet-', ''),
        };
    }

    /**
     * Handle incoming logs and parse instructions
     */
    private async handleLogs(
        logs: anchor.web3.Logs,
        context: anchor.web3.Context
    ): Promise<void> {
        try {
            // Get transaction details to parse instruction data
            const tx = await this.connection.getTransaction(logs.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });

            if (!tx?.meta || tx.meta.err) {
                return; // Transaction failed or not found
            }

            // Check for memo instruction (optional - if exists, parse it)
            const memoInstruction = this.findMemoInstruction(tx);
            let memoText: string | undefined = undefined;
            let memoData: { hotspotId?: string; walletAddress?: string } | null = null;

            if (memoInstruction) {
                memoText = memoInstruction.text;
                // Only parse if it has our expected format
                if (memoInstruction.text.startsWith(MEMO_PREFIX)) {
                    memoData = this.parseMemoData(memoInstruction.text);
                }
            }

            // Handle both legacy and versioned transactions
            let accountKeys: anchor.web3.PublicKey[] = [];
            const programInstructions: anchor.web3.TransactionInstruction[] = [];

            // Check if transaction is versioned by looking at the message structure
            const message = tx.transaction.message;

            // Check if it's a versioned message (has 'version' property)
            if ('version' in message && message.version !== undefined) {
                // Versioned transaction (V0)
                const versionedMessage = message as unknown as anchor.web3.VersionedMessage;
                const accountKeysObj = versionedMessage.getAccountKeys();
                accountKeys = accountKeysObj.staticAccountKeys;

                // Get instructions from versioned transaction
                const compiledInstructions = versionedMessage.compiledInstructions;
                for (const compiledIx of compiledInstructions) {
                    const programKeyIndex = compiledIx.programIdIndex;
                    const programKey = accountKeys[programKeyIndex];

                    if (programKey?.equals(this.programId)) {
                        // Convert compiled instruction to TransactionInstruction
                        const instruction = {
                            programId: programKey,
                            keys: compiledIx.accountKeyIndexes.map(
                                (idx: number) => ({ pubkey: accountKeys[idx], isSigner: false, isWritable: false })
                            ),
                            data: Buffer.from(compiledIx.data),
                        };
                        programInstructions.push(instruction);
                    }
                }
            } else {
                // Legacy transaction
                const legacyMessage = message as anchor.web3.Message;
                accountKeys = legacyMessage.accountKeys.map(
                    (key: anchor.web3.PublicKey | string) =>
                        typeof key === 'string' ? new anchor.web3.PublicKey(key) : key
                );

                // Process compiled instructions for our program
                const compiledInstructions = legacyMessage.instructions as unknown as anchor.web3.CompiledInstruction[];
                for (const compiledIx of compiledInstructions) {
                    const programKeyIndex = compiledIx.programIdIndex;
                    const programKey = accountKeys[programKeyIndex];

                    if (programKey?.equals(this.programId)) {
                        // Convert compiled instruction to TransactionInstruction
                        const instruction = {
                            programId: programKey,
                            keys: compiledIx.accounts.map(
                                (idx: number) => ({
                                    pubkey: accountKeys[idx],
                                    isSigner: false,
                                    isWritable: false
                                })
                            ),
                            data: Buffer.from(compiledIx.data),
                        };
                        programInstructions.push(instruction);
                    }
                }
            }

            // Process each instruction
            for (const instruction of programInstructions) {
                const instructionData = Buffer.from(instruction.data);
                const discriminator = Array.from(instructionData.slice(0, 8));
                const instructionName = getRewardSystemInstructionName(discriminator);

                if (!instructionName) {
                    continue; // Unknown instruction
                }

                // Extract account keys from instruction
                const instructionAccountKeys = instruction.keys.map(key => key.pubkey);

                // Create base event
                const baseEvent = {
                    instructionName,
                    signature: logs.signature,
                    slot: context.slot,
                    timestamp: Date.now(),
                };

                // Create specific event based on instruction type
                const event = this.createEventFromInstruction(
                    instructionName,
                    baseEvent,
                    instructionAccountKeys,
                    instructionData,
                    memoText,
                    memoData
                );

                // Emit event to all registered callbacks
                await this.emitEvent(event);
            }
        } catch (error) {
            console.error('❌ Error handling Reward System logs:', error);
        }
    }

    /**
     * Create event object from instruction data
     */
    private createEventFromInstruction(
        instructionName: string,
        baseEvent: { instructionName: string; signature: string; slot: number; timestamp: number },
        accountKeys: anchor.web3.PublicKey[],
        instructionData: Buffer,
        memoText: string | undefined,
        memoData: { hotspotId?: string; walletAddress?: string } | null
    ): RewardSystemEvent {
        const commonFields = {
            ...baseEvent,
            accounts: accountKeys,
            memo: memoText,
            memoData: memoData ?? undefined,
        };

        switch (instructionName) {
            case 'ownerClaimRewards': {
                // ownerClaimRewards instruction: discriminator (8 bytes) + rewardAmount (8 bytes)
                // Account order (according to IDL):
                // 0: userAdmin, 1: user, 2: nftMintAddress, 3: rewardEntry, 4: nfnodeEntry,
                // 5: tokenMint, 6: userTokenAccount, ...
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-redundant-type-constituents
                const rewardAmount: anchor.BN | undefined = instructionData.length >= 16
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    ? new anchor.BN(instructionData.slice(8, 16), 'le')
                    : undefined;

                return {
                    ...commonFields,
                    instructionName: 'ownerClaimRewards',
                    userAdmin: accountKeys[0] ?? undefined,
                    user: accountKeys[1] ?? undefined,
                    nftMintAddress: accountKeys[2] ?? undefined,
                    tokenMint: accountKeys[5] ?? undefined,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    rewardAmount: rewardAmount,
                } as OwnerClaimRewardsEvent;
            }

            default:
                return commonFields as RewardSystemEvent;
        }
    }

    /**
     * Emit event to all registered callbacks
     */
    private async emitEvent(event: RewardSystemEvent): Promise<void> {
        // Emit to specific callbacks
        switch (event.instructionName) {
            case 'ownerClaimRewards':
                await Promise.all(this.ownerClaimRewardsCallbacks.map(cb => Promise.resolve(cb(event))));
                break;
        }

        // Emit to all-event callbacks
        await Promise.all(this.allEventCallbacks.map(cb => Promise.resolve(cb(event))));
    }

    /**
     * Register callback for ownerClaimRewards events
     */
    onOwnerClaimRewards(callback: RewardSystemEventCallback<OwnerClaimRewardsEvent>): () => void {
        this.ownerClaimRewardsCallbacks.push(callback);
        return () => {
            this.ownerClaimRewardsCallbacks = this.ownerClaimRewardsCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Register callback for all events
     */
    onAllEvents(callback: RewardSystemEventCallback<RewardSystemEvent>): () => void {
        this.allEventCallbacks.push(callback);
        return () => {
            this.allEventCallbacks = this.allEventCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Get current listening status
     */
    getIsListening(): boolean {
        return this.isListening;
    }

    /**
     * Process a transaction by signature (public method for backfill if needed)
     */
    async processTransactionBySignature(signature: string, slot?: number): Promise<void> {
        try {
            let transactionSlot = slot;
            if (!transactionSlot) {
                const tx = await this.connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                });
                transactionSlot = tx?.slot ?? 0;
            }

            const logs: anchor.web3.Logs = {
                signature,
                err: null,
                logs: [],
            };

            const context: anchor.web3.Context = {
                slot: transactionSlot,
            };

            await this.handleLogs(logs, context);
        } catch (error) {
            console.error(`Error processing Reward System transaction ${signature}:`, error);
        }
    }

    /**
     * Cleanup and reset instance
     */
    cleanup(): void {
        this.stopListening();
        this.ownerClaimRewardsCallbacks = [];
        this.allEventCallbacks = [];
        RewardSystemEventListener.instance = null;
        console.log('🧹 Reward System event listener cleaned up');
    }
}

