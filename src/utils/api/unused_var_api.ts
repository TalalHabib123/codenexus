import axios from "axios";
import { UnusedVariablesResponse } from "../../types/api";
import { BASE_URL } from "./api";

export const detectUnusedVars = async (content: string) => {
    return await axios.post<UnusedVariablesResponse>(`${BASE_URL}/detection/unused-variables`, { code: content });
};