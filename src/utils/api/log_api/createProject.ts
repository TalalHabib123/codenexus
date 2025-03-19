
import axios from 'axios';
import { CreateProject, ExpressResponseType } from '../../../types/logs';
import { BASE_URL} from '../api';


export const createProject = async (project: CreateProject): Promise<ExpressResponseType> => {
    try {
        console.log('project', project);
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/init_project`, project);
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
}
