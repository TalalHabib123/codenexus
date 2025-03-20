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
    "long_function": "user_triggered",
    "god_object": "user_triggered",
    "feature_envy": "user_triggered",
    "inappropriate_intimacy": "user_triggered",
    "middle_man": "user_triggered",
    "switch_statement_abuser": "user_triggered",
    "excessive_flags": "user_triggered",
    "duplicate_code": "default",
    "conditionals": "default",
    "global_conflict": "default",
    "long_parameter_list": "default",
    "temporary_field": "default",
};

export { refactoringHelper, refactoringMappingHelper };