import { CodeResponse, DetectionResponse } from "../../types/api";
import axios from "axios";
import { RefactorResponse, MagicNumberRefactorRequest } from '../../types/refactor_models';
import { BASE_URL } from "./api";

export const detectMagicNumbers = async (filePath: string, content: MagicNumberRefactorRequest,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: RefactorResponse }) => {
    return await axios.post<RefactorResponse>(`${BASE_URL}/refactor/magic-numbers`, { code: content });
};