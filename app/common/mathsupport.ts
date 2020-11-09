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
        const temp = a;
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
    // console.log("iscoprime a=" + a + " r=" + r);
    const gcdval = gcd(a, r);
    // console.log("gcd(" + a + "," + r + ")=" + gcdval);
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
    25: 25,
};

/**
 * Wrapper for 2x2 and 3x3 matrix inverse methods.
 * @param matrix
 */
export function mod26InverseMatrix(matrix: number[][]): number[][] {
    if (matrix[0].length === 2) {
        return this.mod26Inverse2x2(matrix);
    } else if (matrix[0].length === 3) {
        return this.mod26Inverse3x3(matrix);
    } else {
        return undefined;
    }
}
/**
 * Compute the modular 26 inverse of a matrix
 * @param matrix 2x2 matrix of numbers
 */
export function mod26Inverse2x2(matrix: number[][]): number[][] {
    const a = matrix[0][0];
    const b = matrix[0][1];
    const c = matrix[1][0];
    const d = matrix[1][1];

    const det = mod26(a * d - b * c);
    if (!modInverse26.hasOwnProperty(det)) {
        return [[]];
    }
    const inv = modInverse26[det];
    return [
        [mod26(d * inv), mod26(-b * inv)],
        [mod26(-c * inv), mod26(a * inv)],
    ];
}

/**
 * Compute the determinant of a 3x3 matrix.
 * Use https://en.wikipedia.org/wiki/Invertible_matrix under the
 * 'Inversion of 3x3 matrices' section.
 * @param matrix
 */
export function determinant3x3(matrix: number[][]): number {
    const a = matrix[0][0];
    const b = matrix[0][1];
    const c = matrix[0][2];
    const d = matrix[1][0];
    const e = matrix[1][1];
    const f = matrix[1][2];
    const g = matrix[2][0];
    const h = matrix[2][1];
    const i = matrix[2][2];

    return a * (e * i - h * f) - b * (d * i - g * f) + c * (d * h - g * e);
}
/**
 * Compute the modular 26 inverse of a 3x3 matrix
 * @param matrix 3x3 matrix of numbers
 */
export function mod26Inverse3x3(matrix: number[][]): number[][] {
    const a = matrix[0][0];
    const b = matrix[0][1];
    const c = matrix[0][2];
    const d = matrix[1][0];
    const e = matrix[1][1];
    const f = matrix[1][2];
    const g = matrix[2][0];
    const h = matrix[2][1];
    const i = matrix[2][2];

    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const D = -(b * i - c * h);
    const E = a * i - c * g;
    const F = -(a * h - b * g);
    const G = b * f - c * e;
    const H = -(a * f - c * d);
    const I = a * e - b * d;

    const determinant = mod26(determinant3x3(matrix));
    if (!modInverse26.hasOwnProperty(determinant)) {
        return [[]];
    }
    const inverseDeterminant = modInverse26[mod26(determinant)];

    return [
        [
            mod26(inverseDeterminant * A),
            mod26(inverseDeterminant * D),
            mod26(inverseDeterminant * G),
        ],
        [
            mod26(inverseDeterminant * B),
            mod26(inverseDeterminant * E),
            mod26(inverseDeterminant * H),
        ],
        [
            mod26(inverseDeterminant * C),
            mod26(inverseDeterminant * F),
            mod26(inverseDeterminant * I),
        ],
    ];
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
    const minhalf = Math.ceil(min / 2);
    const residual = 1 - Math.floor(min - minhalf * 2);
    const maxhalf = Math.floor(max / 2);
    const range = maxhalf - minhalf + 1;
    const result = (Math.floor(Math.random() * range) + minhalf) * 2 + residual;
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
    candidate = getOddRandomIntInclusive(Math.pow(10, numDigits - 1), Math.pow(10, numDigits) - 1);
    let direction = 2;
    if (Math.random() > 0.5) {
        direction = -2;
    }
    while (!isPrime(candidate)) {
        candidate += direction;
        // If we somehow went negative then we want to try again
        if (candidate < 0) {
            candidate = getOddRandomIntInclusive(
                Math.pow(10, numDigits - 1),
                Math.pow(10, numDigits) - 1
            );
        }
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

/**
 * Extract a sub-array from an array eliminating a specific row and column
 * From https://coderbyte.com/tutorial/determinant-of-a-matrix-in-javascript-using-laplace-expansion
 * @param a Array to extract sub-array
 * @param idx Index to slice
 */
export function deleteRowAndColumn(a: number[][], idx: number): number[][] {
    const temp = [];
    // copy the array first
    for (const row of a) {
        temp.push(row.slice(0));
    }
    // delete the first row
    temp.splice(0, 1);
    // delete the column at the index specified
    for (const row of temp) {
        row.splice(idx, 1);
    }
    return temp;
}

/**
 * Calculate the determinant of a 2x2 or 3x3 array.
 * @param a Array to get determinant of
 * @returns Determinant of the array
 */
export function determinant(a: number[][]): number {
    if (a.length === 2) {
        return a[0][0] * a[1][1] - a[0][1] * a[1][0];
    }
    let answer = 0;
    for (let i = 0; i < a.length; i++) {
        answer += Math.pow(-1, i) * a[0][i] * determinant(deleteRowAndColumn(a, i));
    }
    return answer;
}

/**
 * Multiply two arrays.  This function is limited to multiplying a 2x2 or 3x3
 * array by a corresponding 1 dimentional array of the same size.
 * @param a Array to multiply
 * @param m Vector to multiply
 */
export function multarray(a: number[][], m: number[]): number[] {
    const result: number[] = [];
    for (const row of a) {
        let sum = 0;
        for (let i = 0; i < row.length; i++) {
            sum += row[i] * m[i];
        }
        result.push(sum);
    }
    return result;
}
