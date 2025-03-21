
import axios from 'axios';
import { CreateProject, ExpressResponseType } from '../../../types/logs';
import { BASE_URL} from '../api';
import { authServiceInstance } from '../../../auth/auth';


export const createProject = async (project: CreateProject): Promise<ExpressResponseType> => {
    try {
        const token = authServiceInstance?.getToken();
        if (!token) {
            throw new Error('No token found');
        }
        // Add the token to the request headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/init_project`, project);
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
}
