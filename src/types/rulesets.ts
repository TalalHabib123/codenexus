interface Rules {
    detectSmells: string[];
    refactorSmells: string[];
    includeFiles: (string | FileSmellConfig)[];
    excludeFiles: (string | FileSmellConfig)[];
    [key: string]: any;
}

interface FileSmellConfig {
    path: string;
    smells: string[];
}

export { Rules, FileSmellConfig };