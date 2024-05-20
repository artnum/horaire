export class base26 {
    static encode(num) {
        let result = ''
        for (let i = num; i >= 0;)  {
            result = String.fromCharCode(65 + (i % 26)) + result
            i = Math.floor(i / 26) - 1
        }
        return result.toUpperCase()
    }

    static decode(str) {
        str = str.toUpperCase()
        let result = 0
        for (let i = 0; i < str.length; i++) {
            result = (result * 26) + (str.charCodeAt(i) - 64)
        }
        return result - 1
    }
}