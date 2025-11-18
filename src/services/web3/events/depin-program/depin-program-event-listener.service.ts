import * as anchor from "@coral-xyz/anchor";
import { getSolanaConnection } from "@services/web3/solana/solana-connection.service";
import { getDepinProgramId } from "@services/web3/program/depin-program/depin-program.service";
import {
    getInstructionName
} from "@constants/depin-instructions";
import {
    DepinProgramEvent,
    EventCallback,
    StakeEvent,
    UnstakeEvent,
    InitStakeNftEvent,
    InitializeNfnodeEvent,
} from "@interfaces/web3/events/depin-program-events";

/**
 * Service to listen for Depin Program events by monitoring transaction logs
 * Detects instruction execution by parsing log discriminators
 */
export class DepinProgramEventListener {
    private static instance: DepinProgramEventListener | null = null;
    private subscriptionId: number | null = null;
    private connection: anchor.web3.Connection;
    private programId!: anchor.web3.PublicKey; // Assigned in getInstance
    private isListening: boolean = false;

    // Event callbacks
    private stakeCallbacks: EventCallback<StakeEvent>[] = [];
    private unstakeCallbacks: EventCallback<UnstakeEvent>[] = [];
    private initStakeNftCallbacks: EventCallback<InitStakeNftEvent>[] = [];
    private initializeNfnodeCallbacks: EventCallback<InitializeNfnodeEvent>[] = [];
    private allEventCallbacks: EventCallback<DepinProgramEvent>[] = [];

    private constructor() {
        this.connection = getSolanaConnection('confirmed');
    }

    /**
     * Get singleton instance of the event listener
     */
    static async getInstance(): Promise<DepinProgramEventListener> {
        if (!DepinProgramEventListener.instance) {
            DepinProgramEventListener.instance = new DepinProgramEventListener();
            const programId = await getDepinProgramId();
            DepinProgramEventListener.instance.programId = new anchor.web3.PublicKey(programId);
        }
        return DepinProgramEventListener.instance;
    }

