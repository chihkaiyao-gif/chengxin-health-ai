export const ecmaScriptWhitespaceCodePoints = [
  0x0009,
  0x000a,
  0x000b,
  0x000c,
  0x000d,
  0x0020,
  0x00a0,
  0x1680,
  0x2000,
  0x2001,
  0x2002,
  0x2003,
  0x2004,
  0x2005,
  0x2006,
  0x2007,
  0x2008,
  0x2009,
  0x200a,
  0x2028,
  0x2029,
  0x202f,
  0x205f,
  0x3000,
  0xfeff,
] as const;

export type EquipmentNormalizationCase = {
  name: string;
  input: string;
  expected: string;
};

const requiredCases: EquipmentNormalizationCase[] = [
  { name: "trim ASCII spaces", input: " ILWPD ", expected: "ilwpd" },
  { name: "lowercase is stable", input: "ilwpd", expected: "ilwpd" },
  { name: "NFKC fullwidth letters", input: "ＩＬＷＰＤ", expected: "ilwpd" },
  {
    name: "ideographic space",
    input: "Hammer　Strength",
    expected: "hammer strength",
  },
  { name: "collapse ASCII spaces", input: "D.Y.   Row", expected: "d.y. row" },
  { name: "em dash", input: "A—B", expected: "a-b" },
  { name: "en dash", input: "A–B", expected: "a-b" },
  { name: "fullwidth slash", input: "A／B", expected: "a/b" },
  { name: "leading and trailing tabs", input: "\tILWPD\t", expected: "ilwpd" },
  { name: "leading and trailing newlines", input: "\nILWPD\n", expected: "ilwpd" },
  { name: "leading and trailing carriage returns", input: "\rILWPD\r", expected: "ilwpd" },
  { name: "leading and trailing BOM", input: "\uFEFFILWPD\uFEFF", expected: "ilwpd" },
  { name: "leading and trailing NBSP", input: "\u00A0ILWPD\u00A0", expected: "ilwpd" },
  { name: "leading and trailing ideographic space", input: "　ILWPD　", expected: "ilwpd" },
  {
    name: "mixed whitespace",
    input: "\t\uFEFF Hammer\u00A0　Strength \r\n",
    expected: "hammer strength",
  },
];

const whitespaceCases = ecmaScriptWhitespaceCodePoints.map((codePoint) => ({
  name: `ECMAScript whitespace U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
  input: `${String.fromCodePoint(codePoint)}ILWPD${String.fromCodePoint(codePoint)}`,
  expected: "ilwpd",
}));

export const equipmentNormalizationCases: EquipmentNormalizationCase[] = [
  ...requiredCases,
  ...whitespaceCases,
];
