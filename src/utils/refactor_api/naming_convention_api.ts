import axios from "axios";
import { RefactorResponse, InconsistentNamingRefactorRequest } from '../../types/refactor_models';
import { BASE_URL } from "./api";

export const detectNamingConvention = async (content: InconsistentNamingRefactorRequest ) => {
    return await axios.post<RefactorResponse>(`${BASE_URL}/refactor/naming-convention`, content);
};