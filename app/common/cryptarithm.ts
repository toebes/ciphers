import { makeFilledArray, BoolMap, NumberMap, repeatStr, StringMap } from '../common/ciphercommon';

enum CryptarithmType {
    Automatic,
    SquareRoot,
    CubeRoot,
    Multiplication,
    Division,
    Addition,
    Subtraction,
    Equations,
}

export interface cryptarithmForumlaItem {
    formula: string
    expected: string
    totalFormula: number;
    totalExpected: number;
    usedFormula: BoolMap
    newFormula: BoolMap
    usedExpected: BoolMap
    newExpected: BoolMap
}
export interface legalMap {
    [index: string]: number[];
}

export interface cryptarithmPossible {
    nonzeros: BoolMap
    currentVals: NumberMap
    legal: legalMap;

}

export interface cryptarithmLineItem {
    prefix: string;
    indent: number;
    content: string;
    class: string;
    formula: string;
    expected: string;
}

export interface cryptarithmParsed {
    base: number
    maxwidth: number
    usedletters: BoolMap
    lineitems: Array<cryptarithmLineItem>
    nonzeros: BoolMap
}

/**
 * Find all the possible values that a character can map to
 * @param parsed Parsed Cryptarighm structure
 * @param base Number base to operate in
 * @returns Legal map of all possible values that can be used
 */
export function buildLegal(parsed: cryptarithmParsed, base: number = 10) {
    const result: legalMap = {}
    for (const c in parsed.usedletters) {
        let first = 0;
        if (parsed.nonzeros[c]) {
            first = 1;
        }
        result[c] = [first];
        first++;
        for (; first < base; first++) {
            result[c].push(first)
        }
    }
    return result;
}
// For the sake of efficiency, we limit the maximum base to 16 and
// the maximum length of a string to 16 characters.  These can
// be increased.  MAX_BASE can be increased arbitrarily.

const MAX_BASE = 16;
const MAX_LEN = 16;
const DBG_SOLVE = false;

export function print_solution(number_map: NumberMap, map_count: NumberMap): void {
    let result = ''
    let extra = ''
    for (let c in number_map) {
        if (map_count[c] > 0) {
            result += extra + `${c}=${number_map[c]}`
            extra = " "
        }
    }
    console.log(result);
}

export function difficulty_conv(backtracks: number): number {
    // Return a difficulty rating based on the number of backtracks.
    if (backtracks <= 100) {
        return (1);
    }
    if (backtracks <= 600) {
        return (2);
    }
    if (backtracks <= 4000) {
        return (3);
    }
    if (backtracks <= 20000) {
        return (4);
    }
    return (5);
}

/**
 * Formats a number in the current base and returns a normalized version of it
 * @param val Value to convert
 * @param base Base to convert it in (default = 10)
 * @returns String representing the valiue in the given base
 */
export function basedStr(val: number, base: number = 10): string {
    return val.toString(base).toUpperCase();
}

/**
 * 
 * @returns NumberMap initialized with 0 for all uppercase alphabetic characters
 */
export function emptyAlphaMap(): NumberMap {
    const result: NumberMap = {};
    for (let c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        result[c] = 0
    }
    return result;
}

/**
 * This routine taken with permission from http://www.trumancollins.net/truman/alphamet/swp.C
 * which is the backend behind http://www.trumancollins.net/truman/alphamet/alpha_gen.shtml
 * and converted to Javascript.
 * 
 * This function will find solutions to the given alphametic puzzle.
 * It returns the number of solutions found.  If just_one is set to
 * a non-zero value, the function will return after finding the first
 * solution.  If print is set to a non-zero value, each solution found
 * will be printed to stdout.
 * I have written this to be as fast as possible because one of its
 * intended uses is to check a huge number of potential puzzles for
 * ones that have a solution.  Because searches of this kind can be
 * very time consuming, even small efficiencies in this function are
 * significant.  Because of this, all of the work is done is this one
 * function, so it is very long.  I had previously written a recursive
 * version of this that was more easily understandable, but it was
 * significantly slower.
 * 
 * @param sumands Array of strings to sum in ascending length order
 * @param sum Sum string to target.  Must not be shorter than any of the sumands
 * @param base Number base to solve the problem in (default=10)
 * @param just_one true to leave after first solution, false to check for more than one solution
 * @param print true if results to be printed
 * @returns 
 */
