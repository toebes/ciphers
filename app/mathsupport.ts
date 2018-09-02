/**
 * Compute the greatest common denominator between two numbers
 * @param a First number
 * @param b Second Number
 */
export function gcd(a: number, b: number): number {
    if (isNaN(a)) {
        return a;
    }
    if (isNaN(b)) {
        return b;
    }
    if (a < 0) {
        a = -a;
    }
    if (b < 0) {
        b = -b;
    }

    if (b > a) {
        let temp = a;
        a = b;
        b = temp;
    }
    while (true) {
        if (b === 0) {
            return a;
        }
        a %= b;
        if (a === 0) {
            return b;
        }
        b %= a;
    }
}
/**
 * Determines if a number is CoPrime with another
 * @param a First Number
 * @param r Number to checn against
 */
export function isCoPrime(a: number, r: number): boolean {
    console.log("iscoprime a=" + a + " r=" + r);
    let gcdval = gcd(a, r);
    console.log("gcd(" + a + "," + r + ")=" + gcdval);
    if (gcdval !== 1) {
        return false;
    }
    return true;
}
/**
 * Compute the Mod 26 of a value, properly handling negative values
 * @param v Value to compute
 */
export function mod26(v: number): number {
    return ((v % 26) + 26) % 26;
}
export const modInverse26 = {
    1: 1,
    3: 9,
    5: 21,
    7: 15,
    9: 3,
    11: 19,
    15: 7,
    17: 23,
    19: 11,
    21: 5,
    23: 17,
};
/**
 * Compute the modular 26 inverse of a matrix
 * @param matrix 2x2 matrix of numbers
 */
export function mod26Inverse2x2(matrix: number[][]): number[][] {
    let result: number[][] = [];
    let a = matrix[0][0];
    let b = matrix[0][1];
    let c = matrix[1][0];
    let d = matrix[1][1];

    let det = mod26(a * d - b * c);
    if (typeof modInverse26[det] === undefined) {
        return [[]];
    }
    let inv = modInverse26[det];
    return [
        [mod26(d * inv), mod26(-b * inv)],
        [mod26(-c * inv), mod26(a * inv)],
    ];
    return result;
}
/**
 * I would really like to use: http://www.javascripter.net/faq/primefactors.txt
 * but the status of reuse is unclear.
 * @param candidate Number to test for primality
 */
export function isPrime(candidate: number): boolean {
    if (candidate % 2 === 0) {
        return false;
    }
    for (let i = 3, s = Math.sqrt(candidate); i <= s; i += 2) {
        if (candidate % i === 0) {
            return false;
        }
    }
    return candidate !== 1;
}
/**
 * Get the random integer between two numbers (inclusive)
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 *                         #Getting_a_random_integer_between_two_values_inclusive
 * @param min Lower limit of random number to generate
 * @param max Upper limit of random number to generate
 */
export function getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}
/**
 * Generate an odd random integer between two numbers (inclusive)
 * @param min Minimum value to return
 * @param max Maximum value to return
 */
export function getOddRandomIntInclusive(min: number, max: number): number {
    // Since we can skip all the even numbers, our possible range is half what they give us
    // Compute a random number in the range and then multiply it by 2.
    // Add it back to the minimum and then if the minumum wasn't already odd, add 1 to
    // make sure the result is odd
    let minhalf = Math.ceil(min / 2);
    let residual = 1 - Math.floor(min - minhalf * 2);
    let maxhalf = Math.floor(max / 2);
    let range = maxhalf - minhalf + 1;
    let result = (Math.floor(Math.random() * range) + minhalf) * 2 + residual;
    return result;
}
/**
 * This returns a random prime number with 'numDigits' digits.
 * The input must be a positive integer.  Note that this might run for
 * a very long time if we get unlucky or you are asking for something with more
 * then 6 digits
 * @param numDigits Number of digits (should be small)
 */
export function getRandomPrime(numDigits: number): number {
    let candidate = 0;
    candidate = getOddRandomIntInclusive(
        Math.pow(10, numDigits - 1),
        Math.pow(10, numDigits) - 1
    );
    let direction = 2;
    if (Math.random() > 0.5) {
        direction = -2;
    }
    while (!isPrime(candidate)) {
        candidate += direction;
    }
    return candidate;
}
/**
 * Compute the modular inverse of a number
 * From: https://stackoverflow.com/questions/26985808/calculating-the-modular-inverse-in-javascript
 * An alternate to consider is at https://stackoverflow.com/questions/23279208/rsa-calculate-d
 * @param a Number to compute
 * @param m Modulous
 */
export function modularInverse(a: number, m: number): number {
    // validate inputs
    [a, m] = [Number(a), Number(m)];
    if (Number.isNaN(a) || Number.isNaN(m)) {
        return NaN; // invalid input
    }
    a = ((a % m) + m) % m;
    if (!a || m < 2) {
        return NaN; // invalid input
    }
    // find the gcd
    const s = [];
    let b = m;
    while (b) {
        [a, b] = [b, a % b];
        s.push({ a, b });
    }
    if (a !== 1) {
        return NaN; // inverse does not exists
    }
    // find the inverse
    let x = 1;
    let y = 0;
    for (let i = s.length - 2; i >= 0; --i) {
        [x, y] = [y, x - y * Math.floor(s[i].a / s[i].b)];
    }
    return ((y % m) + m) % m;
}
