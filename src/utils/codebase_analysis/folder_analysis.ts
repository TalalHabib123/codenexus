import * as fs from 'fs';
import * as path from 'path';

function traverseFolder(
    folderPath: string,
    allFiles: { [key: string]: string },
    newFiles: { [key: string]: string }
) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            traverseFolder(filePath, allFiles, newFiles);
        } else {
            if (filePath.endsWith('.py') && !filePath.endsWith('.pyc') && !allFiles[filePath]) {
                const content = fs.readFileSync(filePath, 'utf-8');
                allFiles[filePath] = content;
                newFiles[filePath] = content;
            }
        }
    }
}

export { traverseFolder };