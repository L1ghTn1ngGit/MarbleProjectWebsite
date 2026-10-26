const EXACT_DISPLAY_REPLACEMENTS = [
  [
    /^CONTRACT SCHOOLS\/FOSTER\/CH 683 PMTS$/i,
    "Contract Schools / Foster / Chapter 683 Payments",
  ],
  [/^CONTRACT SCHOOLS \(IN STATE\)$/i, "Contract Schools (In State)"],
  [/^CONTRACT SCHOOLS \(OUT STATE\)$/i, "Contract Schools (Out of State)"],
  [/^UNIVERSAL PRE\s*-\s*K(?: .*)?$/i, "Universal Pre-K"],
  [/^PRE\s*-\s*K(?: .*)?$/i, "Pre-K"],
  [/^CITY\s+WIDE(?: .*)?$/i, "Citywide"],
  [/^OFF\.\s+OF(?: .*)?$/i, "Office of"],
  [/^OFF\.(?: .*)?$/i, "Office"],
  [
    /^GE INSTR & SCH LEADERSHIP - PS$/i,
    "General Education Instruction & School Leadership - Personal Services",
  ],
  [
    /^GE INSTR & SCH LEADERSHIP - OTPS$/i,
    "General Education Instruction & School Leadership - Other Than Personal Services",
  ],
  [
    /^SE INSTR & SCH LEADERSHIP - PS$/i,
    "Special Education Instruction & School Leadership - Personal Services",
  ],
  [
    /^SE INSTR & SCH LEADERSHIP - OTPS$/i,
    "Special Education Instruction & School Leadership - Other Than Personal Services",
  ],
  [
    /^CW SE INSTR & SCHL LEADERSHIP - PS$/i,
    "Citywide Special Education Instruction & School Leadership - Personal Services",
  ],
  [
    /^CW SE INSTR & SCHL LEADERSHIP - OTPS$/i,
    "Citywide Special Education Instruction & School Leadership - Other Than Personal Services",
  ],
  [/^FRINGE BENEFITS - PS$/i, "Fringe Benefits - Personal Services"],
  [/^PUPIL TRANSPORTATION - PS$/i, "Pupil Transportation - Personal Services"],
  [
    /^PUPIL TRANSPORTATION - OTPS$/i,
    "Pupil Transportation - Other Than Personal Services",
  ],
  [/^SCHOOL FACILITIES - PS$/i, "School Facilities - Personal Services"],
  [
    /^SCHOOL FACILITIES - OTPS$/i,
    "School Facilities - Other Than Personal Services",
  ],
  [/^SCHOOL SAFETY - PS$/i, "School Safety - Personal Services"],
  [/^SCHOOL SAFETY - OTPS$/i, "School Safety - Other Than Personal Services"],
  [/^SPECIAL EDUCATION(?: .*)?$/i, "Special Education"],
  [/^EARLY CHILDHOOD PROGRAMS(?: .*)?$/i, "Early Childhood Programs"],
  [/^COMMUNITY COLLEGE(?: .*)?$/i, "Community College"],
  [/^CHARTER SCHOOLS(?: .*)?$/i, "Charter Schools"],
  [/^CATEGORICAL PROGRAMS(?: .*)?$/i, "Categorical Programs"],
  [/^SCHOOL SUPPORT ORGANIZATION(?: .*)?$/i, "School Support Organization"],
];

