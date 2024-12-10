import axios from "axios";
import { RefactorResponse, InconsistentNamingRefactorRequest } from '../../types/refactor_models';
import { BASE_URL } from "./api";

export const refactorNamingConvention = async (content: InconsistentNamingRefactorRequest ) => {
    console.log("Requesting refactor for inconsistent naming convention");
    return await axios.post<RefactorResponse>(`${BASE_URL}/refactor/naming-convention`, content);
};