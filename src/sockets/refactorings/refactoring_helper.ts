const refactoringHelper: { [key: string]: string }  = {
    "long_function": "name",
    "god_object": "name",
    "feature_envy": "name",
    "inappropriate_intimacy": "name",
    "middle_man": "name",
    "switch_statement_abuser": "name",
    "excessive_flags": "name",
    "duplicate_code": "default",
    "conditionals": "default",
    "global_conflict": "default",
    "long_parameter_list": "name",
    "temporary_field": "default",
};

const refactoringMappingHelper: { [key: string]: string } = {
    "long_function": "complete",
    "god_object": "complete",
    "feature_envy": "complete",
    "inappropriate_intimacy": "complete",
    "middle_man": "complete",
    "switch_statement_abuser": "complete",
    "excessive_flags": "complete",
    "duplicate_code": "complete",
    "conditionals": "complete",
    "global_conflict": "complete",
    "long_parameter_list": "complete",
    "temporary_field": "complete",
};

export { refactoringHelper };