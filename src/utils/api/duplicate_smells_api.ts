import axios from "axios";
import { DuplicateCodeResponse } from "../../types/api";
import { BASE_URL } from "./api";

export const detectDuplicateCode = async (content: string) => {
    return await axios.post<DuplicateCodeResponse>(`${BASE_URL}/detection/duplicated-code`, { code: content });
};