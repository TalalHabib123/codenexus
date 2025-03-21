
import axios from 'axios';
import { ExpressResponseType } from '../../../types/logs';
import { DetectionResponse } from '../../../types/api';
import { BASE_URL} from '../api';
import { authServiceInstance } from '../../../auth/auth';

export const detectionLog = async (detectionData: {[key: string]: DetectionResponse }, title:string, scan_name:string, scan_type:string): Promise<ExpressResponseType> => {
    try {
        const token = authServiceInstance?.getToken();
        if (!token) {
            throw new Error('No token found');
        }
        // Add the token to the request headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/detection`, {detectionData,title, scan_name, scan_type});
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
}
