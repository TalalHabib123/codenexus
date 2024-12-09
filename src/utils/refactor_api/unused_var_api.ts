import axios from "axios";
import { RefactorResponse, UnusedVariablesRefactorRequest } from '../../types/refactor_models';
import { BASE_URL } from "./api";

export const detectUnusedVars = async (content: UnusedVariablesRefactorRequest) => {
    return await axios.post<RefactorResponse>(`${BASE_URL}/refactor/unused-variables`, content);
};