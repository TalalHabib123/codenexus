
import axios from 'axios';
import { ExpressResponseType } from '../../../types/logs';
import { RefactoringData } from '../../../types/refactor_models';
import { BASE_URL} from '../api';
import { authServiceInstance } from '../../../auth/auth';

export const refactorLogs = async (filePath:string, refactorData: RefactoringData , title:string): Promise<ExpressResponseType> => {
    try {
        const token = authServiceInstance?.getToken();
        if (!token) {
            throw new Error('No token found');
        }
        // Add the token to the request headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/refactor`, {filePath, refactorData, title});
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
};
