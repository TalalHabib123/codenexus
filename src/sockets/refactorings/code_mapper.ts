import * as fs from 'fs';
import * as path from 'path';

function codeMapper(code_snippet: string, file_path: string) {
    const filePath = path.resolve(file_path);
    try {
        fs.writeFileSync(filePath, code_snippet, 'utf-8');
        console.log(`File written: ${filePath}`);
        console.log(code_snippet);
        return true;
    }
    catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        return false;
    }
}

export { codeMapper };