const TOKEN_REPLACEMENTS = new Map([
  ["OTPS", "Other Than Personal Services"],
  ["PS", "Personal Services"],
  ["CWSPED", "Citywide Special Education"],
  ["CSE", "Committee on Special Education"],
  ["CPSE", "Committee on Preschool Special Education"],
  ["SPED", "Special Education"],
  ["GE", "General Education"],
  ["SE", "Special Education"],
  ["SCHL", "School"],
  ["SCH", "School"],
  ["INST", "Instruction"],
  ["INSTR", "Instruction"],
  ["ADMIN", "Administration"],
  ["MGT", "Management"],
  ["MGMT", "Management"],
  ["SUP", "Support"],
  ["SUPPORT", "Support"],
  ["LEADERSHP", "Leadership"],
  ["LEADERSHIP", "Leadership"],
  ["ELEM", "Elementary"],
  ["EL", "Elementary"],
  ["MID", "Middle"],
  ["JHS", "Junior High School"],
  ["HS", "High School"],
  ["PMTS", "Payments"],
  ["NPS", "Non-Public Schools"],
  ["DOE", "DOE"],
  ["NYC", "NYC"],
  ["FY", "Fiscal Year"],
  ["ARRA", "ARRA"],
  ["ARPA", "ARPA"],
  ["CRRSA", "CRRSA"],
  ["CDBG", "CDBG"],
  ["FEMA", "FEMA"],
  ["CBO", "Community-Based Organization"],
  ["PKC", "Pre-K"],
  ["PREK", "Pre-K"],
  ["PRE", "Pre"],
  ["K", "K"],
  ["CH", "Chapter"],
]);

