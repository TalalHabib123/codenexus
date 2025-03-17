import axios from "axios";
import { MagicNumbersResponse } from "../../types/api";
import { BASE_URL } from "./api";

export const detectMagicNumbers = async (content: string,
    DetectionData: { [key: string]: any },
    filePath: string
) => {
    const detectionData = await axios.post<MagicNumbersResponse>(`${BASE_URL}/detection/magic-numbers`, { code: content });
    DetectionData[filePath] = detectionData;
};