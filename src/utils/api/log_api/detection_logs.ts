
import axios from 'axios';
import { ExpressResponseType } from '../../../types/logs';
import { DetectionResponse } from '../../../types/api';
import { BASE_URL} from '../api';


export const detectionLog = async (detectionData: {[key: string]: DetectionResponse }, title:string, scan_name:string, scan_type:string): Promise<ExpressResponseType> => {
    try {
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/detection`, {detectionData,title, scan_name, scan_type});
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
}
