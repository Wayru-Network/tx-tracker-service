import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getSolanaConnection } from "../solana/solana-connection.service";
import { TOKEN_2022_TRACKED_MINT_AUTHORITIES } from "@constants/token-2022-mint-authorities";
import { updateStakerWalletByStakeNftMint } from "@api/hotspots-stakes/services/hotspots-stakes.queries";

/**
 * Token 2022 Program ID
 */
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

/**
 * Service to listen for Token 2022 NFT transfers
 * Monitors transfers of NFTs that have mint authorities from the Depin Program
 */
export class Token2022TransferListener {
    private static instance: Token2022TransferListener | null = null;
    private subscriptionId: number | null = null;
    private connection: anchor.web3.Connection;
    private isListening: boolean = false;

    // Event callbacks
    private transferCallbacks: Array<(event: TokenTransferEvent) => void | Promise<void>> = [];

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
     * Get tracked mint authorities from constants
     */
    private getMintAuthorities(): PublicKey[] {
        return TOKEN_2022_TRACKED_MINT_AUTHORITIES;
    }

    /**
     * Get mint authority from a mint account
     */
    private async getMintAuthority(mintAddress: PublicKey): Promise<PublicKey | null> {
        try {
            const mintInfo = await this.connection.getParsedAccountInfo(mintAddress);

            if (!mintInfo.value || !('parsed' in mintInfo.value.data)) {
                return null;
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsedData = mintInfo.value.data.parsed;

            // For Token 2022, mint authority is in parsed.info.mintAuthority
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
            const mintAuthority = parsedData.info.mintAuthority;

            if (mintAuthority === null || mintAuthority === undefined) {
                return null; // Mint authority has been revoked
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            return new PublicKey(mintAuthority);
        } catch (error) {
            console.error(`❌ Error getting mint authority for ${mintAddress.toString()}:`, error);
            return null;
        }
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

            // Log tracked mint authorities
            const mintAuthorities = this.getMintAuthorities();
            console.log(`📋 Tracking ${mintAuthorities.length} mint authorities:`,
                mintAuthorities.map(a => a.toString())
            );

            // Subscribe to all Token 2022 program logs
            this.subscriptionId = this.connection.onLogs(
                TOKEN_2022_PROGRAM_ID,
                (logs, context) => {
                    void this.handleLogs(logs, context);
                },
                'confirmed'
            );

            this.isListening = true;
            console.log(`✅ Token 2022 transfer listener started`);
        } catch (error) {
            console.error('❌ Failed to start Token 2022 transfer listener:', error);
            throw error;
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
            console.log('🛑 Token 2022 transfer listener stopped');
        } catch (error) {
            console.error('❌ Error stopping Token 2022 transfer listener:', error);
        }
    }

    /**
     * Handle incoming logs and detect transfers
     */
    private async handleLogs(
        logs: anchor.web3.Logs,
        context: anchor.web3.Context
    ): Promise<void> {
        try {
            // Get transaction details
            const tx = await this.connection.getTransaction(logs.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });

            if (!tx || tx.meta?.err || !tx.meta) {
                return; // Skip failed or invalid transactions silently
            }

            // Check for token transfers in the transaction
            await this.processTokenTransfers(tx, logs.signature, context.slot);
        } catch (error) {
            // Only log errors, not every transaction
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error handling Token 2022 logs:`, errorMessage);
        }
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

        // Get mint authorities
        const mintAuthorities = this.getMintAuthorities();
        if (mintAuthorities.length === 0) {
            return; // No mint authorities to check
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

        // Process each balance change
        for (const [accountIndex, balances] of allBalances) {
            const preBalance = balances.pre;
            const postBalance = balances.post;

            // Get the mint address (from pre or post balance)
            const mintAddressStr = preBalance?.mint ?? postBalance?.mint;
            if (!mintAddressStr) {
                continue;
            }

            const mintAddress = new PublicKey(mintAddressStr);
            const preAmount = preBalance?.uiTokenAmount?.amount ?? '0';
            const postAmount = postBalance?.uiTokenAmount?.amount ?? '0';

            // Check if this is an NFT (amount is 1 or 0)
            if (preAmount !== '1' && preAmount !== '0' && preAmount !== '') {
                continue; // Not an NFT (skip if preAmount exists and is not 0 or 1)
            }
            if (postAmount !== '1' && postAmount !== '0' && postAmount !== '') {
                continue; // Not an NFT (skip if postAmount exists and is not 0 or 1)
            }

            // Verify mint authority BEFORE processing (more efficient)
            const mintAuthority = await this.getMintAuthority(mintAddress);
            if (!mintAuthority) {
                continue; // No mint authority or revoked
            }

            // Check if mint authority is in our list
            const isValid = mintAuthorities.some((authority) =>
                authority.equals(mintAuthority)
            );

            if (!isValid) {
                continue; // Not one of our NFTs - skip silently
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
     * Cleanup and reset instance
     */
    cleanup(): void {
        this.stopListening();
        this.transferCallbacks = [];
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

