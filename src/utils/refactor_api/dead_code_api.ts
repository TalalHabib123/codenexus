import * as path from 'path';
import axios from 'axios';
import { RefactorResponse, DeadCodeRefactorRequest } from '../../types/refactor_models';
import { BASE_URL } from './api';

async function refactorDeadCode(filePath: string, 
    content: DeadCodeRefactorRequest) {
    try {
        const fileName = path.basename(filePath);
        const response = await axios.post<RefactorResponse>(`${BASE_URL}/refactor/dead-code`, { code: content.code, entity_name: content.entity_name, entity_type: content.entity_type });
        const responseData = response.data;
        if (responseData.success) {
            console.log(`File ${fileName} sent successfully.`);
            return responseData.refactored_code;
        } else {
            console.error(`Error in file ${fileName}: ${responseData.error}`);
            return null;
        }
    } catch (e) {
        console.error(`Failed to send file ${filePath}:`, e);
        return;
    }
}

async function getClassDeadSmells(code: string, class_name: string) {
    // try {
    //     const response = await axios.post<DeadClassResponse>(`${BASE_URL}/refactor/dead-class`, { code, class_name });
    //     return response.data;
    // } catch (e) {
    //     console.error(`Failed to get dead smells for class ${class_name}:`, e);
    //     return {
    //         success: false,
    //         error: "Failed to communicate with server" + e,
    //     };
    // }
}

export { refactorDeadCode, getClassDeadSmells };