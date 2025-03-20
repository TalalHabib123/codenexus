interface Dependency  {
    name: string;
    valid: boolean;
    fileContent: string;
    weight: { name: string;
        type: string;
        alias?: string;
        source: 'Exporting' | 'Importing'
    }[];
}


interface RefactorRequest {
    code: string;
    refactor_type: string;
    refactor_details: { [key: string]: any };
}


interface UnusedVariablesRefactorRequest {
    code: string;
    unused_variables: string[];
    dependencies?: Dependency[];
}

interface MagicNumbersDetails {
    magic_number: number | string; 
    line_number: number;
    
}

interface MagicNumberRefactorRequest {
    code: string;
    magic_numbers?: MagicNumbersDetails[];
    dependencies?: Dependency[];
}

interface InconsistentNamingRefactorRequest {
    code: string;
    target_convention: string; 
    naming_convention: string; 
    dependencies?: Dependency[];
}

interface UnreachableCodeRequest {
    code: string;
    unreachable_code_lines: number[]; 
}

interface DeadCodeRefactorRequest {
    code: string;
    entity_name: string; 
    entity_type: string; 
    dependencies?: Dependency[];
}

interface RefactorResponse {
    refactored_code: string;
    dependencies?: Dependency[];
    success: boolean;
    error?: string; 
}



interface RefactoringData {
    orginal_code: string |undefined;
    refactored_code?: string;
    refactoring_type?: string;
    refactored_dependencies?: Dependency[];
    time: Date;
    cascading_refactor?: boolean;
    job_id?: string;
    ai_based?: boolean;
    files_affected?: string[] | [];
    outdated?: boolean;
    success: boolean;
    error?: string;
}




export {
    RefactorRequest,
    UnusedVariablesRefactorRequest,
    MagicNumberRefactorRequest,
    InconsistentNamingRefactorRequest,
    UnreachableCodeRequest,
    DeadCodeRefactorRequest,
    RefactorResponse, 
    Dependency,
    RefactoringData,
    
};
