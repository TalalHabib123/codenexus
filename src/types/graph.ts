interface FileNode {
    name: string;
    dependencies: Set<string>; // Set of file names this file depends on
}

export { FileNode };