interface RefactorRequest {
    code: string;
    refactor_type: string;
    refactor_details: { [key: string]: any };
}

interface UnusedVariablesRefactorRequest {
    code: string;
    unused_variables: string[];
}

interface MagicNumbersDetails {
    magic_number: number | string; // Using string to handle float compatibility in JavaScript
    line_number: number;
}

interface MagicNumberRefactorRequest {
    code: string;
    magic_numbers?: MagicNumbersDetails[]; // Optional array of magic number details
}

interface InconsistentNamingRefactorRequest {
    code: string;
    target_convention: string; // Convention to which naming will be aligned
    naming_convention: string; // Existing naming convention in the code
}

interface UnreachableCodeRequest {
    code: string;
    unreachable_code_lines: number[]; // List of line numbers with unreachable code
}

interface DeadCodeRefactorRequest {
    code: string;
    entity_name: string; // Name of the dead entity (function, class, variable)
    entity_type: string; // Type of the dead entity ("function", "class", "variable")
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
    RefactorResponse
};
