function QRBill () {}

QRBill = {
    iso7064_mod_97_10 (ref) {
        const ISO7064_MODULUS = 97;
        const MAX_TOTAL = 999999999;
        const LETTER_TO_NUMBER = {
            0: 0, 1: 1, 2: 2, 3: 3, 4: 4,
            5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
            a: 10, b: 11, c: 12, d: 13, e: 14, f: 15, 
            g: 16, h: 17, i: 18, j: 19, k: 20, l: 21,
            m: 22, n: 23, o: 24, p: 25, q: 26, r: 27,
            s: 28, t: 29, u: 30, v: 31, w: 32, x: 33,
            y: 34, z: 35, A: 10, B: 11, C: 12, D: 13,
            E: 14, F: 15, G: 16, H: 17, I: 18, J: 19,
            K: 20, L: 21, M: 22, N: 23, O: 24, P: 25,
            Q: 26, R: 27, S: 28, T: 29, U: 30, V: 31,
            W: 32, X: 33, Y: 34, Z: 35
        }
        let total = 0;
        for (i = 0; i < ref.length; i++) {
            if (LETTER_TO_NUMBER[ref.charAt(i)] !== undefined) { value = LETTER_TO_NUMBER[ref.charAt(i)]; }
            else { return -1 }
            total = (value > 9 ? total * 100 : total * 10) + value;
            if (total > MAX_TOTAL) {
                total = total % ISO7064_MODULUS;
            }
        }
        return total % ISO7064_MODULUS;
    },

    swiss_mod_10 (ref) {
        const bvr_table = [
            [0, 9, 4, 6, 8, 2, 7, 1, 3, 5],
            [9, 4, 6, 8, 2, 7, 1, 3, 5, 0],
            [4, 6, 8, 2, 7, 1, 3, 5, 0, 9],
            [6, 8, 2, 7, 1, 3, 5, 0, 9, 4],
            [8, 2, 7, 1, 3, 5, 0, 9, 4, 6],
            [2, 7, 1, 3, 5, 0, 9, 4, 6, 8],
            [7, 1, 3, 5, 0, 9, 4, 6, 8, 2],
            [1, 3, 5, 0, 9, 4, 6, 8, 2, 7],
            [3, 5, 0, 9, 4, 6, 8, 2, 7, 1],
            [5, 0, 9, 4, 6, 8, 2, 7, 1, 3]
        ];

        let r = 0;
        for (i = 0; i < ref.length; i++) {
            r = bvr_table[r][parseInt(ref.charAt(i))];
        }
        return [0, 9, 8, 7, 6, 5, 4, 3, 2, 1][r];
    },

    verify_qr_reference (reference) {
        reference = reference.replace(/\s/g, '');

        if (reference.substr(0, 2) === 'RF') {

        }
        
        if (reference.length < 27) { reference = reference.padStart(27, '0') }
        return QRBill.swiss_mod_10(reference.substr(0, 26)) === parseInt(reference.substr(26, 1))
    },

    verify_iban (iban) {
        if (iban.length <= 0) { return true }
        const ISO7064_MODULUS = 97;
        return QRBill.iso7064_mod_97_10(`${iban.substr(4)}${iban.substr(0, 4)}`) % ISO7064_MODULUS === 1
    },

    pretty_reference (reference) {
        if (!reference) { return '' }
        if (reference.length <= 0) { return '' }

        if (reference.substr(0, 2) === 'RF') {
            return `${reference.substr(0, 4)} ${reference.substr(4).padStart(21, '0').replace(/([A-Za-z0-9]{5})([A-Za-z0-9]{5})([A-Za-z0-9]{5})([A-Za-z0-9]{5})([A-Za-z0-9]{1})/, '$1 $2 $3 $4 $5')}`
        }
        return reference.replace(/\s/g, '').padStart(27, '0').replace(/(\d{2})(\d{5})(\d{5})(\d{5})(\d{5})(\d{5})/, '$1 $2 $3 $4 $5 $6')
    },

    ugly_reference (reference) {
        return reference.replace(/\s/g, '')
    }


}