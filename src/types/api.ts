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


interface MagicNumbersDetails {
    magic_number: number;
    line_number: number;
}

interface MagicNumbersResponse {
    magic_numbers?: MagicNumbersDetails[] | null;
    success: boolean;
    error?: string | undefined;
}

interface ParameterListDetails {
    function_name: string;
    parameters: string[];
    long_parameter_count: number;
    long_parameter: boolean;
    line_number: number;
}

interface LongParameterListResponse {
    long_parameter_list?: ParameterListDetails[] | null;
    success: boolean;
    error?: string | undefined;
}

interface UnusedVariablesDetails {
    variable_name: string;
    line_number: number;
}

interface UnusedVariablesResponse {
    unused_variables?: UnusedVariablesDetails[] | null;
    success: boolean;
    error?: string | null;
}

interface NamingConventionVars {
    variable: string;
    line_number: number;
}

interface InconsistentNamingDetails {
    type: string;
    total_count: number;
    type_count: number;
    vars: NamingConventionVars[];
}

interface InconsistentNamingResponse {
    inconsistent_naming?: InconsistentNamingDetails[] | null;
    success: boolean;
    error?: string | undefined;
}


interface Duplicates {
    code: string;
    start_line: number;
    end_line: number;
}

interface DuplicateCodeDetails {
    original_code: string;
    start_line: number;
    end_line: number;
    duplicates: Duplicates[];
    duplicate_count: number;
}

interface DuplicateCodeResponse {
    duplicate_code?: DuplicateCodeDetails[] | null;
    success: boolean;
    error?: string | undefined;
}


interface SubDetectionResponse {
    success: boolean;
    error?: string;
    data?: string[] | 
            ComplexConditionalResponse | 
            VariableConflictResponse |
            TemporaryVariableResponse | 
            UnreachableResponse | 
            DeadCodeResponse | 
            MagicNumbersResponse | 
            LongParameterListResponse |
            UnusedVariablesResponse |
            InconsistentNamingResponse | 
            DuplicateCodeResponse; 
}



interface UserTriggeredDetectionResponse {
    correlation_id: string;
    processed_data?: {
        [key: string]: Array<{
            Detected?: string;
            Issue?: string;
            LineNumber?: number;
        }>;
    };
    task_status: string;
    task_type?: string;
    task_job?: string;
    error?: string;
}


interface UserTriggeredDetection {
    data: any[];        
    time: Date;     
    analysis_type: string; 
    job_id: string;   
    outdated: boolean;  
    success: boolean;      
    error: string;         
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
    user_triggered_detection?: Array<UserTriggeredDetection>;
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
    class_details?: { [key: string]: string[] | Boolean }[];
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
    ComplexConditionalResponse,
    MagicNumbersResponse, 
    LongParameterListResponse,
    UnusedVariablesResponse,
    InconsistentNamingResponse,
    DuplicateCodeResponse,
    UserTriggeredDetectionResponse,
    UserTriggeredDetection,
    VariableConflictAnalysis
};
