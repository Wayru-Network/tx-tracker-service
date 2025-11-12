import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getSolanaConnection } from "../solana/solana-connection.service";
import { updateStakerWalletByStakeNftMint, batchCheckStakeExistsByNftMints } from "@api/hotspots-stakes/services/hotspots-stakes.queries";

/**
 * Token 2022 Program ID
 */
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

/**
 * Configuration for batch processing
 */
interface BatchConfig {
    /** Threshold in transactions per second to trigger batch mode */
    tpsThreshold: number;
    /** Maximum batch size */
    maxBatchSize: number;
    /** Interval in ms to process batches */
    batchInterval: number;
    /** Window size in ms to calculate TPS */
    tpsWindowSize: number;
}

/**
 * Pending transaction to process
 */
interface PendingTransaction {
    signature: string;
    slot: number;
    timestamp: number;
}

/**
 * Service to listen for Token 2022 NFT transfers
 * Monitors transfers of NFTs that exist in our database (hotspot_stake table)
 * Implements adaptive batch processing based on transaction rate
 */
export class Token2022TransferListener {
    private static instance: Token2022TransferListener | null = null;
    private subscriptionId: number | null = null;
    private connection: anchor.web3.Connection;
    private isListening: boolean = false;

    // Event callbacks
    private transferCallbacks: Array<(event: TokenTransferEvent) => void | Promise<void>> = [];

    // Batch processing system
    private transactionQueue: PendingTransaction[] = [];
    private batchProcessingInterval: NodeJS.Timeout | null = null;
    private transactionTimestamps: number[] = []; // For TPS calculation
    private batchConfig: BatchConfig = {
        tpsThreshold: 10, // Switch to batch mode if > 10 TPS
        maxBatchSize: 50, // Process max 50 transactions per batch
        batchInterval: 1000, // Process batch every 1 second
        tpsWindowSize: 5000, // Calculate TPS over last 5 seconds
    };
    private isProcessingBatch = false;

    private constructor() {
        this.connection = getSolanaConnection('confirmed');
    }

    /**
     * Get singleton instance of the transfer listener
     */
    static getInstance(): Promise<Token2022TransferListener> {
        if (Token2022TransferListener.instance) {
            return Promise.resolve(Token2022TransferListener.instance);
        }
        Token2022TransferListener.instance = new Token2022TransferListener();
        return Promise.resolve(Token2022TransferListener.instance);
    }


    /**
     * Start listening for Token 2022 transfers
     */
    startListening(): void {
        if (this.isListening) {
            console.warn('⚠️ Token 2022 transfer listener is already running');
            return;
        }

        try {
            console.log('🎧 Starting Token 2022 transfer listener...');
            console.log('📋 Will track NFTs that exist in the database (hotspot_stake table)');
            console.log(`⚙️  Batch processing: Threshold=${this.batchConfig.tpsThreshold} TPS, Max batch=${this.batchConfig.maxBatchSize}, Interval=${this.batchConfig.batchInterval}ms`);

            // Subscribe to all Token 2022 program logs
            this.subscriptionId = this.connection.onLogs(
                TOKEN_2022_PROGRAM_ID,
                (logs, context) => {
                    void this.handleLogs(logs, context);
                },
                'confirmed'
            );

            // Start batch processing interval
            this.startBatchProcessor();

            this.isListening = true;
            console.log(`✅ Token 2022 transfer listener started`);
        } catch (error) {
            console.error('❌ Failed to start Token 2022 transfer listener:', error);
            throw error;
        }
    }

    /**
     * Start the batch processor interval
     */
    private startBatchProcessor(): void {
        if (this.batchProcessingInterval) {
            return; // Already running
        }

        this.batchProcessingInterval = setInterval(() => {
            void this.processBatch();
        }, this.batchConfig.batchInterval);
    }

    /**
     * Stop the batch processor interval
     */
    private stopBatchProcessor(): void {
        if (this.batchProcessingInterval) {
            clearInterval(this.batchProcessingInterval);
            this.batchProcessingInterval = null;
        }
    }

    /**
     * Calculate current transactions per second
     */
    private getCurrentTPS(): number {
        const now = Date.now();
        const windowStart = now - this.batchConfig.tpsWindowSize;

        // Remove old timestamps outside the window
        this.transactionTimestamps = this.transactionTimestamps.filter(
            (ts) => ts > windowStart
        );

        // Calculate TPS
        if (this.transactionTimestamps.length === 0) {
            return 0;
        }

        const timeSpan = (now - this.transactionTimestamps[0]) / 1000; // seconds
        return timeSpan > 0 ? this.transactionTimestamps.length / timeSpan : 0;
    }

