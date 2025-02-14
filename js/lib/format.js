export default class format {
    static printf(fmt, ...vars)
    {
        let outString = ''
        let paramCount = 0
        fmt = fmt.split('')
        for(let i = 0; i < fmt.length; i++) {
            if (fmt[i] !== '%' || i + 1 >= fmt.length) { 
                outString += fmt[i]
                continue 
            }
            if (!vars[paramCount]) {
                outString += fmt[i]
                continue
            }
            switch(fmt[i+1]) {
                case 'c':
                case 's': outString += `${vars[paramCount++]}`; break;
                case 'd': outString += `${parseInt(vars[paramCount++])}`; break;
                case 'f': outString += `${parseFloat(vars[paramCount++])}`; break;
            }
            
            i++
        }
        return outString
    }
}