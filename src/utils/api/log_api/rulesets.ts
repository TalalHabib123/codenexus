
import axios from 'axios';
import {ExpressResponseType } from '../../../types/logs';
import { BASE_URL} from '../api';
import { Rules } from '../../../types/rulesets';


export const rulesetsLog = async (title: string, ruleset: Rules): Promise<ExpressResponseType> => {
    try {
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/ruleset/add-or-update`, {title, ruleset});
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
}
