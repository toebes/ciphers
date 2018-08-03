/**
 * Compute the greatest common denominator between two numbers
 * @param a First number
 * @param b Second Number
 */
export function gcd(a: number, b: number): number {
    if (isNaN(a)) { return a }
    if (isNaN(b)) { return b }
    if (a < 0) { a = -a }
    if (b < 0) { b = -b }

    if (b > a) { let temp = a; a = b; b = temp; }
    while (true) {
        console.log('gcd a=' + a + ' b=' + b)
        if (b === 0) { return a }
        a %= b
        if (a === 0) { return b }
        b %= a
    }
}
export function isCoPrime(a: number, r: number): boolean {
    console.log('iscoprime a=' + a + ' r=' + r)
    let gcdval = gcd(a, r)
    console.log('gcd(' + a + ',' + r + ')=' + gcdval)
    if (gcdval !== 1) {
        return false
    }
    return true
}
