const hangulBaseCode = 0xac00;
const hangulEndCode = 0xd7a3;
const vowelCount = 21;
const finalCount = 28;

const initialKeys = [
  "r",
  "r",
  "s",
  "e",
  "e",
  "f",
  "a",
  "q",
  "q",
  "t",
  "t",
  "d",
  "w",
  "w",
  "c",
  "z",
  "x",
  "v",
  "g",
] as const;

const medialKeys = [
  "k",
  "o",
  "i",
  "o",
  "j",
  "p",
  "u",
  "p",
  "h",
  "hk",
  "ho",
  "hl",
  "y",
  "n",
  "nj",
  "np",
  "nl",
  "b",
  "m",
  "ml",
  "l",
] as const;

const finalKeys = [
  "",
  "r",
  "rr",
  "rt",
  "s",
  "sw",
  "sg",
  "e",
  "f",
  "fr",
  "fa",
  "fq",
  "ft",
  "fx",
  "fv",
  "fg",
  "a",
  "q",
  "qt",
  "t",
  "tt",
  "d",
  "w",
  "c",
  "z",
  "x",
  "v",
  "g",
] as const;

const jamoToQwerty: Record<string, string> = {
  ㄱ: "r",
  ㄲ: "r",
  ㄳ: "rt",
  ㄴ: "s",
  ㄵ: "sw",
  ㄶ: "sg",
  ㄷ: "e",
  ㄸ: "e",
  ㄹ: "f",
  ㄺ: "fr",
  ㄻ: "fa",
  ㄼ: "fq",
  ㄽ: "ft",
  ㄾ: "fx",
  ㄿ: "fv",
  ㅀ: "fg",
  ㅁ: "a",
  ㅂ: "q",
  ㅃ: "q",
  ㅄ: "qt",
  ㅅ: "t",
  ㅆ: "t",
  ㅇ: "d",
  ㅈ: "w",
  ㅉ: "w",
  ㅊ: "c",
  ㅋ: "z",
  ㅌ: "x",
  ㅍ: "v",
  ㅎ: "g",
  ㅏ: "k",
  ㅐ: "o",
  ㅑ: "i",
  ㅒ: "o",
  ㅓ: "j",
  ㅔ: "p",
  ㅕ: "u",
  ㅖ: "p",
  ㅗ: "h",
  ㅘ: "hk",
  ㅙ: "ho",
  ㅚ: "hl",
  ㅛ: "y",
  ㅜ: "n",
  ㅝ: "nj",
  ㅞ: "np",
  ㅟ: "nl",
  ㅠ: "b",
  ㅡ: "m",
  ㅢ: "ml",
  ㅣ: "l",
};

export function normalizeQwertyKeyboardInput(value: string) {
  let normalizedValue = "";

  for (const char of value) {
    normalizedValue += convertHangulToQwerty(char);
  }

  return normalizedValue;
}

function convertHangulToQwerty(char: string) {
  const code = char.charCodeAt(0);

  if (code >= hangulBaseCode && code <= hangulEndCode) {
    const offset = code - hangulBaseCode;
    const initialIndex = Math.floor(offset / (vowelCount * finalCount));
    const medialIndex = Math.floor((offset % (vowelCount * finalCount)) / finalCount);
    const finalIndex = offset % finalCount;

    return `${initialKeys[initialIndex]}${medialKeys[medialIndex]}${finalKeys[finalIndex]}`;
  }

  return jamoToQwerty[char] ?? char;
}