export function cryptarithmSumandSearch(sumands: string[], sum: string, base: number = 10, just_one = false, print = false) {
    //    {
    let dbgmsg = "";
    let curr_char = '';
    let curr_smnd_row = 0;
    let letter_used: BoolMap = {};
    let max_carry: number[] = makeFilledArray(MAX_LEN, 0);
    const max_digit = base - 1;
    let needed_sum: number = 0;
    let value: number = 0;
    const columnChars: string[] = []


    // Initialize in case of an error.
    let difficulty = 0;
    let total_letters_used = 0;

    // Figure out the length of the sum and at the same time count
    // the different characters used in the sum.  We will later
    // add to this count to find the number of different letters
    // used in the whole puzzle.

    let sum_length = sum.length
    for (let ch_p of sum) {
        if (letter_used[ch_p] !== true) {
            letter_used[ch_p] = true;
            total_letters_used += 1;
        }
    }

    // See if any of the strings is too long.  If so print message
    // and return zero.

    if (sum_length > MAX_LEN) {
        console.log(`Sumand must all be ${MAX_LEN} characters or less.`);
        return (0);
    }
    for (const sumstr of sumands) {
        if (sumstr.length > MAX_LEN) {
            console.log(`Words must all be ${MAX_LEN} characters or less.`);
            return;
        }
        // If a summand is longer than the sum, then there is no solution.
        if (sumstr.length > sum_length) {
            return (0);
        }
    }

    for (let col = 0; col < sum_length; col++) {
        columnChars.push("")
    }

    // Initialize column lengths and needed_carry to 0.
    let column_lengths = makeFilledArray(MAX_LEN + 1, 0)
    let needed_carry = makeFilledArray(MAX_LEN, 0);

    const number_map = emptyAlphaMap();
    // Initialize the array used to count mappings for each character.
    const map_count = emptyAlphaMap();

    // Initialize the lowest value for each character to be zero.  We
    // later set those letters at the front of strings to one.
    const zero_or_one_start = emptyAlphaMap();
    const max_value = emptyAlphaMap();
    const min_value = emptyAlphaMap();

    // Zero the array used to map numbers to characters.
    const letter_map = makeFilledArray(MAX_BASE, '');


    // Reformat summands.  We want the columns to match with the
    // sum string, but we want all of the letters crammed up to
    // the top rows.  For example:
    //
    //      I S      E N I S
    //      I T        A I T
    //    N O T   =>     O T
    //  E A S Y          S Y
    //      T O          T O
    //
    // We don't care what's in the other places since the
    // column_lengths array keeps us from accessing a character
    // that's not filled.
    // While we're doing this, we note those characters at the
    // front of the strings to insure that they can't be set
    // to zero.  We also count the number of different characters
    // in the puzzle.  We will use this to insure there aren't
    // more characters than digits.
    for (const sumand of sumands) {
        let sumand_length = sumand.length;
        for (let j = 0; j < sumand_length; j++) {
            const column = sum_length - (sumand_length - j);
            const curr_char = sumand[j]
            columnChars[column] += curr_char;
            column_lengths[column] = columnChars[column].length

            // Note which letters are used.

            if (letter_used[curr_char] !== true) {
                letter_used[curr_char] = true;
                total_letters_used++;
            }

            // If this is the first character in a string make sure it
            // can never be set to zero.

            if (j === 0) {
                zero_or_one_start[curr_char] = 1;
            }
        }
    }

    // Note that the first letter of the sum also can't be a zero.

    zero_or_one_start[sum[0]] = 1;

    // See if we have more letters than digits, in which case a
    // solution is impossible.

    if (total_letters_used > base) {
        return (0);
    }

    // Figure out what the maximum carry is from each column.
    // Note that the max carry from a specific column can depend
    // on the max carry on the column immediately to the right.
    // We initialize the max carry of the column one past the
    // last one to zero.
    // There is one possible improvement here and that is to do
    // some analysis of the letters in each column.  If they are
    // different, then the highest total from that row is a bit
    // less than the number of summands times the max digit.
    // This improvement is probably more expensive than it's
    // worth.

    max_carry[sum_length] = 0;
    for (let i = sum_length - 1; i >= 0; i--) {
        max_carry[i] = Math.trunc((max_digit * column_lengths[i] + max_carry[i + 1]) / base);
    }

    // When debugging, print out the summands in their new form.
    // if (DBG_SOLVE) {
    {
        for (let i = 0; i < sumands.length; i++) {
            let rowstr = ""
            for (let j = 0; j < MAX_LEN; j++) {
                let cc = " ";
                if (columnChars[j] !== undefined) {
                    cc = columnChars[j].charAt(i);
                }
                rowstr += cc;
            }
            console.log(rowstr)
        }
        console.log(repeatStr('-', sum_length))
        console.log(sum)
    }
    // Now all of the initialization is done and it is time to start
    // the analysis.  We start at the leftmost character in the sum
    // and work our way up the column of summands above.  When we get
    // to the top of it, we move to the next sum character and continue.
    // At each point we determine the possible values the current
    // character could take and for each one of these values, try all
    // downstream possibilities.  If we find a value for the topmost
    // summand in the rightmost column and no carry is required from
    // the next column, we have a solution.  When we run across a
    // dead end, we backtrack to the previous character.

    // We start with column 0 and the first move isn't a backtrack.

    let curr_column = 0;
    let backtrack = false;
    let backtrack_count = 0;
    let solutions_found = 0;
    while (1) {

        // See if we've found a solution

        if (curr_column == sum_length) {

            // This is only a solution if the needed carry here is zero.
            // Even if it isn't we need to backtrack from here.

            if (needed_carry[curr_column] === 0) {

                // Record that we found a solution and print it if desired.
                // backtrack to the previous column.

                solutions_found++;
                if (print) {
                    print_solution(number_map, map_count);
                }

                // If we just wanted to see if there were any solutions,
                // return right now.

                if (just_one) {
                    return (1);
                }
            }

            // Backtrack and see if we can find another.

            curr_column--;
            curr_smnd_row = 0;
            backtrack = true;

            // We want to skip looking at the sum character in this column
            // because there isn't one.

        } else {

            // We're now working on the sum character in the
            // curr_column position.  There are two main
            // possibilities.  Either we are moving forward at this
            // time, or we are backtracking to this location.  If
            // we're moving forward, we either use a value chosen
            // earlier in the search for this letter, or if this is
            // the first occurance, select a value to try.  If we're
            // backtracking at this point, either select the next
            // available value for this letter, or if it already has a
            // value then backtrack more.  After dealing with the
            // value for this letter, we will either move forward and
            // investigate the values of the summands above, or we'll
            // backtrack again.

            curr_char = sum[curr_column];

            if (DBG_SOLVE) {
                let direction = "Forward"
                if (backtrack) {
                    direction = "Back";
                }
                dbgmsg = `${direction} to sum char ${curr_char}(${curr_column})...`;
            }

            if (backtrack) {

                // We got here by backtracking, so we assigned this character a
                // value the last time through.

                if (map_count[curr_char] == 1) {

                    // This was the first occurance of this character.  Since
                    // we've backtracked to here, try to find the next available
                    // number in the range.

                    value = number_map[curr_char];
                    letter_map[value] = '';
                    do {
                        value++;
                    } while (value <= max_value[curr_char] &&
                        letter_map[value] != ``);

                    if (value > max_value[curr_char]) {

                        // We didn't find an available number in the range so
                        // we want to backtrack from here.

                        backtrack = true;
                        backtrack_count++;
                        map_count[curr_char]--;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + "no more values in range.");
                            dbgmsg = '';
                        }

                    } else {

                        // Go forward with this new value.  No change in map_count
                        // for this character because we unmapped one and mapped
                        // another.

                        backtrack = false;
                        letter_map[value] = curr_char;
                        number_map[curr_char] = value;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + `next value in range: ${value}`);
                            dbgmsg = ''
                        }
                    }

                } else {

                    // Since there is another one of these characters mapped
                    // behind us, we can't change the mapping here.  We want
                    // to backtrack.  Decrement the number of times this
                    // character has been mapped.  The letter itself is still
                    // mapped from a previous character.

                    backtrack = true;
                    backtrack_count++;
                    map_count[curr_char]--;

                    if (DBG_SOLVE) {
                        console.log(dbgmsg + `previously mapped character.`);
                        dbgmsg = ''
                    }
                }

            } else {

                // Here, we've moved forward to this sum character.

                if (needed_carry[curr_column] > max_carry[curr_column]) {

                    // Since we can't possibly get a carry this large, backtrack.

                    backtrack = true;
                    backtrack_count++;

                    if (DBG_SOLVE) {
                        console.log(dbgmsg + `none available ${needed_carry[curr_column]} > ${max_carry[curr_column]}.`);
                        dbgmsg = '';
                    }

                } else {

                    if (map_count[curr_char]) {

                        // A value has already been chosen for this character.  Use
                        // it and move on.

                        value = number_map[curr_char];
                        map_count[curr_char]++;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + `previously chosen value ${value}`);
                            dbgmsg = ''
                        }

                    } else {

                        // Here no value has been chosen for this letter.  We
                        // will determine the range of values that could work
                        // for it and choose the first available to try.

                        // The min is always going to be either zero or one.
                        // It's one only if this letter is at the beginning of
                        // one of the words.  The max is a little more
                        // complicated.  It is the maximum that the summands in
                        // this column can add up to plus the maximum carry
                        // from the next column minus the needed carry times
                        // the base here.

                        min_value[curr_char] = zero_or_one_start[curr_char];
                        let max_possible = max_carry[curr_column + 1] +
                            max_digit * column_lengths[curr_column] -
                            needed_carry[curr_column] * base;
                        max_value[curr_char] = Math.min(max_digit, max_possible);

                        if (DBG_SOLVE) {
                            dbgmsg += `range chosen [${min_value[curr_char]}-${max_value[curr_char]}] `;
                        }

                        // Find the first available value in this range.  If there
                        // aren't any available, then we will backtrack.

                        value = min_value[curr_char];
                        while (value <= max_value[curr_char] &&
                            letter_map[value] != '') {
                            value++;
                        }

                        if (value > max_value[curr_char]) {

                            // We didn't find an available number in the range so
                            // we want to backtrack from here.

                            backtrack = true;
                            backtrack_count++;

                            if (DBG_SOLVE) {
                                console.log(dbgmsg + `none available.`);
                                dbgmsg = ''
                            }

                        } else {

                            backtrack = false;
                            map_count[curr_char]++;
                            letter_map[value] = curr_char;
                            number_map[curr_char] = value;

                            if (DBG_SOLVE) {
                                console.log(dbgmsg + `using ${value}`);
                                dbgmsg = ''
                            }
                        }
                    } // else
                } // else
            } // else

            // Okay, we've come to this sum character either by backtracking
            // or not and we've decided what to do from here.  Now we check
            // how the backtracking flag is set now to determine where to
            // go from here.  We make sure needed_sum is updated appropriately.

            if (backtrack) {

                // Move to the previous column and set to the summand with
                // index zero.  We set needed_sum to what the code for a
                // summand will expect.  We need to to check for a column
                // without summands

                needed_sum = needed_carry[curr_column];
                if (DBG_SOLVE) {
                    console.log(`Backtrack set need_sum=${needed_sum} for ${curr_column}`)
                }
                curr_column--;
                if (curr_column == -1 || column_lengths[curr_column] == 0) {
                    curr_smnd_row = -1;
                } else {
                    curr_smnd_row = 0;
                }

            } else {

                // Move on to the highest index summand in this column, and
                // compute the needed sum.  Also do some bookkeeping.

                curr_smnd_row = column_lengths[curr_column] - 1;
                needed_sum = value + base * needed_carry[curr_column];
                if (DBG_SOLVE) {
                    console.log(`Move on set needed_sum=${needed_sum} with value=${value} carry=${needed_carry[curr_column]} on ${curr_column}`)
                }

                // Check for no summands here.  If there aren't any,
                // curr_smnd_row will be set to -1 and we will skip the
                // summand work below and move directly to the next sum
                // character.  We have to update the needed carry for
                // the new column in this case.

                if (curr_smnd_row < 0) {
                    curr_column++;
                    needed_carry[curr_column] = needed_sum;
                    if (DBG_SOLVE) {
                        console.log(`Set needed_carry[${curr_column}]=${needed_sum} on ${curr_smnd_row}`);
                    }
                    continue;
                }
            }
        } // else

        // We now have a summand to look at.  The variable curr_column
        // indicates the column of the puzzle we're working on and the
        // variable curr_smnd_row indicates the specific summand letter
        // from zero to the number of summands minus one.  The other
        // relevant value here is needed_sum, which indicates the sum
        // required for the summands from this one up to index zero and
        // the carry from the next column.

        // First check if we've backtracked off the left end, in which
        // case we've checked all possibilities.

        if (curr_column == -1) {
            break;
        }

        // See if we're done.  If we've gone through all of the possibilities
        // for the first sum character, then we've tried it all.

        while (curr_smnd_row >= 0) {

            curr_char = columnChars[curr_column].charAt(curr_smnd_row)


            if (DBG_SOLVE) {
                if (backtrack) {
                    dbgmsg += ("Back");
                } else {
                    dbgmsg += ("Forward");
                }
                dbgmsg += ` to summand char ${curr_char}(${curr_column})...`;
            }

            // We need to see whether we came to the current character
            // moving forward or backtracking.

            if (backtrack) {

                // We backtracked here.

                if (map_count[curr_char] == 1) {

                    // This was the first occurance of this character.  Since
                    // we've backtracked to here, try to find the next available
                    // number in the range.

                    value = number_map[curr_char];
                    needed_sum += value;
                    dbgmsg += `First Occurrance of ${curr_char} needed_sum=${needed_sum} increment by ${value}...`
                    letter_map[value] = ``;
                    do {
                        value++;
                    } while (value <= max_value[curr_char] &&
                        letter_map[value] != ``);

                    if (value > max_value[curr_char]) {

                        // We didn't find an available number in the range so
                        // we want to backtrack from here.

                        backtrack = true;
                        backtrack_count++;
                        map_count[curr_char]--;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + `no more values in range.`);
                            dbgmsg = ''
                        }

                    } else {

                        // Go forward with this new value.

                        backtrack = false;
                        letter_map[value] = curr_char;
                        number_map[curr_char] = value;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + `next value in range: ${value}`);
                            dbgmsg = ''
                        }

                    }

                } else {

                    // Since there is another one of these characters mapped
                    // behind us, we can't change the mapping here.  We want
                    // to backtrack.

                    backtrack = true;
                    map_count[curr_char]--;
                    needed_sum += number_map[curr_char];

                    if (DBG_SOLVE) {
                        console.log(dbgmsg + `previously mapped character. needed_sum=${needed_sum} increment by ${number_map[curr_char]} of ${curr_char}`);
                        dbgmsg = ''
                    }
                }
            } else {

                // We are to move forward.

                if (map_count[curr_char]) {

                    // A value has already been chosen for this character.  Use
                    // it and move on.

                    value = number_map[curr_char];

                    // See if this value is too big or not.

                    if (value > needed_sum) {

                        backtrack = true;
                        backtrack_count++;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + `previously chosen value ${value} too large`);
                            dbgmsg = ''
                        }

                    } else {
                        map_count[curr_char]++;
                        backtrack = false;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + `previously chosen value ${value}`);
                            dbgmsg = ''
                        }
                    }

                } else {

                    // Here no value has been chosen for this letter.  We
                    // will determine the range of values that might work
                    // for it and choose the first available to try.

                    let min_possible = needed_sum - max_digit * curr_smnd_row - max_carry[curr_column + 1];
                    min_value[curr_char] = Math.max(min_possible, zero_or_one_start[curr_char]);
                    max_value[curr_char] = Math.min(max_digit, needed_sum);

                    if (DBG_SOLVE) {
                        dbgmsg += `range chosen [${min_value[curr_char]}-${max_value[curr_char]}] `;
                    }

                    // Find the first available value in this range.  If there
                    // aren't any available, then we will backtrack.

                    value = min_value[curr_char];
                    while (value <= max_value[curr_char] &&
                        letter_map[value] != ``) {
                        value++;
                    }

                    if (value > max_value[curr_char]) {

                        // We didn't find an available number in the range so
                        // we want to backtrack from here.

                        backtrack = true;
                        backtrack_count++;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + `none available.`);
                            dbgmsg = ''
                        }

                    } else {

                        backtrack = false;
                        map_count[curr_char]++;
                        letter_map[value] = curr_char;
                        number_map[curr_char] = value;

                        if (DBG_SOLVE) {
                            console.log(dbgmsg + `using ${value}`);
                            dbgmsg = ''
                        }
                    }
                } // else
            } // else

            // Now that we have decided whether we're moving forward
            // from here or backtracking, do the appropriate things.

            if (backtrack) {

                if (curr_smnd_row == column_lengths[curr_column] - 1) {

                    // We've backtracked all the way back to the sum.
                    // Just break out of the summand loop and we'll
                    // look at the sum.

                    break;

                } else {

                    // Go to the previous summand.  Note that needed_sum
                    // has already been updated.

                    curr_smnd_row++;
                }

            } else {

                if (curr_smnd_row == 0) {

                    // Set our focus to the next column.  Record what
                    // carry we need from there to make the column we
                    // just finished work correctly.  Either we are
                    // done, or we will next work on the sum character
                    // in the next column.  We break out of the summand
                    // loop.

                    curr_column++;
                    if (DBG_SOLVE) {
                        console.log(`Decrement needed_sum=${needed_sum} by ${value}`)
                    }
                    needed_sum -= value;
                    needed_carry[curr_column] = needed_sum;
                    if (DBG_SOLVE) {
                        console.log(`Set needed_carry[${curr_column}]=${needed_sum} with value=${value}`);
                    }
                    break;

                } else {

                    // Go to the next summand, and adjust the needed_sum.

                    curr_smnd_row--;
                    if (DBG_SOLVE) {
                        console.log(`Decrement2 needed_sum=${needed_sum} by ${value}`)
                    }
                    needed_sum -= value;
                }
            } // else
        } // while (summands)
    } // while (columns)

    // Return the number of solutions we found.  If we only cared if more
    // than one was found, we returned above.

    difficulty = difficulty_conv(backtrack_count);
    console.log(`${solutions_found} Solutions Found.  Difficulty=${difficulty}`)
    return (solutions_found);
}
// tslint:disable-next-line:cyclomatic-complexity
/**
 * Parse a cryptarithm formula into lines
 * @param str Cryptarithm string to parse
 * @param base Minimum base to use (default = 10)
 * @returns Array of cryptarithmLineItem representing the parsed data
 */
