interface Rules {
    detectSmells: string[];
    refactorSmells: string[];
    includeFiles: string[];
    excludeFiles: string[];
    [key: string]: any;
}


export { Rules };