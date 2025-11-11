import { getKeyByName } from "@api/keys/services/queries";
import { ENV } from "@config/env/env";

export const getRewardSystemProgramId = async (): Promise<string> => {
    const key = await getKeyByName("REWARD_SYSTEM_PROGRAM_ID");
    // default reward system program id if there is no key
    const DEFAULT_REWARD_SYSTEM_PROGRAM_ID = ENV.DEFAULT_REWARD_SYSTEM_PROGRAM_ID
    const rewardSystemProgramId = key?.value ?? DEFAULT_REWARD_SYSTEM_PROGRAM_ID;
    // remove all spaces
    return rewardSystemProgramId.replace(/\s/g, "");
}