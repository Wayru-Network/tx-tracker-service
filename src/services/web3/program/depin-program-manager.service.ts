import * as anchor from "@coral-xyz/anchor";
import { ENV } from "@config/env/env";
import { DepinStake } from "@interfaces/web3/program/depin-program";
import { getSolanaConnection } from "../solana/solana-connection.service";
import { getKeyPair } from "../wallet/keypair";
import { getDepinProgramId } from "./depin-program.service";

/**
 * - This class is used to manage the depin program
 * - It is a singleton class that can be used to get the instance of the depin program
 * - It is also used to clean up the depin program
 * - You can no use it to make transactions because it is only for reading states of the program
 */
export class DepinProgramManager {
    private static instance: anchor.Program<DepinStake> | null = null;
    private static isInitializing: boolean = false;

    static async getInstance(): Promise<anchor.Program<DepinStake>> {
        if (DepinProgramManager.instance) {
            return DepinProgramManager.instance;
        }

        if (DepinProgramManager.isInitializing) {
            // await until the instance is initialized
            while (DepinProgramManager.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return DepinProgramManager.instance!;
        }

        DepinProgramManager.isInitializing = true;
        try {
            if (!ENV.SOLANA_WALLET_PRIVATE_KEY) {
                throw new Error("SOLANA_WALLET_PRIVATE_KEY is not set");
            }
            const connection = getSolanaConnection();
            const adminKeypair = await getKeyPair(ENV.SOLANA_WALLET_PRIVATE_KEY) as unknown as anchor.web3.Keypair;
            const provider = new anchor.AnchorProvider(
                connection,
                new anchor.Wallet(adminKeypair),
                { commitment: "confirmed" }
            );

            const depinProgramId = await getDepinProgramId();
            const programId = new anchor.web3.PublicKey(depinProgramId);
            const idl = await anchor.Program.fetchIdl(programId, provider);

            if (!idl) {
                console.error('❌ Failed to initialize Boost Stake Program: IDL not found');
                throw new Error('❌ Failed to initialize Boost Stake Program: IDL not found');
            }

            DepinProgramManager.instance = await anchor.Program.at(
                programId,
                provider
            ) as anchor.Program<DepinStake>;

            console.log('✅ Boost Stake Program initialized');
            return DepinProgramManager.instance;
        } catch (error) {
            console.error('Error loading IDL:', error);
            throw new Error('❌ Failed to initialize Boost Stake Program: IDL not found');
        } finally {
            DepinProgramManager.isInitializing = false;
        }
    }

    static cleanup() {
        if (DepinProgramManager.instance) {
            // clean up connections if necessary
            DepinProgramManager.instance = null;
            console.log('🧹 Boost Stake Program cleaned up');
        }
    }
}