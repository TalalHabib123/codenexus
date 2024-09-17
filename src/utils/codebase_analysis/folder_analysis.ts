import * as fs from 'fs';
import * as path from 'path';
import { FolderStructure } from '../../types/folder';

function traverseFolder(
    folderPath: string,
    allFiles: { [key: string]: string },
    newFiles: { [key: string]: string }
) {
    const currentFiles: { [key: string]: boolean } = {};

    function traverse(folderPath: string) {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                traverse(filePath);
            } else {
                if (filePath.endsWith('.py') && !filePath.endsWith('.pyc')) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    currentFiles[filePath] = true;
                    if (!allFiles[filePath] || allFiles[filePath] !== content) {
                        allFiles[filePath] = content;
                        newFiles[filePath] = content;
                    }
                }
            }
        }
    }

    traverse(folderPath);

    for (const filePath in allFiles) {
        if (!currentFiles[filePath]) {
            delete allFiles[filePath];
        }
    }
}

function folderStructure(folderPath: string): FolderStructure {
    const result: FolderStructure = {
        files: [],
        subfolders: {}
    };

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            // Recursively get the structure of the subfolders
            result.subfolders[file] = folderStructure(filePath);
        } else if (file.endsWith('.py') && !file.endsWith('.pyc')) {
            // Only add Python files (not bytecode files)
            result.files.push(file);
        }
    }

    return result;
}

export { traverseFolder, folderStructure };