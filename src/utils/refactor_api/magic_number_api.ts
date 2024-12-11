import { CodeResponse, DetectionResponse } from "../../types/api";
import axios from "axios";
import { RefactorResponse, MagicNumberRefactorRequest } from '../../types/refactor_models';
import { BASE_URL } from "./api";

export const refactorMagicNumbers = async ( content: MagicNumberRefactorRequest) => {
    return await axios.post<RefactorResponse>(`${BASE_URL}/refactor/magic-numbers`, content);
};