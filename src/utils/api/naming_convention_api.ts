import axios from "axios";
import {InconsistentNamingResponse } from "../../types/api";
import { BASE_URL } from "./api";

export const detectNamingConvention = async (content: string) => {
    return await axios.post<InconsistentNamingResponse>(`${BASE_URL}/detection/naming-convention`, { code: content });
};