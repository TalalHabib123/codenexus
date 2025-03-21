
import axios from 'axios';
import {ExpressResponseType } from '../../../types/logs';
import { BASE_URL} from '../api';
import { Rules } from '../../../types/rulesets';
import { authServiceInstance } from '../../../auth/auth';

export const rulesetsLog = async (title: string, ruleset: Rules): Promise<ExpressResponseType> => {
    try {
        const token = authServiceInstance?.getToken();
        if (!token) {
            throw new Error('No token found');
        }
        // Add the token to the request headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/ruleset/add-or-update`, {title, ruleset});
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
}
