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
    [CODES.EMPTY_EXPRESSION]:"المعادلة فارغة.",
    [CODES.UNKNOWN_SYMBOL]:"رمز رياضي غير معروف.",
    [CODES.INVALID_NUMBER]:"صيغة العدد غير صحيحة.",
    [CODES.UNEXPECTED_TOKEN]:"رمز في غير موضعه — ربما ينقص حدّ بعد العملية.",
    [CODES.MISSING_CLOSING_BRACKET]:"قوس غير مغلق — أضف القوس المقابل.",
    [CODES.EMPTY_GROUP]:"قوسان فارغان — اكتب شيئًا داخلهما.",
    [CODES.EMPTY_FUNCTION_ARGUMENT]:"الدالة تحتاج إلى مُدخل بين قوسين.",
    [CODES.INVALID_FUNCTION_ARGUMENT_COUNT]:"عدد مُدخلات الدالة غير صحيح.",
    [CODES.INVALID_AST]:"بنية المعادلة غير صحيحة.",
    [CODES.PARSE_ERROR]:"تعذّر قراءة المعادلة.",
    [CODES.TOKENIZE_ERROR]:"المعادلة تحتوي رمزًا غير صالح.",
    [CODES.DIVISION_BY_ZERO]:"القسمة على صفر غير معرّفة.",
    [CODES.ZERO_TO_NEGATIVE_POWER]:"لا يجوز رفع الصفر لأس سالب.",
    [CODES.REAL_DOMAIN_WARNING]:"المعادلة خارج مجال الأعداد الحقيقية.",
    [CODES.INDETERMINATE_FORM_WARNING]:"المعادلة كمية غير معيّنة في هذا السياق.",
    [CODES.CHAINED_RELATION_WARNING]:"تسلسل العلاقات قد يكون ملتبسًا.",
    [CODES.INTERNAL_ERROR]:"حدث خطأ داخلي في محرك الرياضيات."
  });

  global.Masar.register("math.errorCodes",Object.freeze({version:"1.2.0-ar",CODES,DEFAULT_MESSAGES}));
})(window);
