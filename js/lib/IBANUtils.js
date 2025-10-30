const ISO7064_MODULUS = 97;
const ISO7064_MAX_TOTAL = 999999999;
const CHAR_NUMBER_MAPPING = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
  g: 16,
  h: 17,
  i: 18,
  j: 19,
  k: 20,
  l: 21,
  m: 22,
  n: 23,
  o: 24,
  p: 25,
  q: 26,
  r: 27,
  s: 28,
  t: 29,
  u: 30,
  v: 31,
  w: 32,
  x: 33,
  y: 34,
  z: 35,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15,
  G: 16,
  H: 17,
  I: 18,
  J: 19,
  K: 20,
  L: 21,
  M: 22,
  N: 23,
  O: 24,
  P: 25,
  Q: 26,
  R: 27,
  S: 28,
  T: 29,
  U: 30,
  V: 31,
  W: 32,
  X: 33,
  Y: 34,
  Z: 35,
};

export default class IBANUtils {
  /**
   * @param {String} iban
   * @return {number}
   */
  static iso7064mod97_10(iban) {
    if (typeof iban != "string") {
      iban = String(iban);
    }
    /* country code and checksum (first 4 digit are placed at the end) as required by std
     */
    iban = `${iban.substring(4)}${iban.substring(0, 4)}`;

    let total = 0;
    for (let i = 0; i < iban.length; i++) {
      const letter = iban.charAt(i);
      if (!CHAR_NUMBER_MAPPING[letter]) {
        return -1;
      }
      const value = CHAR_NUMBER_MAPPING[letter];
      total = (value > 9 ? total * 100 : total * 10) + value;
      if (total > ISO7064_MAX_TOTAL) {
        total = total % ISO7064_MODULUS;
      }
    }
    return total % ISO7064_MODULUS;
  }

  /**
   * @param {String} iban
   * @return {number}
   */
  static check(iban) {
    if (typeof iban != "string") {
      iban = String(iban);
    }
    const ck = IBANUtils.iso7064mod97_10(iban);
    return ck === -1 ? false : ck % ISO7064_MODULUS === 1;
  }
}
