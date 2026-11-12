// Magic Formulas (offline): the function catalogue with a plain description and an example for each
// function, search, a form-based formula builder for common jobs and "explain this formula" from the parse tree.
import { parse, numToText, colName, textToNumber, parseDateText, serialToParts, FormulaError } from "./formula.js";

const I = (cat, desc, syntax, example, keys = "") => ({ cat, desc, syntax, example, keys });
export const FUNCTION_INFO = {
  SUM: I("Maths", "Adds up numbers.", "SUM(number1, [number2], …)", "=SUM(A1:A10)", "total add plus"),
  AVERAGE: I("Statistics", "The average (mean) of numbers.", "AVERAGE(number1, …)", "=AVERAGE(B2:B20)", "mean"),
  MIN: I("Statistics", "The smallest number.", "MIN(number1, …)", "=MIN(C2:C50)", "lowest minimum"),
  MAX: I("Statistics", "The largest number.", "MAX(number1, …)", "=MAX(C2:C50)", "highest maximum biggest"),
  COUNT: I("Statistics", "How many cells hold numbers.", "COUNT(value1, …)", "=COUNT(A2:A100)", "how many numbers"),
  COUNTA: I("Statistics", "How many cells are not empty.", "COUNTA(value1, …)", "=COUNTA(A2:A100)", "how many filled non-empty"),
  COUNTBLANK: I("Statistics", "How many cells are empty.", "COUNTBLANK(range)", "=COUNTBLANK(B2:B30)", "empty missing"),
  PRODUCT: I("Maths", "Multiplies numbers together.", "PRODUCT(number1, …)", "=PRODUCT(A2:A4)", "multiply times"),
  ROUND: I("Maths", "Rounds a number to a number of decimal places (halves round away from zero).", "ROUND(number, digits)", "=ROUND(B2, 2)", "decimal"),
  ROUNDUP: I("Maths", "Rounds a number up, away from zero.", "ROUNDUP(number, digits)", "=ROUNDUP(B2, 0)", "ceiling"),
  ROUNDDOWN: I("Maths", "Rounds a number down, towards zero.", "ROUNDDOWN(number, digits)", "=ROUNDDOWN(B2, 0)", "floor cut"),
  TRUNC: I("Maths", "Cuts off the decimals of a number.", "TRUNC(number, [digits])", "=TRUNC(8.79)", "remove decimals"),
  INT: I("Maths", "Rounds down to the whole number below.", "INT(number)", "=INT(7.8)", "whole integer"),
  ABS: I("Maths", "The number without its minus sign.", "ABS(number)", "=ABS(-12)", "absolute positive"),
  SIGN: I("Maths", "1 for positive, -1 for negative, 0 for zero.", "SIGN(number)", "=SIGN(B2)"),
  SQRT: I("Maths", "Square root.", "SQRT(number)", "=SQRT(144)", "root"),
  POWER: I("Maths", "A number raised to a power.", "POWER(number, power)", "=POWER(2, 8)", "exponent square cube"),
  EXP: I("Maths", "e raised to a power.", "EXP(number)", "=EXP(1)"),
  LN: I("Maths", "Natural logarithm.", "LN(number)", "=LN(10)", "log"),
  LOG10: I("Maths", "Logarithm with base 10.", "LOG10(number)", "=LOG10(1000)", "log"),
  LOG: I("Maths", "Logarithm with any base (10 when left out).", "LOG(number, [base])", "=LOG(8, 2)"),
  MOD: I("Maths", "The remainder after dividing.", "MOD(number, divisor)", "=MOD(10, 3)", "remainder divide"),
  CEILING: I("Maths", "Rounds up to the nearest multiple.", "CEILING(number, [multiple])", "=CEILING(23, 5)", "round up multiple"),
  FLOOR: I("Maths", "Rounds down to the nearest multiple.", "FLOOR(number, [multiple])", "=FLOOR(23, 5)", "round down multiple"),
  PI: I("Maths", "The number π (3.14159…).", "PI()", "=PI()*2^2", "circle"),
  RAND: I("Maths", "A random number from 0 up to 1. Changes on every edit.", "RAND()", "=RAND()", "random"),
  RANDBETWEEN: I("Maths", "A random whole number between two numbers.", "RANDBETWEEN(bottom, top)", "=RANDBETWEEN(1, 100)", "random dice"),
  SUMPRODUCT: I("Maths", "Multiplies ranges item by item and adds the results.", "SUMPRODUCT(array1, [array2], …)", "=SUMPRODUCT(B2:B5, C2:C5)", "weighted total multiply"),
  SUMSQ: I("Maths", "Adds up the squares of numbers.", "SUMSQ(number1, …)", "=SUMSQ(A1:A3)"),
  IF: I("Logic", "Gives one answer when a test is true and another when it is false.", "IF(test, value_if_true, [value_if_false])", '=IF(B2>=50, "Pass", "Fail")', "condition when else"),
  IFS: I("Logic", "Checks tests in order and gives the answer of the first true one.", "IFS(test1, value1, [test2, value2], …)", '=IFS(B2>=80, "A", B2>=60, "B", TRUE, "C")', "grades conditions"),
  IFERROR: I("Logic", "Shows something else when a formula gives an error.", "IFERROR(value, value_if_error)", '=IFERROR(A2/B2, 0)', "error hide"),
  IFNA: I("Logic", "Shows something else when a formula gives #N/A.", "IFNA(value, value_if_na)", '=IFNA(VLOOKUP(A2, D:E, 2, FALSE), "Not found")', "not found"),
  AND: I("Logic", "TRUE when every test is true.", "AND(test1, [test2], …)", "=AND(B2>0, C2>0)", "all both"),
  OR: I("Logic", "TRUE when at least one test is true.", "OR(test1, [test2], …)", '=OR(B2="Paid", C2=0)', "any either"),
  XOR: I("Logic", "TRUE when an odd number of tests are true.", "XOR(test1, [test2], …)", "=XOR(B2>0, C2>0)", "exclusive"),
  NOT: I("Logic", "Turns TRUE into FALSE and FALSE into TRUE.", "NOT(test)", '=NOT(B2="Paid")', "opposite"),
  TRUE: I("Logic", "The value TRUE.", "TRUE()", "=TRUE()"),
  FALSE: I("Logic", "The value FALSE.", "FALSE()", "=FALSE()"),
  NA: I("Logic", "The #N/A error (value not available).", "NA()", "=NA()"),
  SUMIF: I("Conditional totals", "Adds up the numbers that match one condition.", "SUMIF(range, condition, [sum_range])", '=SUMIF(B2:B20, "Sales", C2:C20)', "total add condition if criteria"),
  SUMIFS: I("Conditional totals", "Adds up the numbers that match several conditions.", "SUMIFS(sum_range, range1, condition1, …)", '=SUMIFS(D2:D20, B2:B20, "Sales", C2:C20, ">1000")', "total add conditions criteria"),
  COUNTIF: I("Conditional totals", "Counts the cells that match one condition.", "COUNTIF(range, condition)", '=COUNTIF(F2:F40, "P")', "how many count condition criteria"),
  COUNTIFS: I("Conditional totals", "Counts the rows that match several conditions.", "COUNTIFS(range1, condition1, …)", '=COUNTIFS(B2:B20, "IT", C2:C20, ">50000")', "how many count conditions"),
  AVERAGEIF: I("Conditional totals", "Averages the numbers that match one condition.", "AVERAGEIF(range, condition, [average_range])", '=AVERAGEIF(B2:B20, "Sales", C2:C20)', "mean condition criteria"),
  AVERAGEIFS: I("Conditional totals", "Averages the numbers that match several conditions.", "AVERAGEIFS(average_range, range1, condition1, …)", '=AVERAGEIFS(C2:C20, B2:B20, "IT")', "mean conditions criteria"),
  MAXIFS: I("Conditional totals", "The largest number that matches the conditions.", "MAXIFS(max_range, range1, condition1, …)", '=MAXIFS(C2:C20, B2:B20, "Sales")', "highest condition"),
  MINIFS: I("Conditional totals", "The smallest number that matches the conditions.", "MINIFS(min_range, range1, condition1, …)", '=MINIFS(C2:C20, B2:B20, "Sales")', "lowest condition"),
  VLOOKUP: I("Lookup", "Finds a value in the first column of a table and gives a value from the same row.", "VLOOKUP(value, table, column_number, [approximate])", '=VLOOKUP("Pen", A2:C20, 3, FALSE)', "find search table price"),
  HLOOKUP: I("Lookup", "Finds a value in the first row of a table and gives a value from the same column.", "HLOOKUP(value, table, row_number, [approximate])", '=HLOOKUP("Mar", A1:M3, 2, FALSE)', "find search row"),
  XLOOKUP: I("Lookup", "Finds a value in one range and gives the matching value from another range.", "XLOOKUP(value, look_in, return_from, [if_not_found], [match_mode], [search_mode])", '=XLOOKUP("Pen", A2:A20, C2:C20, "Not found")', "find search modern"),
  INDEX: I("Lookup", "The value at a row and column of a range.", "INDEX(range, row, [column])", "=INDEX(A2:C20, 3, 2)", "position pick"),
  MATCH: I("Lookup", "The position of a value in a list.", "MATCH(value, list, [match_type])", '=MATCH("Pen", A2:A20, 0)', "position find where"),
  CHOOSE: I("Lookup", "Picks a value from a list by its number.", "CHOOSE(number, value1, value2, …)", '=CHOOSE(2, "Low", "Medium", "High")', "pick option"),
  ROWS: I("Lookup", "How many rows a range has.", "ROWS(range)", "=ROWS(A2:A20)"),
  COLUMNS: I("Lookup", "How many columns a range has.", "COLUMNS(range)", "=COLUMNS(A1:F1)"),
  ROW: I("Lookup", "The row number of a cell.", "ROW([cell])", "=ROW(B7)"),
  COLUMN: I("Lookup", "The column number of a cell.", "COLUMN([cell])", "=COLUMN(D2)"),
  LEN: I("Text", "How many characters a text has.", "LEN(text)", "=LEN(A2)", "length characters"),
  LEFT: I("Text", "The first characters of a text.", "LEFT(text, [count])", "=LEFT(A2, 3)", "start beginning"),
  RIGHT: I("Text", "The last characters of a text.", "RIGHT(text, [count])", "=RIGHT(A2, 4)", "end"),
  MID: I("Text", "Characters from the middle of a text.", "MID(text, start, count)", "=MID(A2, 4, 3)", "middle part"),
  UPPER: I("Text", "TEXT IN CAPITAL LETTERS.", "UPPER(text)", "=UPPER(A2)", "capital caps"),
  LOWER: I("Text", "text in small letters.", "LOWER(text)", "=LOWER(A2)", "small"),
  PROPER: I("Text", "Capital First Letter Of Each Word.", "PROPER(text)", "=PROPER(A2)", "title case names"),
  TRIM: I("Text", "Removes extra spaces.", "TRIM(text)", "=TRIM(A2)", "spaces clean"),
  CONCAT: I("Text", "Joins texts and ranges together.", "CONCAT(text1, …)", '=CONCAT(A2, " ", B2)', "join combine merge"),
  CONCATENATE: I("Text", "Joins texts together.", "CONCATENATE(text1, …)", '=CONCATENATE(A2, " ", B2)', "join combine merge"),
  TEXTJOIN: I("Text", "Joins texts with a separator, optionally skipping empty cells.", "TEXTJOIN(separator, skip_empty, text1, …)", '=TEXTJOIN(", ", TRUE, A2:A10)', "join list comma"),
  SUBSTITUTE: I("Text", "Replaces some text with other text.", "SUBSTITUTE(text, old, new, [which])", '=SUBSTITUTE(A2, "-", " ")', "replace swap"),
  REPLACE: I("Text", "Replaces characters at a position.", "REPLACE(text, start, count, new)", '=REPLACE(A2, 1, 3, "PK-")', "swap position"),
  FIND: I("Text", "Where a text starts inside another text (matches capital letters exactly).", "FIND(find, in_text, [start])", '=FIND("@", A2)', "position search"),
  SEARCH: I("Text", "Where a text starts inside another text (ignores capitals, allows * and ?).", "SEARCH(find, in_text, [start])", '=SEARCH("khan", A2)', "position find contains"),
  TEXT: I("Text", "Shows a number as text in a format.", "TEXT(value, format)", '=TEXT(B2, "#,##0.00")', "format date money"),
  VALUE: I("Text", "Turns text that looks like a number into a number.", "VALUE(text)", '=VALUE("1,250")', "convert number"),
  REPT: I("Text", "Repeats a text a number of times.", "REPT(text, times)", '=REPT("*", 5)', "repeat"),
  EXACT: I("Text", "TRUE when two texts are exactly the same (capitals count).", "EXACT(text1, text2)", "=EXACT(A2, B2)", "compare same"),
  TODAY: I("Dates", "Today's date.", "TODAY()", "=TODAY()", "date now current"),
  NOW: I("Dates", "The date and time now.", "NOW()", "=NOW()", "time current"),
  DATE: I("Dates", "A date from a year, month and day.", "DATE(year, month, day)", "=DATE(2025, 8, 14)", "make date"),
  YEAR: I("Dates", "The year of a date.", "YEAR(date)", "=YEAR(A2)"),
  MONTH: I("Dates", "The month of a date (1 to 12).", "MONTH(date)", "=MONTH(A2)"),
  DAY: I("Dates", "The day of the month of a date.", "DAY(date)", "=DAY(A2)"),
  HOUR: I("Dates", "The hour of a time (0 to 23).", "HOUR(time)", "=HOUR(A2)"),
  MINUTE: I("Dates", "The minute of a time.", "MINUTE(time)", "=MINUTE(A2)"),
  SECOND: I("Dates", "The second of a time.", "SECOND(time)", "=SECOND(A2)"),
  WEEKDAY: I("Dates", "The day of the week as a number (1 = Sunday unless you choose another type).", "WEEKDAY(date, [type])", "=WEEKDAY(A2, 2)", "day week monday sunday"),
  EDATE: I("Dates", "The same day some months before or after a date.", "EDATE(start, months)", "=EDATE(A2, 3)", "add months"),
  EOMONTH: I("Dates", "The last day of the month, some months before or after a date.", "EOMONTH(start, months)", "=EOMONTH(A2, 0)", "end month"),
  DAYS: I("Dates", "Days between two dates.", "DAYS(end, start)", "=DAYS(B2, A2)", "between difference"),
  DATEDIF: I("Dates", "Whole years, months or days between two dates.", 'DATEDIF(start, end, "Y" | "M" | "D" | "YM" | "MD" | "YD")', '=DATEDIF(A2, TODAY(), "Y")', "age years between difference"),
  NETWORKDAYS: I("Dates", "Working days (Monday to Friday) between two dates, minus holidays.", "NETWORKDAYS(start, end, [holidays])", "=NETWORKDAYS(A2, B2)", "work business days"),
  UNIQUE: I("Arrays", "The list without repeats (fills the cells below).", "UNIQUE(range, [by_column], [exactly_once])", "=UNIQUE(B2:B50)", "distinct remove duplicates"),
  SORT: I("Arrays", "A sorted copy of a range (fills the cells below).", "SORT(range, [column], [1 or -1], [by_column])", "=SORT(A2:C20, 3, -1)", "order arrange"),
  FILTER: I("Arrays", "Only the rows that pass a test (fills the cells below).", "FILTER(range, test, [if_empty])", '=FILTER(A2:C20, B2:B20="Sales", "None")', "keep where rows"),
  SEQUENCE: I("Arrays", "A list of numbers counting up (fills the cells below).", "SEQUENCE(rows, [columns], [start], [step])", "=SEQUENCE(10)", "numbers series count"),
  TRANSPOSE: I("Arrays", "Turns rows into columns and columns into rows.", "TRANSPOSE(range)", "=TRANSPOSE(A1:D1)", "flip rotate"),
  PMT: I("Financial", "The payment each period for a loan (money paid out shows as a minus).", "PMT(rate, periods, loan, [future_value], [type])", "=PMT(16%/12, 36, 500000)", "loan instalment emi monthly payment"),
  IPMT: I("Financial", "The interest part of one loan payment.", "IPMT(rate, period, periods, loan, [future_value], [type])", "=IPMT(16%/12, 1, 36, 500000)", "interest loan"),
  PPMT: I("Financial", "The repayment (principal) part of one loan payment.", "PPMT(rate, period, periods, loan, [future_value], [type])", "=PPMT(16%/12, 1, 36, 500000)", "principal loan"),
  FV: I("Financial", "What savings grow to after regular payments.", "FV(rate, periods, payment, [present_value], [type])", "=FV(10%/12, 60, -5000)", "future savings grow"),
  PV: I("Financial", "What a stream of future payments is worth today.", "PV(rate, periods, payment, [future_value], [type])", "=PV(12%/12, 24, -10000)", "present value today"),
  NPER: I("Financial", "How many payments it takes to pay off a loan or reach a goal.", "NPER(rate, payment, present_value, [future_value], [type])", "=NPER(16%/12, -20000, 500000)", "months periods how long"),
  RATE: I("Financial", "The interest rate per period of a loan or investment.", "RATE(periods, payment, present_value, [future_value], [type], [guess])", "=RATE(36, -17579, 500000)*12", "interest rate"),
  NPV: I("Financial", "Net present value of future cash flows at a discount rate.", "NPV(rate, value1, [value2], …)", "=NPV(10%, B2:B6)", "investment cash flow"),
  IRR: I("Financial", "The rate of return of cash flows (first one is usually negative).", "IRR(values, [guess])", "=IRR(B2:B7)", "return investment"),
  SLN: I("Financial", "Straight-line depreciation for one period.", "SLN(cost, salvage, life)", "=SLN(120000, 20000, 5)", "depreciation asset"),
  EFFECT: I("Financial", "The real yearly rate when interest is added several times a year.", "EFFECT(nominal_rate, periods_per_year)", "=EFFECT(12%, 12)", "annual rate"),
  CONVERT: I("Engineering", "Converts between units (length, weight, volume, time, area, speed, temperature).", "CONVERT(number, from_unit, to_unit)", '=CONVERT(10, "km", "mi")', "units km miles kg pounds celsius fahrenheit litres"),
  DEC2BIN: I("Engineering", "A whole number written in binary.", "DEC2BIN(number, [places])", "=DEC2BIN(10)", "binary"),
  BIN2DEC: I("Engineering", "A binary number as a normal number.", "BIN2DEC(binary)", '=BIN2DEC("1010")', "binary"),
  DEC2HEX: I("Engineering", "A whole number written in hexadecimal.", "DEC2HEX(number, [places])", "=DEC2HEX(255)", "hex"),
  HEX2DEC: I("Engineering", "A hexadecimal number as a normal number.", "HEX2DEC(hex)", '=HEX2DEC("FF")', "hex"),
  DEC2OCT: I("Engineering", "A whole number written in octal.", "DEC2OCT(number, [places])", "=DEC2OCT(64)", "octal"),
  OCT2DEC: I("Engineering", "An octal number as a normal number.", "OCT2DEC(octal)", '=OCT2DEC("100")', "octal"),
  MEDIAN: I("Statistics", "The middle number.", "MEDIAN(number1, …)", "=MEDIAN(B2:B20)", "middle"),
  MODE: I("Statistics", "The number that appears most often.", "MODE(number1, …)", "=MODE(B2:B20)", "most common frequent"),
  STDEV: I("Statistics", "Standard deviation of a sample.", "STDEV(number1, …)", "=STDEV(B2:B20)", "spread deviation"),
  VAR: I("Statistics", "Variance of a sample.", "VAR(number1, …)", "=VAR(B2:B20)", "spread"),
  STDEVP: I("Statistics", "Standard deviation of a whole population.", "STDEVP(number1, …)", "=STDEVP(B2:B20)", "spread deviation"),
  VARP: I("Statistics", "Variance of a whole population.", "VARP(number1, …)", "=VARP(B2:B20)", "spread"),
  LARGE: I("Statistics", "The k-th largest number (1 = largest).", "LARGE(range, k)", "=LARGE(B2:B20, 2)", "second highest top"),
  SMALL: I("Statistics", "The k-th smallest number (1 = smallest).", "SMALL(range, k)", "=SMALL(B2:B20, 2)", "second lowest bottom"),
  RANK: I("Statistics", "The rank of a number in a list (1 = largest unless order is 1).", "RANK(number, range, [order])", "=RANK(B2, B$2:B$20)", "position position place"),
  ISBLANK: I("Information", "TRUE when a cell is empty.", "ISBLANK(cell)", "=ISBLANK(A2)", "empty check"),
  ISNUMBER: I("Information", "TRUE when a value is a number.", "ISNUMBER(value)", "=ISNUMBER(A2)", "check number"),
  ISTEXT: I("Information", "TRUE when a value is text.", "ISTEXT(value)", "=ISTEXT(A2)", "check text"),
  ISLOGICAL: I("Information", "TRUE when a value is TRUE or FALSE.", "ISLOGICAL(value)", "=ISLOGICAL(A2)"),
  ISERROR: I("Information", "TRUE when a value is any error.", "ISERROR(value)", "=ISERROR(A2/B2)", "check error"),
  ISNA: I("Information", "TRUE when a value is the #N/A error.", "ISNA(value)", '=ISNA(MATCH("x", A:A, 0))', "not found"),
  ISEVEN: I("Information", "TRUE when a number is even.", "ISEVEN(number)", "=ISEVEN(A2)"),
  ISODD: I("Information", "TRUE when a number is odd.", "ISODD(number)", "=ISODD(A2)"),
};
export const CATEGORIES = [...new Set(Object.values(FUNCTION_INFO).map((f) => f.cat))];

