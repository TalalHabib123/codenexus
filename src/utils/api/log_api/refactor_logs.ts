
import axios from 'axios';
import { ExpressResponseType } from '../../../types/logs';
import { RefactoringData } from '../../../types/refactor_models';
import { BASE_URL} from '../api';


export const refactorLogs = async (filePath:string, refactorData: RefactoringData , title:string): Promise<ExpressResponseType> => {
    try {
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/refactor`, {filePath, refactorData, title});
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
};
