(function(global){
  "use strict";

  const CODES=Object.freeze({
    EMPTY_EXPRESSION:"MTH001",
    UNKNOWN_SYMBOL:"MTH002",
    INVALID_NUMBER:"MTH003",
    UNEXPECTED_TOKEN:"MTH004",
    MISSING_CLOSING_BRACKET:"MTH005",
    EMPTY_GROUP:"MTH006",
    EMPTY_FUNCTION_ARGUMENT:"MTH007",
    INVALID_FUNCTION_ARGUMENT_COUNT:"MTH008",
    INVALID_AST:"MTH009",
    PARSE_ERROR:"MTH010",
    TOKENIZE_ERROR:"MTH011",
    DIVISION_BY_ZERO:"MTH012",
    ZERO_TO_NEGATIVE_POWER:"MTH013",
    REAL_DOMAIN_WARNING:"MTH014",
    INDETERMINATE_FORM_WARNING:"MTH015",
    CHAINED_RELATION_WARNING:"MTH016",
    INTERNAL_ERROR:"MTH999"
  });

  const DEFAULT_MESSAGES=Object.freeze({
    [CODES.EMPTY_EXPRESSION]:"Expression is empty.",
    [CODES.UNKNOWN_SYMBOL]:"Unknown mathematical symbol.",
    [CODES.INVALID_NUMBER]:"Invalid numeric literal.",
    [CODES.UNEXPECTED_TOKEN]:"Unexpected token.",
    [CODES.MISSING_CLOSING_BRACKET]:"Missing closing bracket.",
    [CODES.EMPTY_GROUP]:"Empty groups are not allowed.",
    [CODES.EMPTY_FUNCTION_ARGUMENT]:"Function requires an argument.",
    [CODES.INVALID_FUNCTION_ARGUMENT_COUNT]:"Function received an invalid number of arguments.",
    [CODES.INVALID_AST]:"The expression tree is invalid.",
    [CODES.PARSE_ERROR]:"The expression could not be parsed.",
    [CODES.TOKENIZE_ERROR]:"The expression contains an invalid token.",
    [CODES.DIVISION_BY_ZERO]:"Division by zero is undefined.",
    [CODES.ZERO_TO_NEGATIVE_POWER]:"Zero cannot be raised to a negative power.",
    [CODES.REAL_DOMAIN_WARNING]:"The expression is outside the real-number domain.",
    [CODES.INDETERMINATE_FORM_WARNING]:"The expression is indeterminate in this context.",
    [CODES.CHAINED_RELATION_WARNING]:"The chained relation may be ambiguous.",
    [CODES.INTERNAL_ERROR]:"An internal mathematics-engine error occurred."
  });

  global.Masar.register("math.errorCodes",Object.freeze({version:"1.1.0",CODES,DEFAULT_MESSAGES}));
})(window);
