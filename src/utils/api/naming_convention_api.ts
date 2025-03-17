import axios from "axios";
import {InconsistentNamingResponse } from "../../types/api";
import { BASE_URL } from "./api";

export const detectNamingConvention = async (content: string, 
    DetectionData:{[key:string]:any},
    filePath: string
) => {
    const detectionData = await axios.post<InconsistentNamingResponse>(`${BASE_URL}/detection/naming-convention`, { code: content });
    DetectionData[filePath] = detectionData;
};