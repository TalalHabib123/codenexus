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

export { CodeResponse };