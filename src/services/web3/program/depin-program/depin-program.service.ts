import { getKeyByName } from "@api/keys/services/queries";
import { ENV } from "@config/env/env";

export const getDepinProgramId = async (): Promise<string> => {
    const key = await getKeyByName("DEPIN_PROGRAM_ID");
    // default reward system program id if there is no key 
    const DEFAULT_DEPIN_PROGRAM_ID = ENV.DEFAULT_DEPIN_PROGRAM_ID
    const depinProgramId = key?.value ?? DEFAULT_DEPIN_PROGRAM_ID;
    // remove all spaces
    return depinProgramId.replace(/\s/g, "");
}