export function parseCryptarithm(str: string, base: number = 10): cryptarithmParsed {
    enum buildState {
        Initial = "Initial",
        WantRoot = "Want Root value",
        WantEqual = "Want = value",
        WantMinus = "Want - value",
        WantMult = "Want * value",
        WantDiv = "Want / value",
        WantPlus = "Want + value",
        WantQuotient = "Want Quotient",
        WantMultAdds = "Want * Additions",
        Idle = "Idle",
    }
    let cryptarithmType = CryptarithmType.Automatic;

    let result: cryptarithmParsed = {
        base: base,
        maxwidth: 0,
        lineitems: [],
        usedletters: {},
        nonzeros: {}
    }
    str = str.replace(new RegExp("gives root", "g"), "^");
    // Sometimes they use a different division sign
    str = str.replace(new RegExp("\xf7", "g"), "/"); //÷
    // Apparently there are two forms of dashes...
    str = str.replace(new RegExp("\u2013", "g"), "-"); //–
    // Oh yeah we have two forms of quotes too
    str = str.replace(new RegExp("\u2019", "g"), "'"); //’
    // Lastly get rid of all white space
    str = str.replace(new RegExp("[\r\n ]+", "g"), "");
    // Now tokenize the string so we can parse it
    let tokens = str.toUpperCase().split(/([;=+ \^\/\*\.\-])/g);
    let state: buildState = buildState.Initial;
    let indent: number = 0;
    let numwidth: number = 1;
    let prefix: string = "";
    let dividend: string = "";
    let divisor: string = "";
    let quotient: string = "";
    let formula: string = "";
    let expected: string = "";
    let lastval: string = "";
    let lastbase: string = "";
    let root: string = "";
    let rootbase: string = "";
    let multiplicand: string = "";
    let multiplier: string = "";
    let multval: string = "";

    for (let token of tokens) {
        switch (token) {
            case "":
            case " ":
                break;

            // Square root (this was originally "gives root" in the crytprithm)
            case "^":
                if (state !== buildState.Idle) {
                    console.log(
                        "Found token:" +
                        token +
                        " when already processing " +
                        prefix
                    );
                }
                if (cryptarithmType === CryptarithmType.Automatic) {
                    cryptarithmType = CryptarithmType.SquareRoot;
                }
                prefix = token;
                state = buildState.WantRoot;
                break;

            // End of an equation (and potentially the start of another)
            case ".":
                if (state !== buildState.Idle) {
                    console.log(
                        "Found token:" +
                        token +
                        " when already processing " +
                        prefix
                    );
                }
                // Put in a blank line
                result.lineitems.push({
                    prefix: "",
                    indent: 0,
                    content: "",
                    class: "",
                    formula: "",
                    expected: "",
                });
                prefix = "";
                state = buildState.Initial;
                break;

            // End of an operation group (generally after an = value)
            case ";":
                if (state !== buildState.Idle) {
                    console.log(
                        "Found token:" +
                        token +
                        " when already processing " +
                        prefix
                    );
                }
                prefix = "";
                state = buildState.Idle;
                break;

            case "-":
                if (state !== buildState.Idle) {
                    console.log(
                        "Found token:" +
                        token +
                        " when already processing " +
                        prefix
                    );
                }
                switch (cryptarithmType) {
                    case CryptarithmType.Automatic:
                        cryptarithmType = CryptarithmType.Subtraction;
                    case CryptarithmType.Subtraction:
                    case CryptarithmType.Addition:
                        lastbase = lastval + "-";
                        break;

                    case CryptarithmType.Division:
                        let mult = quotient.substr(
                            quotient.length - (indent + 1),
                            1
                        );
                        formula = mult + "*" + divisor;
                        lastbase = lastval;
                        break;

                    case CryptarithmType.SquareRoot:
                        let squarepart = root.substr(
                            0,
                            root.length - indent
                        );
                        let double = squarepart.substr(
                            0,
                            squarepart.length - 1
                        );
                        let squared = squarepart.substr(
                            squarepart.length - 1,
                            1
                        );
                        if (double !== "") {
                            formula =
                                "((" +
                                double +
                                "*20)+" +
                                squared +
                                ")*" +
                                squared;
                        } else {
                            formula = squared + "*" + squared;
                        }
                        lastbase = lastval;
                        break;

                    case CryptarithmType.CubeRoot:
                        let cubepart = root.substr(0, root.length - indent);
                        let found = cubepart.substr(0, cubepart.length - 1);
                        let newpart = cubepart.substr(
                            cubepart.length - 1,
                            1
                        );
                        if (found !== "") {
                            formula =
                                "((300*" +
                                found +
                                "*" +
                                found +
                                ")+" +
                                "(30*" +
                                found +
                                "*" +
                                newpart +
                                ")+" +
                                "(" +
                                newpart +
                                "*" +
                                newpart +
                                "))*" +
                                newpart;
                        } else {
                            formula =
                                newpart + "*" + newpart + "*" + newpart;
                        }
                        lastbase = lastval;
                        break;

                    default:
                        break;
                }
                prefix = token;
                state = buildState.WantMinus;
                break;

            case "*":
                if (state !== buildState.Idle) {
                    console.log(
                        "Found token:" +
                        token +
                        " when already processing " +
                        prefix
                    );
                }
                prefix = token;
                state = buildState.WantMult;
                multiplicand = lastval;
                if (cryptarithmType === CryptarithmType.Automatic) {
                    cryptarithmType = CryptarithmType.Multiplication;
                }
                break;

            case "+":
                if (state !== buildState.Idle) {
                    console.log(
                        "Found token:" +
                        token +
                        " when already processing " +
                        prefix
                    );
                }
                prefix = token;
                state = buildState.WantPlus;
                if (cryptarithmType === CryptarithmType.Automatic) {
                    cryptarithmType = CryptarithmType.Addition;
                }
                if (
                    cryptarithmType === CryptarithmType.Addition ||
                    cryptarithmType === CryptarithmType.Subtraction
                ) {
                    lastbase += lastval + "+";
                } else if (
                    cryptarithmType === CryptarithmType.Multiplication
                ) {
                    if (lastbase === "") {
                        multval = "10";
                        lastbase = lastval;
                    } else {
                        lastbase =
                            lastbase + "+(" + multval + "*" + lastval + ")";
                        multval = multval + "0";
                    }
                    indent++;
                    formula =
                        multiplicand +
                        "*" +
                        multiplier.substr(
                            multiplier.length - indent - 1,
                            1
                        );
                }
                break;

            case "/":
                if (state !== buildState.Idle) {
                    console.log(
                        "Found token:" +
                        token +
                        " when already processing " +
                        prefix
                    );
                }
                cryptarithmType = CryptarithmType.Division;
                prefix = token;
                state = buildState.WantDiv;
                break;

            // Result of an operation (add/subtract/mult/divide)
            case "=":
                if (
                    state !== buildState.Idle &&
                    state !== buildState.WantQuotient
                ) {
                    console.log(
                        "Found token:" +
                        token +
                        " when already processing " +
                        prefix
                    );
                }
                prefix = token;
                if (state !== buildState.WantQuotient) {
                    state = buildState.WantEqual;
                }
                switch (cryptarithmType) {
                    case CryptarithmType.Division:
                        if (state !== buildState.WantQuotient) {
                            formula = lastbase + "-" + lastval;
                            if (indent > 0) {
                                expected = dividend.substr(
                                    dividend.length - indent,
                                    1
                                );
                                formula =
                                    "10*(" + formula + ")+" + expected;
                                indent--;
                            }
                        }
                        break;
                    case CryptarithmType.SquareRoot:
                        formula = lastbase + "-" + lastval;
                        if (indent > 0) {
                            // We need to make sure that the last two digits
                            expected = rootbase.substr(
                                rootbase.length - indent * numwidth,
                                numwidth
                            );
                            formula = "(" + formula + ")*100+" + expected;
                            indent--;
                        }
                        break;
                    case CryptarithmType.CubeRoot:
                        formula = lastbase + "-" + lastval;
                        if (indent > 0) {
                            // We need to make sure that the last two digits
                            expected = rootbase.substr(
                                rootbase.length - indent * numwidth,
                                numwidth
                            );
                            formula = "(" + formula + ")*1000+" + expected;
                            indent--;
                        }
                        break;
                    case CryptarithmType.Multiplication:
                        if (indent === 0) {
                            formula =
                                multiplicand +
                                "*" +
                                multiplier.substr(multiplier.length - 1, 1);
                            lastbase = "";
                        } else {
                            formula =
                                lastbase +
                                "+(" +
                                multval +
                                "*" +
                                lastval +
                                ")";
                        }
                        indent = 0;
                        break;
                    case CryptarithmType.Addition:
                    case CryptarithmType.Subtraction:
                        formula = lastbase + lastval;
                        break;

                    default:
                        break;
                }
                break;

            default:
                if (state === buildState.Idle) {
                    console.log(
                        "Missing prefix string to process token:" + token
                    );
                }
                let item: cryptarithmLineItem = {
                    prefix: prefix,
                    indent: indent,
                    content: "",
                    class: "",
                    formula: formula,
                    expected: token,
                };
                lastval = token;
                formula = "";
                let isRoot: boolean = false;
                let rootLen: number = 0;
                let content = "";
                // We need to parse out the number and collect all the digits
                // if it has ' in it then we are going to be doing either a square or a cube root
                // based on how many letters are grouped
                for (let c of token) {
                    if (c === "'") {
                        if (prefix !== "") {
                            console.log(
                                "Found quotes on other than the first token"
                            );
                        }
                        isRoot = true;
                        indent++;
                        if (
                            cryptarithmType ===
                            CryptarithmType.Automatic
                        ) {
                            if (rootLen === 2) {
                                cryptarithmType =
                                    CryptarithmType.SquareRoot;
                            } else if (rootLen === 3) {
                                cryptarithmType =
                                    CryptarithmType.CubeRoot;
                            } else {
                                console.log(
                                    "Bad quote location at " + rootLen
                                );
                            }
                        }
                        if (
                            cryptarithmType ===
                            CryptarithmType.SquareRoot
                        ) {
                            item.prefix = "2";
                            numwidth = 2;
                            item.class = "ovl";
                        } else if (
                            cryptarithmType ===
                            CryptarithmType.CubeRoot
                        ) {
                            item.prefix = "3";
                            numwidth = 3;
                            item.class = "ovl";
                        }
                        rootLen = 0;
                    } else {
                        if (c.toLocaleLowerCase !== c.toUpperCase) {
                            result.usedletters[c] = true;
                        }
                        content += c;
                        rootLen++;
                    }
                }
                // The first digit of the content can't be a zero
                if (content.length > 0) {
                    let c = content.substring(0, 1);
                    if (c.toLocaleLowerCase !== c.toUpperCase) {
                        result.nonzeros[c] = true;
                    }
                }

                // See if we ended up with a Cuberoot
                if (isRoot && rootLen === 3) {
                    cryptarithmType = CryptarithmType.CubeRoot;
                    item.prefix = "3";
                    numwidth = 3;
                }
                // See if we need to format the number into place
                let padding = "";
                for (let pad = 0; pad < numwidth * item.indent; pad++) {
                    padding += " ";
                }
                item.indent = indent * numwidth;
                switch (cryptarithmType) {
                    case CryptarithmType.SquareRoot:
                        if (item.prefix === "^") {
                            // We need to split the characters into each character
                            // and put two spaces between
                            item.prefix = "";
                            item.content = content.split("").join("  ");
                            root = content;
                            let tempitem = result.lineitems.pop();
                            result.lineitems.push(item);
                            item = tempitem;
                            rootbase = item.content.replace(
                                new RegExp(" ", "g"),
                                ""
                            );
                            let digits = rootbase.length % numwidth;
                            if (digits === 0) {
                                digits = numwidth;
                            }
                            lastval = rootbase.substr(0, digits);
                        } else {
                            if (indent > 0 && expected !== "") {
                                if (
                                    content.substr(
                                        content.length - numwidth,
                                        numwidth
                                    ) !== expected
                                ) {
                                    // Special case where we had a zero and have to skip one more
                                    padding = padding.substr(
                                        0,
                                        padding.length - numwidth
                                    );
                                    item.formula =
                                        "(" +
                                        item.formula +
                                        ")*100+" +
                                        rootbase.substr(
                                            rootbase.length - indent * 2,
                                            2
                                        );
                                    indent--;
                                }
                            }
                            // We want to start at the end and put an extra
                            // space between every second character
                            let temp = " " + content + padding;
                            item.content = "";
                            for (
                                let i = temp.length - numwidth;
                                i >= 0;
                                i -= numwidth
                            ) {
                                let toadd = temp.substr(i, numwidth);
                                if (item.content !== "") {
                                    item.content =
                                        toadd + " " + item.content;
                                } else {
                                    item.content = toadd;
                                }
                            }
                        }
                        state = buildState.Idle;
                        break;

                    case CryptarithmType.CubeRoot:
                        if (item.prefix === "^") {
                            // Put three spaces between every character
                            item.prefix = "";
                            item.content = content.split("").join("   ");
                            root = content;
                            let tempitem = result.lineitems.pop();
                            result.lineitems.push(item);
                            item = tempitem;
                            rootbase = item.content.replace(
                                new RegExp(" ", "g"),
                                ""
                            );
                            let digits = rootbase.length % numwidth;
                            if (digits === 0) {
                                digits = numwidth;
                            }
                            lastval = rootbase.substr(0, digits);
                        } else {
                            if (indent > 0 && expected !== "") {
                                if (
                                    content.substr(
                                        content.length - numwidth,
                                        numwidth
                                    ) !== expected
                                ) {
                                    // Special case where we had a zero and have to skip one more
                                    padding = padding.substr(
                                        0,
                                        padding.length - numwidth
                                    );
                                    item.formula =
                                        "(" +
                                        item.formula +
                                        ")*1000+" +
                                        rootbase.substr(
                                            rootbase.length - indent * 2,
                                            2
                                        );
                                    indent--;
                                }
                            }
                            // We want to start at the end and put an extra
                            // space between every third character
                            let temp = "  " + content + padding;
                            item.content = "";
                            for (
                                let i = temp.length - numwidth;
                                i >= 0;
                                i -= numwidth
                            ) {
                                let toadd = temp.substr(i, numwidth);
                                if (item.content !== "") {
                                    item.content =
                                        toadd + " " + item.content;
                                } else {
                                    item.content = toadd;
                                }
                            }
                        }
                        state = buildState.Idle;
                        break;

                    case CryptarithmType.Division:
                        // When dealing with the divisor, we put it to the left of the dividend
                        if (item.prefix === "/") {
                            item = result.lineitems.pop();
                            dividend = item.content;
                            divisor = content;
                            item.content = content + ")" + item.content;
                            state = buildState.WantQuotient;
                        } else {
                            if (indent > 0 && expected !== "") {
                                if (
                                    content.substr(
                                        content.length - numwidth,
                                        numwidth
                                    ) !== expected
                                ) {
                                    // Special case where we had a zero and have to skip one more
                                    padding = padding.substr(
                                        0,
                                        padding.length - numwidth
                                    );
                                    item.formula =
                                        "(" +
                                        item.formula +
                                        ")*10+" +
                                        dividend.substr(
                                            dividend.length - indent,
                                            1
                                        );
                                    indent--;
                                }
                            }
                            item.content = content + padding;
                            if (state === buildState.WantQuotient) {
                                quotient = content;
                                let tempitem = result.lineitems.pop();
                                item.prefix = "";
                                result.lineitems.push(item);
                                item = tempitem;
                                indent = content.length - 1;
                                lastval = dividend.substr(
                                    0,
                                    dividend.length - indent
                                );
                            }
                            state = buildState.Idle;
                        }
                        break;

                    case CryptarithmType.Multiplication:
                        if (state === buildState.WantMult) {
                            multiplier = content;
                        }
                        item.content = content + padding;
                        state = buildState.WantMultAdds;
                        break;

                    default:
                        // No need to do anything, we are happy with the
                        // content and the padding
                        state = buildState.Idle;
                        item.content = content + padding;
                        break;
                }
                if (item.prefix === "=") {
                    item.prefix = "";
                    item.class = "ovl";
                }

                result.lineitems.push(item);
                if (item.content.length > result.maxwidth) {
                    result.maxwidth = item.content.length;
                }
                prefix = "";
                expected = "";
                break;
        }
    }
    const tbase = Object.keys(result.usedletters).length;
    if (base === 0 || tbase > base) {
        base = tbase;
    }
    return result;
}