const STOP = new Set(["a", "an", "the", "of", "to", "in", "on", "with", "and", "or", "for", "by", "is", "are", "that", "it", "my", "i", "want", "how", "what", "do", "from"]);
/** Functions matching a search ("vlookup", "average with a condition", "days between dates"), best first. */
export function searchFunctions(query) {
  const q = String(query || "").trim().toLowerCase();
  const all = Object.entries(FUNCTION_INFO).map(([name, f]) => ({ name, ...f }));
  if (!q) return all;
  const words = q.split(/[^a-z0-9.]+/).filter((w) => w && !STOP.has(w));
  return all.map((f) => {
    const n = f.name.toLowerCase();
    let score = n === q ? 1000 : n.startsWith(q) ? 400 : n.includes(q) ? 200 : 0;
    const bag = (f.desc + " " + f.keys + " " + f.cat).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    for (const w of words) if (bag.some((b) => b === w || (w.length >= 4 && b.length >= 4 && (b.startsWith(w) || w.startsWith(b))))) score += 10;
    return { ...f, score };
  }).filter((f) => f.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/* ---------- formula builder ---------- */

export const OPS = [
  { id: "eq", label: "is equal to" }, { id: "ne", label: "is not equal to" }, { id: "gt", label: "is more than" }, { id: "lt", label: "is less than" },
  { id: "ge", label: "is at least" }, { id: "le", label: "is at most" }, { id: "contains", label: "contains" }, { id: "starts", label: "starts with" },
  { id: "ends", label: "ends with" }, { id: "blank", label: "is empty" }, { id: "notblank", label: "is not empty" },
];
export const BUILDER_TASKS = [
  { id: "sumif", label: "Add up a column with a condition", fields: [{ key: "sumRange", label: "Add up the numbers in", type: "range" }, { key: "critRange", label: "Only where the cells in", type: "range" }, { key: "op", type: "op" }, { key: "value", label: "Value", type: "text" }] },
  { id: "lookup", label: "Look up a value", fields: [{ key: "find", label: "Find this value (or a cell like B2)", type: "text" }, { key: "inRange", label: "In this column", type: "range" }, { key: "returnRange", label: "And give the matching value from", type: "range" }, { key: "notFound", label: "If it is not found, show", type: "text", value: "Not found" }] },
  { id: "pctchange", label: "Percent change", fields: [{ key: "from", label: "Old value (cell)", type: "cell" }, { key: "to", label: "New value (cell)", type: "cell" }] },
  { id: "days", label: "Days between two dates", fields: [{ key: "start", label: "Start date (cell or date)", type: "cell" }, { key: "end", label: "End date (cell or date)", type: "cell" }, { key: "workdays", label: "Count working days only (Mon–Fri)", type: "check" }] },
  { id: "countif", label: "Count cells that match", fields: [{ key: "range", label: "Count the cells in", type: "range" }, { key: "op", type: "op" }, { key: "value", label: "Value", type: "text" }] },
  { id: "ifrules", label: "Show a word by a rule (IF)", fields: [{ key: "cell", label: "When cell", type: "cell" }, { key: "rules", type: "rules" }, { key: "otherwise", label: "Otherwise show", type: "text" }] },
];
const REF_RE = /^(?:(?:'[^']+'|[A-Za-z_][\w.]*)!)?\$?[A-Za-z]{1,3}\$?\d+$/;
const RANGE_RE = /^(?:(?:'[^']+'|[A-Za-z_][\w.]*)!)?(\$?[A-Za-z]{1,3}\$?\d+(:\$?[A-Za-z]{1,3}\$?\d+)?|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3})$/;
const quote = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const isNum = (v) => /^[-+]?(\d+\.?\d*|\.\d+)$/.test(String(v).trim());
/** A value typed in the builder as formula text: a cell stays a reference, numbers stay numbers, dates become DATE(), text gets quotes. */
export function literal(v) {
  const t = String(v ?? "").trim();
  if (REF_RE.test(t)) return t.toUpperCase().replace(/^(.*!)?/, (m) => m);
  if (/^=/.test(t)) return t.slice(1);
  if (isNum(t)) return String(+t);
  if (/^(TRUE|FALSE)$/i.test(t)) return t.toUpperCase();
  if (/^[A-Z]+\(.*\)$/i.test(t)) return t;
  const d = parseDateText(t);
  if (d !== null && /\d/.test(t) && Number.isInteger(d)) { const p = serialToParts(d); return `DATE(${p.y},${p.m},${p.d})`; }
  return quote(t);
}
const SYM = { eq: "=", ne: "<>", gt: ">", lt: "<", ge: ">=", le: "<=" };
/** Criteria argument for SUMIF / COUNTIF. */
export function criteriaArg(op, value) {
  const v = String(value ?? "").trim();
  if (op === "blank") return '""';
  if (op === "notblank") return '"<>"';
  const ref = REF_RE.test(v);
  if (op === "contains") return ref ? `"*"&${v}&"*"` : quote(`*${v}*`);
  if (op === "starts") return ref ? `${v}&"*"` : quote(`${v}*`);
  if (op === "ends") return ref ? `"*"&${v}` : quote(`*${v}`);
  if (op === "eq") return ref ? v : isNum(v) ? String(+v) : quote(v);
  return ref ? `"${SYM[op]}"&${v}` : quote(SYM[op] + v);
}
/** A test for IF: cell op value. */
export function conditionArg(cell, op, value) {
  const v = String(value ?? "").trim();
  if (op === "blank") return `${cell}=""`;
  if (op === "notblank") return `${cell}<>""`;
  if (op === "contains") return `ISNUMBER(SEARCH(${literal(v)},${cell}))`;
  if (op === "starts") return `LEFT(${cell},LEN(${literal(v)}))=${literal(v)}`;
  if (op === "ends") return `RIGHT(${cell},LEN(${literal(v)}))=${literal(v)}`;
  return `${cell}${SYM[op] || "="}${literal(v)}`;
}
/** Builds a formula for a builder task: { formula, fmt?, problem? } (problem = what to fix, in plain words). */
export function buildFormula(task, f = {}) {
  const need = (key, label, re = RANGE_RE) => { const v = String(f[key] ?? "").trim(); if (!v) throw new Error(`Fill in "${label}".`); if (re && !re.test(v)) throw new Error(`"${v}" is not a cell range like B2:B20.`); return v.toUpperCase().includes("!") ? v : v.toUpperCase(); };
  try {
    let formula, fmt;
    if (task === "sumif") formula = `=SUMIF(${need("critRange", "Only where the cells in")},${criteriaArg(f.op || "eq", f.value)},${need("sumRange", "Add up the numbers in")})`;
    else if (task === "countif") formula = `=COUNTIF(${need("range", "Count the cells in")},${criteriaArg(f.op || "eq", f.value)})`;
    else if (task === "lookup") {
      if (!String(f.find ?? "").trim()) throw new Error('Fill in "Find this value".');
      const nf = String(f.notFound ?? "").trim();
      formula = `=XLOOKUP(${literal(f.find)},${need("inRange", "In this column")},${need("returnRange", "And give the matching value from")}${nf ? "," + literal(nf) : ""})`;
    } else if (task === "pctchange") {
      const a = need("from", "Old value", REF_RE), b = need("to", "New value", REF_RE);
      formula = `=(${b}-${a})/${a}`; fmt = "percent";
    } else if (task === "days") {
      const s = String(f.start ?? "").trim(), e = String(f.end ?? "").trim();
      if (!s || !e) throw new Error("Fill in both dates.");
      const a = literal(s), b = literal(e);
      formula = f.workdays ? `=NETWORKDAYS(${a},${b})` : `=${b}-${a}`;
      fmt = "general";
    } else if (task === "ifrules") {
      const cell = need("cell", "When cell", REF_RE);
      const rules = (f.rules || []).filter((r) => r && (r.op === "blank" || r.op === "notblank" || String(r.value ?? "").trim() !== ""));
      if (!rules.length) throw new Error("Add at least one rule.");
      const other = String(f.otherwise ?? "").trim();
      const res = (r) => literal(r.result ?? "");
      if (rules.length === 1) formula = `=IF(${conditionArg(cell, rules[0].op, rules[0].value)},${res(rules[0])},${other ? literal(other) : '""'})`;
      else formula = `=IFS(${rules.map((r) => `${conditionArg(cell, r.op, r.value)},${res(r)}`).join(",")},TRUE,${other ? literal(other) : '""'})`;
    } else throw new Error("Pick what you want to do.");
    parse(formula);
    return { formula, fmt };
  } catch (e) {
    return { formula: "", problem: e instanceof FormulaError ? e.detail || "This formula is not complete." : e.message };
  }
}

/* ---------- explain a formula ---------- */

const OPWORDS = { "+": "plus", "-": "minus", "*": "times", "/": "divided by", "^": "to the power of", "&": "joined with", "=": "is equal to", "<>": "is not equal to", "<": "is less than", ">": "is greater than", "<=": "is at most", ">=": "is at least" };
function refWords(n) {
  const sheet = n.sheet ? ` on sheet ${n.sheet}` : "";
  if (n.type === "ref") return `cell ${colName(n.col)}${n.row + 1}${sheet}`;
  if (n.whole === "cols") return (n.c1 === n.c2 ? `column ${colName(n.c1)}` : `columns ${colName(n.c1)} to ${colName(n.c2)}`) + sheet;
  if (n.whole === "rows") return (n.r1 === n.r2 ? `row ${n.r1 + 1}` : `rows ${n.r1 + 1} to ${n.r2 + 1}`) + sheet;
  return `cells ${colName(n.c1)}${n.r1 + 1} to ${colName(n.c2)}${n.r2 + 1}${sheet}`;
}
function list(xs) { return xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]; }
function words(n) {
  switch (n.type) {
    case "num": return numToText(n.v);
    case "str": return quote(n.v);
    case "bool": return n.v ? "TRUE" : "FALSE";
    case "err": return n.v;
    case "empty": return "nothing";
    case "ref": case "range": return refWords(n);
    case "paren": return words(n.a);
    case "un": return n.op === "-" ? `minus ${words(n.a)}` : words(n.a);
    case "pct": return `${words(n.a)} percent`;
    case "bin": return `${words(n.l)} ${OPWORDS[n.op]} ${words(n.r)}`;
    case "array": return `the list {${n.rows.map((r) => r.join(", ")).join("; ")}}`;
    case "name": return `the unknown name "${n.v}"`;
    case "func": return funcWords(n);
    default: return "something";
  }
}
function funcWords(n) {
  const a = n.args.map(words), A = (i, d = "") => (n.args[i] && n.args[i].type !== "empty" ? a[i] : d);
  switch (n.name) {
    case "SUM": return `the total of ${list(a)}`;
    case "AVERAGE": return `the average of ${list(a)}`;
    case "MIN": return `the smallest number in ${list(a)}`;
    case "MAX": return `the largest number in ${list(a)}`;
    case "COUNT": return `how many numbers are in ${list(a)}`;
    case "COUNTA": return `how many filled cells are in ${list(a)}`;
    case "COUNTBLANK": return `how many empty cells are in ${a[0]}`;
    case "IF": return `if ${a[0]}, then ${A(1, "0")}, otherwise ${n.args.length > 2 ? A(2, "0") : "FALSE"}`;
    case "IFS": { const parts = []; for (let i = 0; i + 1 < a.length; i += 2) parts.push(n.args[i].type === "bool" && n.args[i].v ? `otherwise ${a[i + 1]}` : `${a[i + 1]} if ${a[i]}`); return `the first that applies of: ${parts.join("; ")}`; }
    case "IFERROR": return `${a[0]}, or ${a[1]} if that gives an error`;
    case "AND": return `whether all of these are true: ${list(a)}`;
    case "OR": return `whether any of these is true: ${list(a)}`;
    case "NOT": return `the opposite of ${a[0]}`;
    case "ROUND": return `${a[0]} rounded to ${A(1, "0")} decimal places`;
    case "ROUNDUP": return `${a[0]} rounded up to ${A(1, "0")} decimal places`;
    case "ROUNDDOWN": return `${a[0]} rounded down to ${A(1, "0")} decimal places`;
    case "SUMIF": return `the total of ${A(2, a[0])} where ${a[0]} matches ${a[1]}`;
    case "SUMIFS": { const c = []; for (let i = 1; i + 1 < a.length; i += 2) c.push(`${a[i]} matches ${a[i + 1]}`); return `the total of ${a[0]} where ${list(c)}`; }
    case "COUNTIF": return `how many cells in ${a[0]} match ${a[1]}`;
    case "COUNTIFS": { const c = []; for (let i = 0; i + 1 < a.length; i += 2) c.push(`${a[i]} matches ${a[i + 1]}`); return `how many rows where ${list(c)}`; }
    case "AVERAGEIF": return `the average of ${A(2, a[0])} where ${a[0]} matches ${a[1]}`;
    case "VLOOKUP": return `look up ${a[0]} in the first column of ${a[1]} and give the value from column ${a[2]} of it (${n.args[3] && words(n.args[3]) !== "TRUE" && n.args[3].v !== 1 ? "exact match" : "closest match"})`;
    case "HLOOKUP": return `look up ${a[0]} in the first row of ${a[1]} and give the value from row ${a[2]} of it`;
    case "XLOOKUP": return `look up ${a[0]} in ${a[1]} and give the matching value from ${a[2]}${A(3) ? `, or ${a[3]} if it is not found` : ""}`;
    case "INDEX": return `the value at row ${a[1]}${a[2] ? ` and column ${a[2]}` : ""} of ${a[0]}`;
    case "MATCH": return `the position of ${a[0]} in ${a[1]}`;
    case "LEN": return `the number of characters in ${a[0]}`;
    case "LEFT": return `the first ${A(1, "1")} characters of ${a[0]}`;
    case "RIGHT": return `the last ${A(1, "1")} characters of ${a[0]}`;
    case "CONCAT": case "CONCATENATE": return `${list(a)} joined together`;
    case "TODAY": return "today's date";
    case "NOW": return "the date and time now";
    case "DATE": return `the date ${a[2]}/${a[1]}/${a[0]} (day/month/year)`;
    case "DATEDIF": return `the number of ${{ '"Y"': "whole years", '"M"': "whole months", '"D"': "days" }[a[2].toUpperCase()] || "units " + a[2]} from ${a[0]} to ${a[1]}`;
    case "NETWORKDAYS": return `the working days from ${a[0]} to ${a[1]}`;
    case "TEXT": return `${a[0]} written in the format ${a[1]}`;
    case "UNIQUE": return `the values of ${a[0]} without repeats`;
    case "SORT": return `${a[0]} sorted`;
    case "FILTER": return `the rows of ${a[0]} where ${a[1]}`;
    default: {
      const info = FUNCTION_INFO[n.name];
      return `${n.name} of ${a.length ? list(a) : "nothing"}${info ? ` (${info.desc.replace(/\.$/, "").toLowerCase()})` : ""}`;
    }
  }
}
/** Explains a formula: { ok, summary, functions: [{ name, desc, syntax }] }. */
export function explainFormula(text) {
  const src = String(text || "").trim();
  if (!src.startsWith("=")) return { ok: false, summary: "This cell holds a plain value, not a formula. Formulas start with =.", functions: [] };
  let tree;
  try { tree = parse(src); } catch (e) { return { ok: false, summary: `This formula is not complete or can't be read: ${e.detail || "check the brackets and commas"}`, functions: [] }; }
  const names = [];
  (function walk(n) { if (!n) return; if (n.type === "func" && !names.includes(n.name)) names.push(n.name); (n.args || []).forEach(walk); walk(n.a); walk(n.l); walk(n.r); })(tree);
  let s = words(tree);
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return { ok: true, summary: (/^(If|Look)/.test(s) ? "" : "This works out ") + (/^(If|Look)/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1)) + ".", functions: names.map((nm) => ({ name: nm, desc: FUNCTION_INFO[nm]?.desc || "Not a function Sheets knows.", syntax: FUNCTION_INFO[nm]?.syntax || "" })) };
}

/* ---------- formulas from plain words (rules on this device, not AI) ---------- */

const AGG = [
  ["SUM", /\b(sum|total|add up|add|altogether)\b/],
  ["AVERAGE", /\b(average|mean|avg)\b/],
  ["SHARE", /\b(share|percent(age)?|proportion|%)\b/],
  ["COUNT", /\b(count|how many|number of)\b/],
  ["MAX", /\b(max(imum)?|highest|largest|biggest|most|top)\b/],
  ["MIN", /\b(min(imum)?|lowest|smallest|least|cheapest)\b/],
  ["LOOKUP", /\b(look ?up|find|what is the|what's the|get the)\b/],
];
const CMP = [
  ["ne", /\b(is not|isn't|is other than|not equal to|other than)\b|<>|!=/],
  ["ge", /\b(at least|or more|no less than)\b|>=/],
  ["le", /\b(at most|or less|no more than)\b|<=/],
  ["gt", /\b(greater than|more than|over|above|bigger than|higher than)\b|>/],
  ["lt", /\b(less than|under|below|smaller than|lower than)\b|</],
  ["contains", /\b(contains|containing|includes|including|has)\b/],
  ["eq", /\b(is|are|equals|equal to|=|for|in|of)\b/],
];
/**
 * Turns a plain request like "sum of Sales where City is Lahore" into a formula, using the table's column names.
 * ctx = { columns: [{ name, letter }], r1, r2 } (data rows, without the heading row).
 * Returns { formula, how, fmt? } or { problem }.
 */
export function wordsToFormula(text, ctx) {
  const t = String(text || "").trim().replace(/[?.!]+$/, "");
  if (!t) return { problem: 'Type what you want, like "sum of Sales where City is Lahore".' };
  const cols = (ctx?.columns || []).filter((c) => c.name);
  const range = (c) => `${c.letter}${ctx.r1}:${c.letter}${ctx.r2}`;
  // Longest column name found in a piece of text (or "column C" / a range like B2:B20).
  const findCol = (s) => {
    const low = " " + s.toLowerCase() + " ";
    let best = null;
    for (const c of cols) { const n = c.name.toLowerCase().trim(); if (n && low.includes(n) && (!best || n.length > best.name.length)) best = c; }
    if (best) return best;
    const m = /\bcolumn ([a-z]{1,3})\b/i.exec(s);
    if (m) return cols.find((c) => c.letter === m[1].toUpperCase()) || { name: "column " + m[1].toUpperCase(), letter: m[1].toUpperCase() };
    return null;
  };
  const lower = t.toLowerCase();
  const agg = (AGG.find(([, re]) => re.test(lower)) || [null])[0];
  if (!agg) return { problem: 'Start with what to work out: sum, average, count, highest, lowest, share or look up.' };
  const split = /\b(where|when|if|with|whose|that have|which have|have|for which)\b/i.exec(t);
  let main = split ? t.slice(0, split.index) : t, cond = split ? t.slice(split.index + split[0].length) : "";
  if (agg === "LOOKUP" && !cond) { const m = /\b(for|of)\s+(.+)$/i.exec(main); if (m) { cond = m[2]; main = main.slice(0, m.index); } }
  // "total Sales in Lahore": a value that appears in one of the columns becomes the condition.
  const colOfValue = (v) => cols.find((c) => ctx.values?.[c.letter]?.has(String(v).toLowerCase())) || null;
  if (!cond && agg !== "LOOKUP") { const m = /\b(in|for|from|at|by)\s+(.+)$/i.exec(main); if (m && colOfValue(m[2].trim())) { cond = m[2].trim(); main = main.slice(0, m.index); } }
  const target = findCol(main.replace(AGG.find(([n]) => n === agg)[1], " "));
  let crit = null;
  if (cond) {
    let ccol = findCol(cond);
    let rest = cond;
    if (ccol) rest = rest.replace(new RegExp(ccol.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
    const [op, ore] = CMP.find(([, re]) => re.test(rest)) || ["eq", null];
    let value = (ore ? rest.replace(ore, " ") : rest).replace(/^[\s,:]+|[\s,]+$/g, "").replace(/^(the|a|an)\s+/i, "").replace(/^["']|["']$/g, "").trim();
    value = value.replace(/^(is|are|was|were|be)\s+/i, "").replace(/^rs\.?\s*/i, "").replace(/,(?=\d{3}\b)/g, "").trim();
    if (!value) return { problem: "Say what to compare with, like “where City is Lahore” or “where Sales is more than 1000”." };
    if (!ccol && agg !== "LOOKUP") ccol = colOfValue(value);
    if (agg === "LOOKUP") {
      const key = ccol || cols[0];
      if (!target || !key) return { problem: "Name the column to give back and the value to look for, like “look up Price for Rice”." };
      return { formula: `=XLOOKUP(${literal(value)},${range(key)},${range(target)},"Not found")`, how: `Looks for ${value} in ${key.name} and gives the ${target.name} next to it.` };
    }
    if (!ccol) return { problem: `Which column should match “${value}”? Use one of: ${cols.map((c) => c.name).join(", ")}.` };
    crit = { col: ccol, op, value, arg: criteriaArg(op, value), words: `${ccol.name} ${{ eq: "is", ne: "is not", gt: "is more than", lt: "is less than", ge: "is at least", le: "is at most", contains: "contains" }[op]} ${value}` };
  }
  if (agg === "COUNT") {
    if (crit) return { formula: `=COUNTIF(${range(crit.col)},${crit.arg})`, how: `Counts the rows where ${crit.words}.` };
    if (!target) return { problem: `Count which column? Use one of: ${cols.map((c) => c.name).join(", ")}.` };
    return { formula: `=COUNTA(${range(target)})`, how: `Counts the filled cells in ${target.name}.` };
  }
  if (!target) return { problem: `Which column? Use one of: ${cols.map((c) => c.name).join(", ")}.` };
  const R = range(target);
  if (agg === "SUM") return crit ? { formula: `=SUMIF(${range(crit.col)},${crit.arg},${R})`, how: `Adds up ${target.name} where ${crit.words}.` } : { formula: `=SUM(${R})`, how: `Adds up ${target.name}.` };
  if (agg === "AVERAGE") return crit ? { formula: `=AVERAGEIF(${range(crit.col)},${crit.arg},${R})`, how: `The average of ${target.name} where ${crit.words}.` } : { formula: `=AVERAGE(${R})`, how: `The average of ${target.name}.` };
  if (agg === "MAX") return crit ? { formula: `=MAXIFS(${R},${range(crit.col)},${crit.arg})`, how: `The highest ${target.name} where ${crit.words}.` } : { formula: `=MAX(${R})`, how: `The highest ${target.name}.` };
  if (agg === "MIN") return crit ? { formula: `=MINIFS(${R},${range(crit.col)},${crit.arg})`, how: `The lowest ${target.name} where ${crit.words}.` } : { formula: `=MIN(${R})`, how: `The lowest ${target.name}.` };
  if (agg === "SHARE") {
    if (!crit) return { problem: "Share of what? For example “share of Sales where City is Lahore”." };
    return { formula: `=SUMIF(${range(crit.col)},${crit.arg},${R})/SUM(${R})`, how: `The part of all ${target.name} where ${crit.words}.`, fmt: "percent" };
  }
  return { problem: "Try: sum of …, average of …, count where …, highest …, lowest …, share of … where …, look up … for …" };
}

/* ---------- why a formula gives an error, and a fix where there is a safe one ---------- */

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/** { why, fix?, fixLabel? } for an error code shown by a formula (input = the cell's formula). */
export function errorHint(code, input = "") {
  const f = String(input || ""), body = f.startsWith("=") ? f.slice(1) : f;
  switch (code) {
    case "#DIV/0!": return { why: "The formula divides by zero or by an empty cell.", fix: `=IFERROR(${body},0)`, fixLabel: "Show 0 instead" };
    case "#N/A": return { why: "A lookup did not find what it was looking for (check the spelling, or the value is missing).", fix: `=IFNA(${body},"Not found")`, fixLabel: "Show “Not found” instead" };
    case "#NAME?": {
      const names = [...body.matchAll(/([A-Za-z][A-Za-z0-9.]*)\s*\(/g)].map((m) => m[1].toUpperCase()).filter((n) => !FUNCTION_INFO[n]);
      if (names.length) {
        const bad = names[0], best = Object.keys(FUNCTION_INFO).map((n) => [n, editDistance(bad, n)]).sort((a, b) => a[1] - b[1])[0];
        if (best && best[1] <= Math.max(2, Math.floor(bad.length / 3))) return { why: `${bad} is not a function Sheets knows. Did you mean ${best[0]}?`, fix: "=" + body.replace(new RegExp(`\\b${bad}\\s*\\(`, "i"), best[0] + "("), fixLabel: `Use ${best[0]}` };
        return { why: `${bad} is not a function Sheets knows. Search the Formulas panel for the right one.` };
      }
      return { why: "There is a word the formula does not know. Text needs quotes, like \"Lahore\", and cell names look like B7." };
    }
    case "#REF!": return { why: "The formula points to a cell or sheet that was deleted. Undo the delete, or type the cell again." };
    case "#VALUE!": return { why: "Text was used where a number is needed (for example \"abc\"*2), or two ranges have different sizes.", fix: `=IFERROR(${body},"")`, fixLabel: "Hide the error" };
    case "#NUM!": return { why: "These numbers cannot work, for example the square root of a negative number or a result that is too big." };
    case "#SPILL!": return { why: "The answer needs more cells, but cells below or to the right are not empty. Clear them and it fills in." };
    case "#CIRC!": return { why: "The formula uses its own cell, directly or through other cells. Point it at other cells." };
    case "#CALC!": return { why: "FILTER found no rows to show.", fix: /^FILTER\(/i.test(body) && (body.match(/,/g) || []).length === 1 ? `=${body.replace(/\)\s*$/, ',"None")')}` : undefined, fixLabel: "Show “None” instead" };
    case "#ERROR!": {
      const open = (body.match(/\(/g) || []).length - (body.match(/\)/g) || []).length;
      const quotes = (body.match(/"/g) || []).length % 2;
      if (quotes) return { why: "A quote mark is not closed.", fix: f + '"' + (open > 0 ? ")".repeat(open) : ""), fixLabel: "Close the quotes" };
      if (open > 0) return { why: `The formula is missing ${open} closing bracket${open > 1 ? "s" : ""}.`, fix: f + ")".repeat(open), fixLabel: "Close the brackets" };
      if (/[-+*/^&,(]\s*$/.test(body)) return { why: "The formula ends with a sign or a comma; something is missing after it.", fix: "=" + body.replace(/[-+*/^&,(]+\s*$/, ""), fixLabel: "Remove the last sign" };
      return { why: "The formula cannot be read. Check the commas, brackets and quotes." };
    }
    default: return { why: "This formula gives an error." };
  }
}
