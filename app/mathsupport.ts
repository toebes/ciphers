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

export function mod26(v: number): number {
    return ((v % 26) + 26) % 26
}
export const modInverse26 = {
    1: 1, 3: 9, 5: 21, 7: 15, 9: 3, 11: 19, 15: 7, 17: 23, 19: 11, 21: 5, 23: 17
}
export function mod26Inverse2x2(matrix: number[][]): number[][] {
    let result: number[][] = []
    let a = matrix[0][0]
    let b = matrix[0][1]
    let c = matrix[1][0]
    let d = matrix[1][1]

    let det = mod26((a * d) - (b * c))
    if (typeof modInverse26[det] === undefined) {
        return [[]]
    }
    let inv = modInverse26[det]
    return [[mod26(d * inv), mod26(-b * inv)], [mod26(-c * inv), mod26(a * inv)]]
    return result
}