/**
 * 
 * @param formula Parsed Cryptarithm to generate output for
 * @returns HTML representation of output
 */
export function buildSolver(formula: cryptarithmParsed): JQuery<HTMLElement> {
    // We have built the lineitems array, now we just need to turn it into
    // a table (respecting the maxwidth)
    let table = $("<table/>", { class: "cmath" });
    let tbody = $("<tbody/>");
    for (let item of formula.lineitems) {
        let tr = $("<tr/>");
        // Pad on the left with as many columns as we need
        if (item.content.length < formula.maxwidth) {
            $("<td/>", {
                colspan: formula.maxwidth - item.content.length,
            })
                .html("&nbsp;")
                .appendTo(tr);
        }
        let td: JQuery<HTMLElement> = null;
        let addclass = item.class;
        switch (item.prefix) {
            case "2": {
                td = $("<td/>")
                    .html("&radic;")
                    .addClass("math"); // √ - SQUARE ROOT
                addclass = "";
                break;
            }
            case "3": {
                td = $("<td/>")
                    .html("&#8731;")
                    .addClass("math"); // ∛ - CUBE ROOT
                addclass = "";
                break;
            }
            case "4": {
                td = $("<td/>")
                    .html("&#8732;")
                    .addClass("math"); // ∜ - FOURTH ROOT
                addclass = "";
                break;
            }
            default: {
                td = $("<td/>").text(item.prefix); //.addClass("math")
                break;
            }
        }
        if (addclass) {
            td.addClass(addclass);
        }
        td.appendTo(tr);
        addclass = item.class;
        if (item.content !== "") {
            for (let c of item.content) {
                td = $("<td/>");
                $("<div/>", { class: "slil" })
                    .text(c)
                    .appendTo(td);
                if (c === ")") {
                    td.addClass("math");
                    addclass = "ovl";
                } else if (formula.usedletters[c]) {
                    $("<input/>", {
                        type: "text",
                        class: "sli",
                        "data-char": c,
                    }).appendTo(td);
                }
                if (addclass) {
                    td.addClass(addclass);
                }
                td.appendTo(tr);
            }
        }
        let content = $("");
        if (item.formula !== "") {
            content = $("<span/>", {
                class: "formula",
                "data-formula": item.formula,
                "data-expect": item.expected,
            });
        }

        $("<td/>", { class: "solv" })
            .append(content)
            .appendTo(tr);
        tr.appendTo(tbody);
    }

    tbody.appendTo(table);

    return table;
}
