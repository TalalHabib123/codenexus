
import axios from 'axios';
import {ExpressResponseType } from '../../../types/logs';
import { FileNode } from '../../../types/graph';
import { BASE_URL} from '../api';


export const dependencyGraphLog = async (projectTitle: string, graphData: { [key: string]: Map<string, FileNode> }): Promise<ExpressResponseType> => {
    try {
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/graph/add-or-update`, {projectTitle, graphData});
        return response.data;
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
}
