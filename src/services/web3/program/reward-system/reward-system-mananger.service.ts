import * as anchor from "@coral-xyz/anchor";
import { ENV } from "@config/env/env";
import { getSolanaConnection } from "../../solana/solana-connection.service";
import { getKeyPair } from "../../wallet/keypair";
import { RewardSystem } from "@interfaces/web3/program/reward-system";
import { getRewardSystemProgramId } from "./reward-system.service";
/**
 * - This class is used to manage the reward system program
 * - It is a singleton class that can be used to get the instance of the reward system program
 * - It is also used to clean up the reward system program
 * - You can no use it to make transactions because it is only for reading states of the program
 */
export class RewardSystemManager {
    private static instance: anchor.Program<RewardSystem> | null = null;
    private static isInitializing: boolean = false;

    static async getInstance(): Promise<anchor.Program<RewardSystem>> {
        if (RewardSystemManager.instance) {
            return RewardSystemManager.instance;
        }

        if (RewardSystemManager.isInitializing) {
            // await until the instance is initialized
            while (RewardSystemManager.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return RewardSystemManager.instance!;
        }

        RewardSystemManager.isInitializing = true;
        try {
            if (!ENV.SOLANA_WALLET_PRIVATE_KEY) {
                throw new Error("SOLANA_WALLET_PRIVATE_KEY is not set");
            }
            const connection = getSolanaConnection();
            const adminKeypair = getKeyPair(ENV.SOLANA_WALLET_PRIVATE_KEY) as unknown as anchor.web3.Keypair;
            const provider = new anchor.AnchorProvider(
                connection,
                new anchor.Wallet(adminKeypair),
                { commitment: "confirmed" }
            );

            const rewardSystemProgramId = await getRewardSystemProgramId();
            const programId = new anchor.web3.PublicKey(rewardSystemProgramId);
            const idl = await anchor.Program.fetchIdl(programId, provider);

            if (!idl) {
                console.error('❌ Failed to initialize Reward System Program: IDL not found');
                throw new Error('❌ Failed to initialize Reward System Program: IDL not found');
            }

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            RewardSystemManager.instance = await anchor.Program.at(
                programId,
                provider
            ) as anchor.Program<RewardSystem>;

            console.log('✅ Reward System Program initialized');
            return RewardSystemManager.instance;
        } catch (error) {
            console.error('Error loading IDL:', error);
            throw new Error('❌ Failed to initialize Reward System Program: IDL not found');
        } finally {
            RewardSystemManager.isInitializing = false;
        }
    }

    static cleanup(): void {
        if (RewardSystemManager.instance) {
            // clean up connections if necessary
            RewardSystemManager.instance = null;
            console.log('🧹 Reward System Program cleaned up');
        }
    }
}