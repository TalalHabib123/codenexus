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
    magic_number: number | string; // Using string to handle float compatibility in JavaScript
    line_number: number;
    dependencies?: Dependency[];
}

interface MagicNumberRefactorRequest {
    code: string;
    magic_numbers?: MagicNumbersDetails[];
    dependencies?: Dependency[];
}

interface InconsistentNamingRefactorRequest {
    code: string;
    target_convention: string; // Convention to which naming will be aligned
    naming_convention: string; // Existing naming convention in the code
    dependencies?: Dependency[];
}

interface UnreachableCodeRequest {
    code: string;
    unreachable_code_lines: number[]; // List of line numbers with unreachable code
    dependencies?: Dependency[];
}

interface DeadCodeRefactorRequest {
    code: string;
    entity_name: string; // Name of the dead entity (function, class, variable)
    entity_type: string; // Type of the dead entity ("function", "class", "variable")
    dependencies?: Dependency[];
}

interface RefactorResponse {
    refactored_code: string;
    success: boolean;
    error?: string; // Optional error message in case of failure
}


export {
    RefactorRequest,
    UnusedVariablesRefactorRequest,
    MagicNumberRefactorRequest,
    InconsistentNamingRefactorRequest,
    UnreachableCodeRequest,
    DeadCodeRefactorRequest,
    RefactorResponse, 
    Dependency
};
