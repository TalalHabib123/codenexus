import axios from "axios";
import { LongParameterListResponse } from "../../types/api";
import { BASE_URL } from "./api";

export const detectLongParameterList = async (content: string) => {
    return await axios.post<LongParameterListResponse>(`${BASE_URL}/detection/parameter-list`, { code: content });
};