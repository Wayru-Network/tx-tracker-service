import { PublicKey } from "@solana/web3.js";
import { DepinProgramManager } from "./depin-program-manager.service";

/**
 * Service to get admin account information from Depin Program
 */
export class DepinProgramAdminService {
    /**
     * Get program admin entry with mint authorities
     */
    static async getProgramAdminEntry(): Promise<{
        adminPubkey: string;
        feeAmount: number;
        adminCandidatePubkey: string;
        mintAuthorities: string[];
    }> {
        try {
            const program = await DepinProgramManager.getInstance();
            console.log('program id', program.programId.toString());

            const [programAdminEntryPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("admin_account")],
                program.programId
            );

            const programAdminEntry = await program.account.adminAccount.fetch(
                programAdminEntryPDA
            );

            return {
                adminPubkey: programAdminEntry.adminPubkey.toString(),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                feeAmount: programAdminEntry.feeAmount.toNumber() / 10 ** 6,
                adminCandidatePubkey: programAdminEntry.adminCandidatePubkey.toString(),
                mintAuthorities: programAdminEntry.mintAuthorities.map((authority) =>
                    authority.toString()
                ),
            };
        } catch (error) {
            console.error("Error getting ProgramAdminEntry:", error);
            throw error;
        }
    }

    /**
     * Get mint authorities as PublicKey array
     */
    static async getMintAuthorities(): Promise<PublicKey[]> {
        const adminEntry = await this.getProgramAdminEntry();
        return adminEntry.mintAuthorities.map(
            (authority) => new PublicKey(authority)
        );
    }

    /**
     * Check if a mint authority is valid (belongs to the program)
     */
    static async isValidMintAuthority(mintAuthority: PublicKey): Promise<boolean> {
        try {
            const mintAuthorities = await this.getMintAuthorities();
            return mintAuthorities.some((authority) => authority.equals(mintAuthority));
        } catch (error) {
            console.error("Error checking mint authority:", error);
            return false;
        }
    }
}