    /**
     * Process pending transactions in batch
     */
    private async processBatch(): Promise<void> {
        if (this.isProcessingBatch || this.transactionQueue.length === 0) {
            return;
        }

        this.isProcessingBatch = true;
        const currentTPS = this.getCurrentTPS();
        const shouldUseBatch = currentTPS >= this.batchConfig.tpsThreshold;

        try {
            if (shouldUseBatch && this.transactionQueue.length > 1) {
                // Batch mode: process multiple transactions together
                const batchSize = Math.min(
                    this.batchConfig.maxBatchSize,
                    this.transactionQueue.length
                );
                const batch = this.transactionQueue.splice(0, batchSize);

                console.log(`📦 Processing batch of ${batch.length} transactions (TPS: ${currentTPS.toFixed(2)})`);

                // Process batch in parallel (with concurrency limit)
                const concurrencyLimit = 10;
                for (let i = 0; i < batch.length; i += concurrencyLimit) {
                    const chunk = batch.slice(i, i + concurrencyLimit);
                    await Promise.all(
                        chunk.map((tx) => this.processTransaction(tx.signature, tx.slot))
                    );
                }

                console.log(`✅ Batch processed: ${batch.length} transactions`);
            } else {
                // Individual mode: process one transaction at a time
                const tx = this.transactionQueue.shift();
                if (tx) {
                    await this.processTransaction(tx.signature, tx.slot);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error processing batch:`, errorMessage);
        } finally {
            this.isProcessingBatch = false;
        }
    }

    /**
     * Process a single transaction (extracted from handleLogs for reuse)
     */
    private async processTransaction(signature: string, slot: number): Promise<void> {
        try {
            // Get transaction details
            const tx = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });

            if (!tx || tx.meta?.err || !tx.meta) {
                return; // Skip failed or invalid transactions silently
            }

            // Check for token transfers in the transaction
            await this.processTokenTransfers(tx, signature, slot);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error processing transaction ${signature}:`, errorMessage);
        }
    }

    /**
     * Stop listening for transfers
     */
    stopListening(): void {
        if (!this.isListening || this.subscriptionId === null) {
            console.warn('⚠️ Token 2022 transfer listener is not running');
            return;
        }

        try {
            void this.connection.removeOnLogsListener(this.subscriptionId);
            this.subscriptionId = null;
            this.isListening = false;

            // Stop batch processor
            this.stopBatchProcessor();

            // Process remaining queue items before stopping
            if (this.transactionQueue.length > 0) {
                console.log(`📦 Processing ${this.transactionQueue.length} remaining transactions before stopping...`);
                void this.processBatch();
            }

            console.log('🛑 Token 2022 transfer listener stopped');
        } catch (error) {
            console.error('❌ Error stopping Token 2022 transfer listener:', error);
        }
    }

    /**
     * Handle incoming logs and detect transfers
     * Adds transactions to queue for adaptive batch processing
     */
    private handleLogs(
        logs: anchor.web3.Logs,
        context: anchor.web3.Context
    ): void {
        // Record transaction timestamp for TPS calculation
        const now = Date.now();
        this.transactionTimestamps.push(now);

        // Add to queue
        this.transactionQueue.push({
            signature: logs.signature,
            slot: context.slot,
            timestamp: now,
        });

        // If queue is getting too large, log warning
        if (this.transactionQueue.length > 100) {
            const currentTPS = this.getCurrentTPS();
            console.warn(
                `⚠️ Transaction queue is large: ${this.transactionQueue.length} pending (TPS: ${currentTPS.toFixed(2)})`
            );
        }

        // If TPS is low, process immediately (low latency mode)
        const currentTPS = this.getCurrentTPS();
        if (currentTPS < this.batchConfig.tpsThreshold && !this.isProcessingBatch) {
            // Process immediately for low latency
            const tx = this.transactionQueue.shift();
            if (tx) {
                void this.processTransaction(tx.signature, tx.slot);
            }
        }
        // Otherwise, let the batch processor handle it
    }

    /**
     * Process token transfers in a transaction
     */
    private async processTokenTransfers(
        tx: anchor.web3.TransactionResponse | anchor.web3.VersionedTransactionResponse | null,
        signature: string,
        slot: number
    ): Promise<void> {
        if (!tx?.meta) {
            return;
        }

        // Extract account keys from transaction (needed for all balance processing)
        const message = tx.transaction.message;
        let accountKeys: PublicKey[] = [];

        try {
            if ('version' in message && message.version !== undefined) {
                const versionedMessage = message as unknown as anchor.web3.VersionedMessage;
                try {
                    const accountKeysObj = versionedMessage.getAccountKeys();
                    accountKeys = accountKeysObj.staticAccountKeys;
                } catch {
                    if (tx.meta?.loadedAddresses) {
                        const staticKeys = versionedMessage.staticAccountKeys || [];
                        const writableLoaded = tx.meta.loadedAddresses.writable || [];
                        const readonlyLoaded = tx.meta.loadedAddresses.readonly || [];
                        accountKeys = [...staticKeys, ...writableLoaded, ...readonlyLoaded];
                    } else {
                        console.warn(`⚠️ Cannot resolve address table lookups for transaction ${signature}`);
                        return;
                    }
                }
            } else {
                const legacyMessage = message as anchor.web3.Message;
                accountKeys = legacyMessage.accountKeys.map(
                    (key: PublicKey | string) =>
                        typeof key === 'string' ? new PublicKey(key) : key
                );
            }
        } catch (error) {
            console.warn(`⚠️ Error extracting account keys for transaction ${signature}:`, error);
            return;
        }

        // Track transfers by mint
        const transfersByMint = new Map<string, {
            mint: PublicKey;
            from: PublicKey | null;
            to: PublicKey | null;
            amount: string;
        }>();

        // Process all token balances (both pre and post) to detect transfers
        const allBalances = new Map<number, {
            pre?: anchor.web3.TokenBalance;
            post?: anchor.web3.TokenBalance;
        }>();

        // Add pre balances
        if (tx.meta.preTokenBalances) {
            for (const preBalance of tx.meta.preTokenBalances) {
                if (!allBalances.has(preBalance.accountIndex)) {
                    allBalances.set(preBalance.accountIndex, {});
                }
                const balance = allBalances.get(preBalance.accountIndex);
                if (balance) {
                    balance.pre = preBalance;
                }
            }
        }

        // Add post balances
        if (tx.meta.postTokenBalances) {
            for (const postBalance of tx.meta.postTokenBalances) {
                if (!allBalances.has(postBalance.accountIndex)) {
                    allBalances.set(postBalance.accountIndex, {});
                }
                const balance = allBalances.get(postBalance.accountIndex);
                if (balance) {
                    balance.post = postBalance;
                }
            }
        }

        // First pass: collect all NFT mints from this transaction
        const nftMints: string[] = [];

        for (const [, balances] of allBalances) {
            const preBalance = balances.pre;
            const postBalance = balances.post;

            // Get the mint address (from pre or post balance)
            const mintAddressStr = preBalance?.mint ?? postBalance?.mint;
            if (!mintAddressStr) {
                continue;
            }

            const preAmount = preBalance?.uiTokenAmount?.amount ?? '0';
            const postAmount = postBalance?.uiTokenAmount?.amount ?? '0';

            // Check if this is an NFT (amount is 1 or 0)
            if (preAmount !== '1' && preAmount !== '0' && preAmount !== '') {
                continue; // Not an NFT
            }
            if (postAmount !== '1' && postAmount !== '0' && postAmount !== '') {
                continue; // Not an NFT
            }

            // Collect NFT mint for batch check (avoid duplicates)
            if (!nftMints.includes(mintAddressStr)) {
                nftMints.push(mintAddressStr);
            }
        }

        // Batch check all NFTs in one DB query (much more efficient!)
        let existingMints: Map<string, boolean> = new Map();
        if (nftMints.length > 0) {
            try {
                existingMints = await batchCheckStakeExistsByNftMints(nftMints);
            } catch (_error) {
                // If batch check fails, skip all NFTs in this transaction
                return;
            }
        }

        // Second pass: process only NFTs that exist in our database
        for (const [accountIndex, balances] of allBalances) {
            const preBalance = balances.pre;
            const postBalance = balances.post;

            // Get the mint address
            const mintAddressStr = preBalance?.mint ?? postBalance?.mint;
            if (!mintAddressStr) {
                continue;
            }

            const mintAddress = new PublicKey(mintAddressStr);
            const preAmount = preBalance?.uiTokenAmount?.amount ?? '0';
            const postAmount = postBalance?.uiTokenAmount?.amount ?? '0';

            // Check if this is an NFT
            if (preAmount !== '1' && preAmount !== '0' && preAmount !== '') {
                continue;
            }
            if (postAmount !== '1' && postAmount !== '0' && postAmount !== '') {
                continue;
            }

            // Check if this NFT exists in our database (from batch check)
            const stakeExists = existingMints.get(mintAddressStr) ?? false;
            if (!stakeExists) {
                continue; // NFT not in our database - skip silently
            }

            // Get account owner from transaction accounts
            let accountOwner: PublicKey | null = null;
            if (accountIndex < accountKeys.length && accountKeys[accountIndex]) {
                accountOwner = accountKeys[accountIndex];
            }

            if (!accountOwner) {
                continue; // Can't determine account owner
            }

            // Track the transfer
            if (!transfersByMint.has(mintAddress.toString())) {
                transfersByMint.set(mintAddress.toString(), {
                    mint: mintAddress,
                    from: null,
                    to: null,
                    amount: postAmount,
                });
            }

            const transfer = transfersByMint.get(mintAddress.toString());
            if (!transfer) {
                continue;
            }

            // Determine if this is a transfer out (from) or in (to)
            if (preAmount === '1' && postAmount === '0') {
                // NFT was transferred out
                transfer.from = accountOwner;
            } else if ((preAmount === '0' || preAmount === '') && postAmount === '1') {
                // NFT was transferred in (new account created or existing account received)
                transfer.to = accountOwner;
            }
        }

        // Process each transfer (mint authority already verified above)
        for (const [, transfer] of transfersByMint) {
            if (!transfer.from || !transfer.to) {
                continue; // Incomplete transfer info
            }

            // TypeScript guard: ensure transfer.to is not null
            const newStakerWallet = transfer.to;
            if (!newStakerWallet) {
                continue;
            }

            // This is a transfer of one of our stake NFTs!
            // Only log once when we have the complete transfer (from and to)
            console.log('🔄 NFT Transfer detected:', {
                signature,
                mint: transfer.mint.toString(),
                from: transfer.from.toString(),
                to: newStakerWallet.toString(),
                slot,
            });

            // Update the staker wallet in the database
            try {
                const updateResult = await updateStakerWalletByStakeNftMint({
                    stakeNftMint: transfer.mint.toString(),
                    newStakerWallet: newStakerWallet.toString(),
                });

                if (updateResult && !updateResult.success) {
                    console.warn('⚠️ Failed to update staker wallet:', updateResult.message);
                } else {
                    console.log('✅ Updated staker wallet for NFT:', transfer.mint.toString());
                }

                // Emit event to callbacks
                const event: TokenTransferEvent = {
                    signature,
                    mint: transfer.mint.toString(),
                    from: transfer.from.toString(),
                    to: transfer.to.toString(),
                    slot,
                    timestamp: Date.now(),
                };

                await this.emitEvent(event);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('❌ Error updating staker wallet:', errorMessage);
            }
        }
    }

    /**
     * Emit event to all registered callbacks
     */
    private async emitEvent(event: TokenTransferEvent): Promise<void> {
        await Promise.all(
            this.transferCallbacks.map((cb) => Promise.resolve(cb(event)))
        );
    }

    /**
     * Register callback for transfer events
     */
    onTransfer(callback: (event: TokenTransferEvent) => void | Promise<void>): () => void {
        this.transferCallbacks.push(callback);
        return () => {
            this.transferCallbacks = this.transferCallbacks.filter((cb) => cb !== callback);
        };
    }

    /**
     * Get current listening status
     */
    getIsListening(): boolean {
        return this.isListening;
    }


    /**
     * Process a transaction by signature (useful for testing or backfill)
     */
    async processTransactionBySignature(signature: string): Promise<void> {
        try {
            const tx = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });

            if (!tx) {
                console.warn(`⚠️ Transaction not found: ${signature}`);
                return;
            }

            const slot = tx.slot ?? 0;
            await this.processTokenTransfers(tx, signature, slot);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error processing transaction ${signature}:`, errorMessage);
        }
    }

    /**
     * Get current queue statistics
     */
    getQueueStats(): {
        queueLength: number;
        currentTPS: number;
        isProcessingBatch: boolean;
    } {
        return {
            queueLength: this.transactionQueue.length,
            currentTPS: this.getCurrentTPS(),
            isProcessingBatch: this.isProcessingBatch,
        };
    }

    /**
     * Update batch configuration
     */
    updateBatchConfig(config: Partial<BatchConfig>): void {
        this.batchConfig = { ...this.batchConfig, ...config };
        console.log('⚙️  Batch config updated:', this.batchConfig);

        // Restart batch processor if interval changed
        if (config.batchInterval) {
            this.stopBatchProcessor();
            this.startBatchProcessor();
        }
    }

    /**
     * Cleanup and reset instance
     */
    cleanup(): void {
        this.stopListening();
        this.transferCallbacks = [];
        this.transactionQueue = [];
        this.transactionTimestamps = [];
        Token2022TransferListener.instance = null;
        console.log('🧹 Token 2022 transfer listener cleaned up');
    }
}

/**
 * Token transfer event interface
 */
export interface TokenTransferEvent {
    signature: string;
    mint: string;
    from: string;
    to: string;
    slot: number;
    timestamp: number;
}

