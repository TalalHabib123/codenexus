import * as path from 'path';
import axios from 'axios';
import { RefactorResponse, DeadCodeRefactorRequest } from '../../types/refactor_models';
import { BASE_URL } from './api';

async function refactorDeadCode(
    content: DeadCodeRefactorRequest) {
    try {
        const response = await axios.post<RefactorResponse>(`${BASE_URL}/refactor/dead-code`, content);
        return response
    } catch (e) {
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