    /**
     * Start listening for program events
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    async startListening(): Promise<void> {
        if (this.isListening) {
            console.warn('⚠️ Event listener is already running');
            return;
        }

        try {
            console.log('🎧 Starting Depin Program event listener...');

            this.subscriptionId = this.connection.onLogs(
                this.programId,
                (logs, context) => {
                    void this.handleLogs(logs, context);
                },
                'confirmed'
            );

            this.isListening = true;
            console.log(`✅ Event listener started for program: ${this.programId.toString()}`);
        } catch (error) {
            console.error('❌ Failed to start event listener:', error);
            throw error;
        }
    }

    /**
     * Stop listening for program events
     */
    stopListening(): void {
        if (!this.isListening || this.subscriptionId === null) {
            console.warn('⚠️ Event listener is not running');
            return;
        }

        try {
            void this.connection.removeOnLogsListener(this.subscriptionId);
            this.subscriptionId = null;
            this.isListening = false;
            console.log('🛑 Event listener stopped');
        } catch (error) {
            console.error('❌ Error stopping event listener:', error);
            // Error is handled by logging, no need to rethrow
        }
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
                // Instructions in legacy messages are CompiledInstruction[]
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
                const instructionName = getInstructionName(discriminator);

                if (!instructionName) {
                    continue; // Unknown instruction
                }

                // Extract account keys from instruction (instruction.keys are the accounts for this specific instruction)
                const instructionAccountKeys = instruction.keys.map(key => key.pubkey);

                // Create base event
                const baseEvent = {
                    instructionName,
                    signature: logs.signature,
                    slot: context.slot,
                    timestamp: Date.now(),
                };

                // Create specific event based on instruction type
                // Use instructionAccountKeys for account indices (accounts specific to this instruction)
                // But pass full accountKeys for fee/token balance lookups (needs all transaction accounts)
                const event = await this.createEventFromInstruction(
                    instructionName,
                    baseEvent,
                    instructionAccountKeys, // Use instruction-specific accounts for indices
                    instructionData,
                    tx.meta,
                    accountKeys // Pass full account keys for balance lookups
                );

                // Emit event to all registered callbacks
                await this.emitEvent(event);
            }
        } catch (error) {
            console.error('❌ Error handling logs:', error);
        }
    }


    /**
     * Create event object from instruction data
     * @param accountKeys - Accounts specific to this instruction (for index-based extraction)
     * @param allAccountKeys - All accounts from the transaction (for balance lookups)
     */
    private async createEventFromInstruction(
        instructionName: string,
        baseEvent: { instructionName: string; signature: string; slot: number; timestamp: number },
        accountKeys: anchor.web3.PublicKey[], // Instruction-specific accounts
        instructionData: Buffer,
        txMeta?: anchor.web3.ConfirmedTransactionMeta,
        allAccountKeys?: anchor.web3.PublicKey[] // All transaction accounts (for balance lookups)
    ): Promise<DepinProgramEvent> {
        // Use allAccountKeys if provided, otherwise fall back to accountKeys
        const accountsForBalanceLookup = allAccountKeys ?? accountKeys;
        // Common fields for all events
        const commonFields = {
            ...baseEvent,
            accounts: accountKeys,
        };

        switch (instructionName) {
            case 'stake': {
                // Stake instruction: discriminator (8 bytes) + amount (8 bytes)
                // Account order (according to IDL):
                // 0: user, 1: tokenMint, 2: adminAccount, 3: nfnodeEntry, 4: depositEntry,
                // 5: externalNftMint, 6: stakeNftMint, 7: userStakeNftAccount, 8: userTokenAccount,
                // 9: tokenStorageAuthority, 10: tokenStorageAccount, 11: programAuthority,
                // 12: tokenProgram, 13: tokenProgramSpl, 14: associatedTokenProgram,
                // 15: systemProgram, 16: feeReceivingWallet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-redundant-type-constituents
                const stakeAmount: anchor.BN | undefined = instructionData.length >= 16
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    ? new anchor.BN(instructionData.slice(8, 16), 'le')
                    : undefined;
                const stakeFeeData = this.extractFeeData(
                    accountKeys,           // Instruction accounts for finding feeReceivingWallet address
                    accountsForBalanceLookup, // All accounts for balance lookup
                    txMeta,
                    'stake'
                );
                return {
                    ...commonFields,
                    instructionName: 'stake',
                    user: accountKeys[0] ?? undefined,
                    externalNftMint: accountKeys[5] ?? undefined, // Index 5 = account #6 in explorer
                    stakeNftMint: accountKeys[6] ?? undefined,    // Index 6 = account #7 in explorer - this IS the mint address
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    amount: stakeAmount,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    wayruFeeAmount: stakeFeeData.feeAmount,
                } as StakeEvent;
            }

            case 'unstake': {
                // Unstake instruction: only discriminator (8 bytes)
                // Account order (according to IDL):
                // 0: user, 1: tokenMint, 2: adminAccount, 3: nfnodeEntry, 4: depositEntry,
                // 5: externalNftMint, 6: stakeNftMint, 7: userStakeNftAccount, 8: userTokenAccount,
                // 9: tokenStorageAuthority, 10: tokenStorageAccount, 11: programAuthority,
                // 12: tokenProgram, 13: tokenProgramSpl, 14: associatedTokenProgram,
                // 15: systemProgram, 16: feeReceivingWallet
                // Amount needs to be extracted from token balance changes
                // Pass both instruction accounts (for indices) and all accounts (for balance lookup)
                const unstakeData = this.extractUnstakeData(
                    accountKeys,           // Instruction accounts for finding userTokenAccount and feeReceivingWallet
                    accountsForBalanceLookup, // All accounts for balance lookup
                    txMeta
                );
                return {
                    ...commonFields,
                    instructionName: 'unstake',
                    user: accountKeys[0] ?? undefined,
                    externalNftMint: accountKeys[5] ?? undefined, // Index 5 = account #6 in explorer
                    stakeNftMint: accountKeys[6] ?? undefined,    // Index 6 = account #7 in explorer
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    amount: unstakeData.userAmount,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    wayruFeeAmount: unstakeData.feeAmount,
                } as UnstakeEvent;
            }

            case 'initStakeNft': {
                // InitStakeNft instruction: discriminator (8 bytes) + metadata args + amount (8 bytes)
                // Account order (according to IDL and actual transaction):
                // 0: user, 1: tokenMint, 2: adminAccount, 3: nfnodeEntry, 4: depositEntry,
                // 5: externalNftMint, 6: stakeNftMint, 7: userStakeNftAccount, 8: userTokenAccount,
                // 9: tokenStorageAuthority, 10: tokenStorageAccount, 11: feeReceivingWallet,
                // 12: programAuthority, 13: tokenProgram, 14: tokenProgramSpl,
                // 15: associatedTokenProgram, 16: systemProgram
                // Note: Based on actual transaction, externalNftMint is at index 5 (account #6 in explorer)
                // Metadata args: name (4 bytes length + string), symbol (4 bytes length + string), uri (4 bytes length + string)
                // Amount is at the end (8 bytes)
                let amountOffset = 8; // Skip discriminator

                // Parse metadata args to find amount offset
                // Each string is: 4 bytes (length) + string bytes
                if (instructionData.length > amountOffset) {
                    // Try to parse strings to find where amount starts
                    let offset = amountOffset;

                    // Parse name string
                    if (offset + 4 <= instructionData.length) {
                        const nameLen = instructionData.readUInt32LE(offset);
                        offset += 4 + nameLen;
                    }

                    // Parse symbol string
                    if (offset + 4 <= instructionData.length) {
                        const symbolLen = instructionData.readUInt32LE(offset);
                        offset += 4 + symbolLen;
                    }

                    // Parse uri string
                    if (offset + 4 <= instructionData.length) {
                        const uriLen = instructionData.readUInt32LE(offset);
                        offset += 4 + uriLen;
                    }

                    // Amount should be at the end (8 bytes)
                    if (offset + 8 <= instructionData.length) {
                        amountOffset = offset;
                    } else {
                        // Fallback: amount is at the end
                        amountOffset = instructionData.length - 8;
                    }
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-redundant-type-constituents
                const initAmount: anchor.BN | undefined = instructionData.length >= amountOffset + 8
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    ? new anchor.BN(instructionData.slice(amountOffset, amountOffset + 8), 'le')
                    : undefined;
                const initFeeData = this.extractFeeData(
                    accountKeys,           // Instruction accounts for finding feeReceivingWallet address
                    accountsForBalanceLookup, // All accounts for balance lookup
                    txMeta,
                    'initStakeNft'
                );

                // For initStakeNft, detect stakeNftMint from transfers (new NFT with supply 1)
                const detectedStakeNftMint = await this.detectStakeNftMintFromTransfers(txMeta, accountsForBalanceLookup);

                // According to actual transaction analysis:
                // externalNftMint is at index 5 (account #6 in explorer)
                // stakeNftMint is at index 6 (account #7 in explorer)
                return {
                    ...commonFields,
                    instructionName: 'initStakeNft',
                    user: accountKeys[0] ?? undefined,
                    externalNftMint: accountKeys[5] ?? undefined, // Index 5 = account #6 in explorer
                    stakeNftMint: detectedStakeNftMint ?? accountKeys[6] ?? undefined, // Index 6 = account #7 in explorer, or detect from transfers
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    amount: initAmount,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    wayruFeeAmount: initFeeData.feeAmount,
                } as InitStakeNftEvent;
            }

            case 'initializeNfnode': {
                // InitializeNfnode instruction: only discriminator (8 bytes)
                return {
                    ...commonFields,
                    instructionName: 'initializeNfnode',
                    user: accountKeys[0] ?? undefined,
                    externalNftMint: accountKeys[2] ?? undefined,
                } as InitializeNfnodeEvent;
            }

            default:
                return commonFields as DepinProgramEvent;
        }
    }

    /**
     * Extract unstake data (user amount and fee) from token balance changes
     * In unstake transactions:
     * 1. NFT burn (can ignore)
     * 2. User receives deposit amount (userTokenAccount increases)
     * 3. Fee transfer to feeReceivingWallet (feeReceivingWallet increases by 10 tokens)
     * 
     * @param instructionAccountKeys - Accounts from the instruction (for finding addresses)
     * @param allAccountKeys - All accounts from transaction (for finding indices in balance arrays)
     */
    private extractUnstakeData(
        instructionAccountKeys: anchor.web3.PublicKey[],
        allAccountKeys: anchor.web3.PublicKey[],
        txMeta?: anchor.web3.ConfirmedTransactionMeta
    ): { userAmount?: anchor.BN; feeAmount?: anchor.BN } {
        if (!txMeta || !txMeta.preTokenBalances || !txMeta.postTokenBalances) {
            return {};
        }

        // According to IDL, unstake accounts:
        // 8: userTokenAccount, 16: feeReceivingWallet
        const userTokenAccount = instructionAccountKeys[8]; // Index 8 in instruction
        const feeReceivingWallet = instructionAccountKeys[16]; // Index 16 in instruction

        // Find indices in the full transaction account array
        const userTokenAccountIndex = allAccountKeys.findIndex(
            key => key && userTokenAccount && key.equals(userTokenAccount)
        );
        const feeReceivingWalletIndex = allAccountKeys.findIndex(
            key => key && feeReceivingWallet && key.equals(feeReceivingWallet)
        );

        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars
        let _userAmount: anchor.BN | undefined;
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        let feeAmount: anchor.BN | undefined;

        // Find fee amount from feeReceivingWallet balance increase
        if (feeReceivingWalletIndex !== -1) {
            const preFeeBalance = txMeta.preTokenBalances.find(
                (b) => b.accountIndex === feeReceivingWalletIndex
            );
            const postFeeBalance = txMeta.postTokenBalances.find(
                (b) => b.accountIndex === feeReceivingWalletIndex
            );

            if (preFeeBalance && postFeeBalance &&
                preFeeBalance.uiTokenAmount && postFeeBalance.uiTokenAmount) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                const preFee = new anchor.BN(preFeeBalance.uiTokenAmount.amount ?? "0");
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                const postFee = new anchor.BN(postFeeBalance.uiTokenAmount.amount ?? "0");

                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                if (postFee.gt(preFee)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    feeAmount = postFee.sub(preFee);
                }
            }
        }

        // Find user amount from userTokenAccount balance changes
        // In unstake, the user receives the full deposit amount and pays a fee separately
        // Strategy: Find the largest incoming transfer to the user account (this is the deposit)
        // The user account balance change = deposit - fee, so we need to find the deposit amount

        // First, try to find by looking at all balance increases and find the one to userTokenAccount
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        let depositAmount: anchor.BN | undefined;

        // Look through all balance changes to find transfers TO the user
        for (const preBalance of txMeta.preTokenBalances) {
            // Skip fee wallet
            if (preBalance.accountIndex < allAccountKeys.length &&
                feeReceivingWallet &&
                allAccountKeys[preBalance.accountIndex]?.equals(feeReceivingWallet)) {
                continue;
            }

            const postBalance = txMeta.postTokenBalances.find(
                (pb) => pb.accountIndex === preBalance.accountIndex
            );

            if (postBalance && preBalance.uiTokenAmount && postBalance.uiTokenAmount) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                const preAmount = new anchor.BN(preBalance.uiTokenAmount.amount ?? "0");
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                const postAmount = new anchor.BN(postBalance.uiTokenAmount.amount ?? "0");

                // If balance increased
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                if (postAmount.gt(preAmount)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    const increase = postAmount.sub(preAmount);

                    // Skip if this is the fee amount (10 tokens)
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    if (feeAmount && increase.eq(feeAmount)) {
                        continue;
                    }

                    // Check if this is the userTokenAccount receiving the deposit
                    if (userTokenAccountIndex !== -1 && preBalance.accountIndex === userTokenAccountIndex) {
                        // This is the user's account. The increase is the net change (deposit - fee)
                        // So the deposit amount = increase + fee
                        if (feeAmount) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                            depositAmount = increase.add(feeAmount);
                        } else {
                            // If fee not detected, but increase ends with 990 (like 24,990),
                            // it's likely net change with a 10 token fee, so add 10
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                            const increaseStr: string = increase.toString();
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            if (increaseStr.endsWith('9990') || increaseStr.endsWith('990')) {
                                // Likely net change with 10 token fee
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                                depositAmount = increase.add(new anchor.BN(10));
                            } else {
                                // Otherwise, use the increase as deposit
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                depositAmount = increase;
                            }
                        }
                        break; // Found the user account, use this
                    }
                }
            }
        }

        // If we didn't find by userTokenAccount index, look for the largest increase that's not the fee
        // This is the deposit amount (25,000 tokens)
        if (!depositAmount) {
            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
            let maxIncrease: anchor.BN | undefined;
            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
            let secondMaxIncrease: anchor.BN | undefined;

            for (const preBalance of txMeta.preTokenBalances) {
                // Skip fee wallet
                if (preBalance.accountIndex < allAccountKeys.length &&
                    feeReceivingWallet &&
                    allAccountKeys[preBalance.accountIndex]?.equals(feeReceivingWallet)) {
                    continue;
                }

                const postBalance = txMeta.postTokenBalances.find(
                    (pb) => pb.accountIndex === preBalance.accountIndex
                );

                if (postBalance && preBalance.uiTokenAmount && postBalance.uiTokenAmount) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                    const preAmount = new anchor.BN(preBalance.uiTokenAmount.amount ?? "0");
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                    const postAmount = new anchor.BN(postBalance.uiTokenAmount.amount ?? "0");

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    if (postAmount.gt(preAmount)) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                        const increase = postAmount.sub(preAmount);

                        // Skip if this is the fee amount (10 tokens)
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                        if (feeAmount && increase.eq(feeAmount)) {
                            continue;
                        }

                        // Track the two largest increases
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                        if (!maxIncrease || increase.gt(maxIncrease)) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            secondMaxIncrease = maxIncrease;
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            maxIncrease = increase;
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                        } else if (!secondMaxIncrease || increase.gt(secondMaxIncrease)) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            secondMaxIncrease = increase;
                        }
                    }
                }
            }

            // Determine which is the deposit amount
            // The deposit (25,000) should be much larger than the fee (10)
            // If maxIncrease is much larger than secondMaxIncrease, it's likely the deposit
            if (maxIncrease) {
                // If there's a fee and maxIncrease seems like it could be net change (24,990),
                // add the fee to get the deposit amount (25,000)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                if (feeAmount && maxIncrease.lt(feeAmount.mul(new anchor.BN(1000))) &&
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    maxIncrease.gt(feeAmount.mul(new anchor.BN(10)))) {
                    // maxIncrease is between 100 and 1000 times the fee, likely net change
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    depositAmount = maxIncrease.add(feeAmount);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                } else if (secondMaxIncrease && maxIncrease.gt(secondMaxIncrease.mul(new anchor.BN(10)))) {
                    // maxIncrease is much larger than secondMaxIncrease, it's the deposit
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    depositAmount = maxIncrease;
                } else {
                    // Default: use maxIncrease as deposit
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    depositAmount = maxIncrease;
                }
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const finalUserAmount = depositAmount;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { userAmount: finalUserAmount, feeAmount };
    }

    /**
     * Extract fee data from token balance changes
     * Fee is typically 10 tokens (10000000 with 6 decimals)
     * 
     * @param instructionAccountKeys - Accounts from the instruction (for finding feeReceivingWallet address)
     * @param allAccountKeys - All accounts from transaction (for finding index in balance arrays)
     */
    private extractFeeData(
        instructionAccountKeys: anchor.web3.PublicKey[],
        allAccountKeys: anchor.web3.PublicKey[],
        txMeta?: anchor.web3.ConfirmedTransactionMeta,
        instructionName?: string
    ): { feeAmount?: anchor.BN } {
        if (!txMeta || !txMeta.preTokenBalances || !txMeta.postTokenBalances) {
            return {};
        }

        // Determine feeReceivingWallet index in instruction accounts based on instruction type
        // According to IDL account order:
        // stake: index 16 in instruction accounts
        // unstake: index 16 in instruction accounts
        // initStakeNft: index 11 in instruction accounts
        let feeReceivingWalletInstructionIndex: number;
        if (instructionName === 'stake') {
            feeReceivingWalletInstructionIndex = 16; // According to IDL
        } else if (instructionName === 'unstake') {
            feeReceivingWalletInstructionIndex = 16; // According to IDL
        } else if (instructionName === 'initStakeNft') {
            feeReceivingWalletInstructionIndex = 11; // According to IDL
        } else {
            // Default fallback
            feeReceivingWalletInstructionIndex = 16;
        }

        if (feeReceivingWalletInstructionIndex >= instructionAccountKeys.length) {
            return {};
        }

        const feeReceivingWallet = instructionAccountKeys[feeReceivingWalletInstructionIndex];
        if (!feeReceivingWallet) {
            return {};
        }

        // Find the fee wallet by searching in balances directly (more robust than using index)
        const preFeeBalance = txMeta.preTokenBalances.find(
            (b) => b.accountIndex < allAccountKeys.length &&
                allAccountKeys[b.accountIndex]?.equals(feeReceivingWallet)
        );
        const postFeeBalance = txMeta.postTokenBalances.find(
            (b) => b.accountIndex < allAccountKeys.length &&
                allAccountKeys[b.accountIndex]?.equals(feeReceivingWallet)
        );

        if (preFeeBalance && postFeeBalance &&
            preFeeBalance.uiTokenAmount && postFeeBalance.uiTokenAmount) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const preFee = new anchor.BN(preFeeBalance.uiTokenAmount.amount ?? "0");
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const postFee = new anchor.BN(postFeeBalance.uiTokenAmount.amount ?? "0");

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            if (postFee.gt(preFee)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                return { feeAmount: postFee.sub(preFee) };
            }
        }

        // Fallback: Search for any balance increase that matches the fee amount (10 tokens)
        // This is useful if the fee wallet doesn't have a pre-balance
        if (!preFeeBalance && postFeeBalance?.uiTokenAmount) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const postFee = new anchor.BN(postFeeBalance.uiTokenAmount.amount ?? "0");
            // If post balance is exactly 10 tokens (or close), it might be the fee
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const expectedFee = new anchor.BN(10000000); // 10 tokens with 6 decimals
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            if (postFee.eq(expectedFee) || postFee.gt(new anchor.BN(0))) {
                // Could be the fee, but we need to be careful
                // Only return if it's a reasonable amount (10 tokens)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                if (postFee.eq(expectedFee)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    return { feeAmount: postFee };
                }
            }
        }

        return {};
    }

    /**
     * Detect stakeNftMint from transfers for initStakeNft
     * The stakeNftMint is the only new NFT mint created with supply 1
     * Strategy: Find token accounts that received exactly 1 token (NFT characteristic)
     */
    private async detectStakeNftMintFromTransfers(
        txMeta?: anchor.web3.ConfirmedTransactionMeta,
        _accountKeys?: anchor.web3.PublicKey[]
    ): Promise<anchor.web3.PublicKey | undefined> {
        if (!txMeta?.preTokenBalances || !txMeta.postTokenBalances) {
            return undefined;
        }

        try {
            // Strategy 1: Find token accounts that received exactly 1 token (NFT minted)
            // This is the most reliable indicator for a new NFT
            const candidateMints: anchor.web3.PublicKey[] = [];

            for (const postBalance of txMeta.postTokenBalances) {
                // Check if this account received exactly 1 token
                if (postBalance.uiTokenAmount?.amount === '1') {
                    const preBalance = txMeta.preTokenBalances.find(
                        (pb) => pb.accountIndex === postBalance.accountIndex
                    );

                    // If balance went from 0 to 1 (or didn't exist before), this is a new NFT
                    const preAmount = preBalance?.uiTokenAmount?.amount ?? '0';
                    if (preAmount === '0' && postBalance.mint) {
                        candidateMints.push(new anchor.web3.PublicKey(postBalance.mint));
                    }
                }
            }

            // If we found exactly one candidate, that's likely the stakeNftMint
            if (candidateMints.length === 1) {
                return candidateMints[0];
            }

            // Strategy 2: If multiple candidates, verify by checking mint supply
            // (This is slower but more accurate)
            for (const mint of candidateMints) {
                try {
                    const mintInfo = await this.connection.getParsedAccountInfo(mint);

                    if (mintInfo.value && 'parsed' in mintInfo.value.data) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const parsedData = mintInfo.value.data.parsed;
                        // NFT mints have supply of 1
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        if (parsedData.info.supply === '1') {
                            return mint;
                        }
                    }
                } catch (_error) {
                    // Continue checking other candidates
                    continue;
                }
            }

            // Strategy 3: If no candidates found, check if any mint account was created
            // (This would require checking account creation, which is more complex)
            // For now, return undefined and let the fallback to account index handle it

            return undefined;
        } catch (error) {
            console.warn('⚠️ Error detecting stakeNftMint from transfers:', error);
            return undefined;
        }
    }

    /**
     * Find account indices by verifying PDAs
     * This helps ensure we're using the correct account indices
     */
    private findAccountIndices(
        accountKeys: anchor.web3.PublicKey[],
        instructionName: string
    ): { externalNftMintIndex?: number; stakeNftMintIndex?: number } {
        // For now, return the expected indices based on IDL
        // In the future, we could verify PDAs to find the correct indices
        if (instructionName === 'stake' || instructionName === 'unstake') {
            return {
                externalNftMintIndex: 5,
                stakeNftMintIndex: 6,
            };
        } else if (instructionName === 'initStakeNft') {
            return {
                externalNftMintIndex: 5,
                stakeNftMintIndex: 6,
            };
        }
        return {};
    }

    /**
     * Emit event to all registered callbacks
     */
    private async emitEvent(event: DepinProgramEvent): Promise<void> {
        // Emit to specific callbacks
        switch (event.instructionName) {
            case 'stake':
                await Promise.all(this.stakeCallbacks.map(cb => Promise.resolve(cb(event))));
                break;
            case 'unstake':
                await Promise.all(this.unstakeCallbacks.map(cb => Promise.resolve(cb(event))));
                break;
            case 'initStakeNft':
                await Promise.all(this.initStakeNftCallbacks.map(cb => Promise.resolve(cb(event))));
                break;
            case 'initializeNfnode':
                await Promise.all(this.initializeNfnodeCallbacks.map(cb => Promise.resolve(cb(event))));
                break;
        }

        // Emit to all-event callbacks
        await Promise.all(this.allEventCallbacks.map(cb => Promise.resolve(cb(event))));
    }

    /**
     * Register callback for stake events
     */
    onStake(callback: EventCallback<StakeEvent>): () => void {
        this.stakeCallbacks.push(callback);
        return () => {
            this.stakeCallbacks = this.stakeCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Register callback for unstake events
     */
    onUnstake(callback: EventCallback<UnstakeEvent>): () => void {
        this.unstakeCallbacks.push(callback);
        return () => {
            this.unstakeCallbacks = this.unstakeCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Register callback for initStakeNft events
     */
    onInitStakeNft(callback: EventCallback<InitStakeNftEvent>): () => void {
        this.initStakeNftCallbacks.push(callback);
        return () => {
            this.initStakeNftCallbacks = this.initStakeNftCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Register callback for initializeNfnode events
     */
    onInitializeNfnode(callback: EventCallback<InitializeNfnodeEvent>): () => void {
        this.initializeNfnodeCallbacks.push(callback);
        return () => {
            this.initializeNfnodeCallbacks = this.initializeNfnodeCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Register callback for all events
     */
    onAllEvents(callback: EventCallback<DepinProgramEvent>): () => void {
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
     * Cleanup and reset instance
     */
    cleanup(): void {
        this.stopListening();
        this.stakeCallbacks = [];
        this.unstakeCallbacks = [];
        this.initStakeNftCallbacks = [];
        this.initializeNfnodeCallbacks = [];
        this.allEventCallbacks = [];
        DepinProgramEventListener.instance = null;
        console.log('🧹 Event listener cleaned up');
    }
}

