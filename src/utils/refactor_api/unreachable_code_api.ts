import * as path from 'path';
import axios from 'axios';
import { RefactorResponse, UnreachableCodeRequest } from '../../types/refactor_models';
import { BASE_URL } from './api';

async function sendFileForUnreachableCodeAnalysis(
    filePath: string, 
    content: UnreachableCodeRequest,
   ) {
    try {
        const fileName = path.basename(filePath);
        console.log(`Sending file ${fileName} for unreachable code analysis...`);
        const response = await axios.post<RefactorResponse>(`${BASE_URL}/refactor/unreachable-code`, content);
        const responseData = response.data;
        if (responseData.success) {
            console.log(`File ${fileName} sent successfully.`);
            return responseData;
        } else {
            console.error(`Error in file ${fileName}: ${responseData.error}`);
            return null;
        }
    } catch (e) {
        console.error(`Failed to send file ${filePath}:`, e);
        return null;
    }
}

export { sendFileForUnreachableCodeAnalysis };