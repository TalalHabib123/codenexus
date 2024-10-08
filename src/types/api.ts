import { interfaces } from "mocha";

interface GlobalVariable {
    variable_name: string;
    variable_type: string;
    class_or_function_name?: string;
}

interface Import {
    name: string;
    alias?: string;
    type: string;
    module?: string;
}

interface CodeResponse {
    code?: string;
    ast?: string;
    function_names?: string[];
    class_details?: { [key: string]: string | string[] }[];
    global_variables?: GlobalVariable[];
    is_main_block_present?: boolean;
    imports?: { [key: string]: Import[] };
    is_standalone_file?: boolean;
    success: boolean;
    error?: string;
}

interface VariableConflictAnalysis {
    variable: string;
    assignments: Array<[string, number]>;
    local_assignments: Array<[string, number]>;
    usages: Array<[string, number]>;
    conflicts: string[];
    warnings: string[];
}

interface VariableConflictResponse {
    conflicts_report?: VariableConflictAnalysis[] | null;
    success: boolean;
    error?: string | undefined;
}

interface TemporaryVariableResponse {
    temporary_fields?: string[] | null;
    success: boolean;
    error?: string | undefined;
}

interface UnreachableResponse {
    unreachable_code?: string[];
    success: boolean;
    error?: string | undefined;
}

interface ConditionDetails {
    line_range: [number, number];
    condition_code: string;
    complexity_score: number;
    code_block: string;
}

interface ComplexConditionalResponse {
    conditionals?: ConditionDetails[] | null;
    success: boolean;
    error?: string | undefined;
}


interface SubDetectionResponse {
    success: boolean;
    error?: string;
    data?: string[] | ComplexConditionalResponse | VariableConflictResponse | TemporaryVariableResponse | UnreachableResponse | DeadCodeResponse; 
}

interface DetectionResponse {
    magic_numbers?: SubDetectionResponse;
    duplicated_code?: SubDetectionResponse;
    unused_variables?: SubDetectionResponse;
    long_parameter_list?: SubDetectionResponse;
    naming_convention?: SubDetectionResponse;
    dead_code?: SubDetectionResponse;
    unreachable_code?: SubDetectionResponse;
    temporary_field?: SubDetectionResponse;
    overly_complex_condition?: SubDetectionResponse;
    global_conflict?: SubDetectionResponse;
    success: boolean;
    error?: string;  
}


interface Response{
    fileName: string;
    data: {};
    success: boolean;
    error?:string
}

interface DeadCodeResponse {
    function_names?: string[];
    class_details?: { [key: string]: string | string[] | Boolean }[];
    global_variables?: string[];
    imports?: { [key: string]: { [key: string]: any }[] };
    success: boolean;
    error?: string;
}

interface DeadClassResponse {
    class_details?: { [key: string]: string[] }[];
    success: boolean;
    error?: string;
}

export { CodeResponse, 
    DeadCodeResponse, 
    Response, 
    DetectionResponse, 
    DeadClassResponse,  
    UnreachableResponse,
    VariableConflictResponse,
    TemporaryVariableResponse,
    ComplexConditionalResponse
};