export function normalizeLookupValue(value) {
  return (value || "")
    .toString()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toDisplayName(value) {
  const normalized = normalizeLookupValue(value);
  if (!normalized) return "Unknown";

  for (const [pattern, replacement] of EXACT_DISPLAY_REPLACEMENTS) {
    if (pattern.test(normalized)) return replacement;
  }

  return normalized
    .split(/(\s+|\/| - | -|-&|- |&)/)
    .map((part) => {
      if (
        !part ||
        /^\s+$/.test(part) ||
        part === "/" ||
        part.trim() === "-" ||
        part === "&"
      )
        return part;
      const token = part.trim();
      if (TOKEN_REPLACEMENTS.has(token.toUpperCase()))
        return TOKEN_REPLACEMENTS.get(token.toUpperCase());
      if (/^[A-Z0-9&]+$/.test(token)) {
        return token
          .toLowerCase()
          .split(/([&])/)
          .map((piece) => {
            if (piece === "&") return piece;
            return piece
              ? piece.charAt(0).toUpperCase() + piece.slice(1)
              : piece;
          })
          .join("");
      }
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join("")
    .replace(/\bPre\s*-\s*K\b/gi, "Pre-K")
    .replace(/\bCity\s+Wide\b/gi, "Citywide")
    .replace(/\bOff\.\s+Of\b/gi, "Office of")
    .replace(/\bOff\.\b/gi, "Office")
    .replace(/\bOf\b/g, "of")
    .replace(/\bAnd\b/g, "and")
    .replace(/\bFor\b/g, "for")
    .replace(/\bTo\b/g, "to")
    .replace(/\bIn\b/g, "in")
    .replace(/\bOn\b/g, "on")
    .replace(/\bAt\b/g, "at")
    .replace(/\bBy\b/g, "by")
    .replace(/\bWith\b/g, "with")
    .replace(/\bFrom\b/g, "from")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+\/\s+/g, " / ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getDepartmentDescription(value) {
  const name = toDisplayName(value).toLowerCase();
  if (name.includes("school safety")) return "Keeps schools safe and secure";
  if (name.includes("transport")) return "Handles student transportation";
  if (name.includes("special education"))
    return "Supports special education services";
  if (name.includes("early childhood"))
    return "Supports early childhood programs";
  if (name.includes("instruction") || name.includes("curriculum"))
    return "Supports teaching and curriculum";
  if (name.includes("budget") || name.includes("finance"))
    return "Manages budget and finance";
  if (name.includes("facilities") || name.includes("operations"))
    return "Handles buildings and operations";
  if (name.includes("charter")) return "Oversees charter schools";
  if (name.includes("community") || name.includes("youth"))
    return "Runs youth and community programs";
  if (name.includes("support organization"))
    return "Coordinates school support";
  return "DOE department or office";
}

export function getProgramDescription(value) {
  const name = toDisplayName(value).toLowerCase();
  if (!name) return "Budget program or line item";
  if (name.includes("carter cases"))
    return "Court-ordered placement and services";
  if (name.includes("pre-k") || name.includes("prekindergarten"))
    return "Pre-K funding and services";
  if (name.includes("fringe benefits")) return "Employee benefits";
  if (name.includes("transport")) return "Student transportation";
  if (name.includes("community schools")) return "School support program";
  if (name.includes("school support"))
    return "School support and administration";
  if (name.includes("charter")) return "Charter-school support";
  if (name.includes("instruction")) return "Teaching and classroom support";
  if (name.includes("special education")) return "Special education services";
  if (name.includes("grant") || name.includes("arpa") || name.includes("crrsa"))
    return "Grant or relief funding";
  return "Program or line item";
}

export function categorizeProgram(value) {
  const name = normalizeLookupValue(value).toLowerCase();
  if (
    name.includes("special education") ||
    name.includes("sped") ||
    name.includes("se ")
  )
    return "Special education";
  if (
    name.includes("pre-k") ||
    name.includes("earlylearn") ||
    name.includes("early childhood") ||
    name.includes("head start")
  )
    return "Early childhood";
  if (
    name.includes("youth") ||
    name.includes("after school") ||
    name.includes("beacon") ||
    name.includes("compass") ||
    name.includes("sonyc") ||
    name.includes("community")
  )
    return "Youth and community";
  if (
    name.includes("admin") ||
    name.includes("office") ||
    name.includes("central") ||
    name.includes("finance") ||
    name.includes("budget") ||
    name.includes("management")
  )
    return "Administration and finance";
  if (
    name.includes("transport") ||
    name.includes("safety") ||
    name.includes("security") ||
    name.includes("bus")
  )
    return "Safety and transportation";
  if (
    name.includes("lease") ||
    name.includes("facility") ||
    name.includes("maint") ||
    name.includes("custodial") ||
    name.includes("energy") ||
    name.includes("food service")
  )
    return "Operations and facilities";
  if (
    name.includes("grant") ||
    name.includes("arpa") ||
    name.includes("crrsa") ||
    name.includes("fema") ||
    name.includes("cdbg") ||
    name.includes("federal")
  )
    return "Grants and relief";
  if (
    name.includes("charter") ||
    name.includes("non-public") ||
    name.includes("nps")
  )
    return "Charter and non-public";
  if (
    name.includes("instruction") ||
    name.includes("school supervision") ||
    name.includes("teacher") ||
    name.includes("curriculum") ||
    name.includes("learning")
  )
    return "Core instruction";
  return "Other";
}

export function categorizeDepartment(value) {
  const name = normalizeLookupValue(value).toLowerCase();
  if (name.includes("special ed") || name.includes("sped"))
    return "Special education";
  if (name.includes("pre-k") || name.includes("early childhood"))
    return "Early childhood";
  if (
    name.includes("instruction") ||
    name.includes("school") ||
    name.includes("curriculum") ||
    name.includes("learning")
  )
    return "Core instruction";
  if (
    name.includes("safety") ||
    name.includes("transport") ||
    name.includes("maintenance") ||
    name.includes("operations") ||
    name.includes("facil") ||
    name.includes("cust")
  )
    return "Operations and facilities";
  if (
    name.includes("admin") ||
    name.includes("office") ||
    name.includes("finance") ||
    name.includes("management") ||
    name.includes("budget")
  )
    return "Administration and finance";
  if (
    name.includes("youth") ||
    name.includes("community") ||
    name.includes("student")
  )
    return "Youth and community";
  if (
    name.includes("charter") ||
    name.includes("non-public") ||
    name.includes("nps")
  )
    return "Charter and non-public";
  if (name.includes("grant") || name.includes("relief"))
    return "Grants and relief";
  if (name.includes("transport")) return "Safety and transportation";
  return "Other";
}
