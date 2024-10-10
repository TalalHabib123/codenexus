import { CodeResponse, DetectionResponse } from "../../types/api";
import axios from "axios";
import { MagicNumbersResponse } from "../../types/api";
import { BASE_URL } from "./api";

export const detectMagicNumbers = async (filePath: string, content: string,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }) => {
    return await axios.post<MagicNumbersResponse>(`${BASE_URL}/detection/magic-numbers`, { code: content });
};