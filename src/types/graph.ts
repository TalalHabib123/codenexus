interface UtilizedEntity {
    name: string;
    type: string;
    alias?: string;
    source: 'Exporting' | 'Importing';
};

interface DependentNode  {
    name: string;
    alias?: string;
    valid: boolean;
    weight: Array<UtilizedEntity>;
}


interface FileNode {
    name: string;
    dependencies: Set<DependentNode>; 
}

export { FileNode, UtilizedEntity, DependentNode };