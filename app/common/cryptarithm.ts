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

export function copySolutionMap(map: NumberMap, map_count: NumberMap): NumberMap {
    const result: NumberMap = {};
    for (let c in map) {
        if (map_count[c] > 0) {
            result[c] = map[c]
        }
    }
    return result
}

export interface cryptarithmResult {
    count: number
    difficulty: number
    mapping: NumberMap
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
export function cryptarithmSumandSearch(sumands: string[], sum: string, base: number = 10, just_one = false, print = false): cryptarithmResult {
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
        return { count: 0, difficulty: -1, mapping: {} };
    }
    for (const sumstr of sumands) {
        if (sumstr.length > MAX_LEN) {
            console.log(`Words must all be ${MAX_LEN} characters or less.`);
            return;
        }
        // If a summand is longer than the sum, then there is no solution.
        if (sumstr.length > sum_length) {
            return { count: 0, difficulty: -1, mapping: {} };
        }
    }

    for (let col = 0; col < sum_length; col++) {
        columnChars.push("")
    }

    // Initialize column lengths and needed_carry to 0.
    let column_lengths = makeFilledArray(MAX_LEN + 1, 0)
    let needed_carry = makeFilledArray(MAX_LEN, 0);

    const number_map = emptyAlphaMap();
    let solution_map = emptyAlphaMap();
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
        return { count: 0, difficulty: -1, mapping: {} };
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
    if (DBG_SOLVE) {
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
                solution_map = copySolutionMap(number_map, map_count)
                if (print) {
                    print_solution(number_map, map_count);
                }

                // If we just wanted to see if there were any solutions,
                // return right now.

                if (just_one) {
                    return { count: 1, difficulty: difficulty_conv(backtrack_count), mapping: solution_map };
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
    // console.log(`${solutions_found} Solutions Found.  Difficulty=${difficulty}`)
    return { count: solutions_found, difficulty: difficulty, mapping: solution_map };
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
    str = str.replace(/[√∛]([A-Za-z']+)=/g, "$1^");
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
                            } else if (rootLen !== 1) {
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
                        if (c.toLocaleLowerCase() !== c.toUpperCase()) {
                            result.usedletters[c] = true;
                        }
                        content += c;
                        rootLen++;
                    }
                }
                // The first digit of a multi-digit number can't be a zero.
                // A single letter line (such as the final remainder of an exact
                // division) is allowed to be zero.
                if (content.length > 1) {
                    let c = content.substring(0, 1);
                    if (c.toLocaleLowerCase() !== c.toUpperCase()) {
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
                            if (numwidth < 2) {
                                // The radicand was entered without quote grouping
                                // (e.g. "OZEN gives root DD") so group it into
                                // pairs from the right exactly as the quoted
                                // syntax ("OZ'EN gives root DD") would have.
                                numwidth = 2;
                                indent = Math.ceil(rootbase.length / numwidth) - 1;
                                let temp = " " + rootbase;
                                let grouped = "";
                                for (
                                    let i = temp.length - numwidth;
                                    i >= 0;
                                    i -= numwidth
                                ) {
                                    let toadd = temp.substr(i, numwidth);
                                    if (grouped !== "") {
                                        grouped = toadd + " " + grouped;
                                    } else {
                                        grouped = toadd;
                                    }
                                }
                                item.content = grouped;
                                item.prefix = "2";
                                item.class = "ovl";
                                item.indent = indent * numwidth;
                                result.lineitems[
                                    result.lineitems.length - 1
                                ].indent = indent * numwidth;
                            }
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
                                            rootbase.length - indent * numwidth,
                                            numwidth
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
                                            rootbase.length - indent * numwidth,
                                            numwidth
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
    // Handle the simple single-equation forms where no work lines were given.
    //   A/B=C  generates no formula at all, so make it  B*C = A  (exact division)
    //   A*B=C  with a multi-digit multiplier gets parsed as if C were the first
    //          partial product (A*<last digit of B>).  Since nothing followed
    //          it, C is really the full product, so make it  A*B = C
    if (result.lineitems.length > 0) {
        const formulaItems = result.lineitems.filter((item) => item.formula !== "");
        const lastitem = result.lineitems[result.lineitems.length - 1];
        if (
            cryptarithmType === CryptarithmType.Division &&
            formulaItems.length === 0 &&
            divisor !== "" &&
            quotient !== ""
        ) {
            lastitem.formula = divisor + "*" + quotient;
            lastitem.expected = dividend;
        } else if (
            cryptarithmType === CryptarithmType.Multiplication &&
            multiplier.length > 1 &&
            formulaItems.length === 1 &&
            formulaItems[0] === lastitem &&
            lastitem.formula ===
            multiplicand + "*" + multiplier.substr(multiplier.length - 1, 1)
        ) {
            lastitem.formula = multiplicand + "*" + multiplier;
        }
    }
    const tbase = Object.keys(result.usedletters).length;
    if (base === 0 || tbase > base) {
        base = tbase;
    }
    return result;
}

/**
 * Tracking structure for the recursive general cryptarithm search
 */
export interface cryptarithmSearchTracker {
    backtracks: number;         // Number of assignments tried so far
    maxBacktracks: number;      // Limit of assignments before aborting (Infinity for no limit)
    aborted: boolean;           // Set when the limit was exceeded
    mapping: NumberMap;         // Mapping for the first solution found
}

export interface cryptarithmSolveResult {
    count: number;              // Number of solutions found (search stops after 2)
    mapping: NumberMap;         // Mapping for the first solution found
    backtracks: number;         // Number of assignments tried
    aborted: boolean;           // True if the search hit the backtrack limit
}

/**
 * Build the ordered set of formulas (and the order in which letters get bound)
 * for the general constraint solver.
 * @param parsed Parsed cryptarithm
 * @returns The formula set plus the order to assign letters in
 */
export function buildFormulaSet(parsed: cryptarithmParsed): { formulaSet: cryptarithmForumlaItem[]; letterOrder: string[] } {
    const allletters: BoolMap = {};
    const letterOrder: string[] = [];
    const formulaSet: cryptarithmForumlaItem[] = [];

    for (const item of parsed.lineitems) {
        if (item.formula !== "") {
            const formulaItem: cryptarithmForumlaItem = {
                formula: item.formula,
                expected: item.expected,
                totalFormula: 0,
                totalExpected: 0,
                usedFormula: {},
                newFormula: {},
                usedExpected: {},
                newExpected: {}
            }
            for (const c of item.formula) {
                if (parsed.usedletters[c]) {
                    formulaItem.usedFormula[c] = true;
                    if (!allletters[c]) {
                        allletters[c] = true;
                        letterOrder.push(c);
                        formulaItem.newFormula[c] = true;
                    }
                }
            }
            formulaItem.totalFormula = letterOrder.length;
            for (const c of item.expected) {
                if (parsed.usedletters[c]) {
                    formulaItem.usedExpected[c] = true;
                    if (!allletters[c]) {
                        allletters[c] = true;
                        letterOrder.push(c);
                        formulaItem.newExpected[c] = true;
                    }
                }
            }
            formulaItem.totalExpected = letterOrder.length;
            formulaSet.push(formulaItem);
        }
    }
    // It is possible that some of the letters used don't actually appear in a
    // formula (for example the remainder of a division).  We just need to add
    // them to the list of letters
    for (const c in parsed.usedletters) {
        if (!allletters[c]) {
            letterOrder.push(c);
            allletters[c] = true;
        }
    }
    return { formulaSet: formulaSet, letterOrder: letterOrder };
}

/**
 * Safe version of eval to compute a generated formula
 * @param str Formula string (all values already numeric)
 * @param base Number base to render the result in
 */
export function computeFormula(str: string, base: number = 10): string {
    try {
        const val = Function('"use strict";return (' + str + ")")();
        return basedStr(val, base);
    } catch (e) {
        return str;
    }
}

/**
 * Substitutes all the current single-valued mappings in a formula string and
 * converts the result to base 10 so it can be evaluated
 * @param str String to substitute
 * @param legal Current mappings (only single-entry values are substituted)
 * @param base Number base of the formula
 */
export function subFormula(str: string, legal: legalMap, base: number = 10): string {
    let result = "";
    for (const c of str) {
        if (legal[c] !== undefined) {
            result += legal[c][0];
        } else {
            result += c;
        }
    }
    // Now we need to convert everything to base 10 so we can
    // properly evaluate it
    let gathered = "";
    const intermediate = result;
    result = "";
    for (const c of intermediate) {
        if (!isNaN(parseInt(c, base))) {
            // Throw away leading zeros so that it will parse
            if (gathered === "0") {
                gathered = c;
            } else {
                gathered += c;
            }
        } else if (gathered !== "") {
            result += parseInt(gathered, base) + c;
            gathered = "";
        } else {
            result += c;
        }
    }
    if (gathered !== "") {
        result += parseInt(gathered, base);
    }
    return result;
}

/**
 * Check a computed result against the expected letter string, ensuring that
 * every digit is consistent with (and doesn't conflict with) the current
 * assignments
 * @param computed Computed value string (in the target base)
 * @param expected Expected letter string
 * @param used Which values are already assigned to other letters
 * @param legal Current candidate values for each letter
 * @param base Number base of the problem
 */
export function checkFormulaResult(computed: string, expected: string, used: Boolean[], legal: legalMap, base: number = 10): boolean {
    const len = computed.length;
    if (len !== expected.length) {
        return false;
    }

    const subUsed = [...used]
    const subLegal: legalMap = {}
    for (const c in legal) {
        subLegal[c] = legal[c]
    }

    for (let i = 0; i < len; i++) {
        const cv = parseInt(computed.substring(i, i + 1), base);
        const ec = expected.substring(i, i + 1)
        if (subLegal[ec] === undefined) {
            return false;
        }
        if (subLegal[ec].length === 1) {
            if (subLegal[ec][0] !== cv) {
                return false;
            }
        } else {
            if (subUsed[cv] || !subLegal[ec].includes(cv)) {
                return false;
            }
            subUsed[cv] = true;
            subLegal[ec] = [cv]
        }
    }
    return true;
}

/**
 * Filter an array of values to identify only the legal ones that can still be used
 * @param vals array of values to filter
 * @param used Indicator of values that have already been used
 * @returns Filtered array
 */
export function filterLegal(vals: number[], used: Boolean[]): number[] {
    const result: number[] = [];
    for (const v of vals) {
        if (!used[v]) {
            result.push(v)
        }
    }
    return result;
}

/**
 * Evaluate everything at a level checking for a match.  This recursively
 * assigns values to letters (in letterOrder order), evaluating each formula
 * as soon as all of its letters are bound.  The search stops as soon as a
 * second solution is found (proving non-uniqueness) or the tracker's
 * backtrack limit is exceeded.
 * @param level How far down in the letter set we are
 * @param formulaSet The set of formulas to match against
 * @param legal The possible legal values to match against
 * @param letterOrder The order of letters to be substituting for
 * @param used Which values are already used
 * @param found How many matches we have found so far
 * @param base Number base of the problem
 * @param tracker Search tracker for backtrack counting/aborting and capturing the solution
 * @returns Number of matches found so far
 */
export function tryFormulaLevel(level: number, formulaSet: cryptarithmForumlaItem[], legal: legalMap, letterOrder: string[], used: Boolean[], found: number, base: number, tracker: cryptarithmSearchTracker): number {
    let formulapos = 0
    let formulaItem = formulaSet[formulapos];

    const subUsed = [...used]
    const subLegal: legalMap = {}
    for (const c of letterOrder) {
        subLegal[c] = legal[c]
    }

    // See if we have enough letters to satisfy a formula without having to map any new letters.
    while (formulaItem !== undefined && level >= formulaItem.totalFormula) {
        // We have enough to substitute for the formula.
        const formula = subFormula(formulaItem.formula, subLegal, base)
        const result = computeFormula(formula, base);
        if (!checkFormulaResult(result, formulaItem.expected, subUsed, subLegal, base)) {
            // It doesn't match, so there is no reason to try anything else.
            return found;
        }
        // Ok it checks out, now we need to fill in the legal values because there are more formulas to go
        if (formulaItem.totalExpected > level) {
            for (let i = 0; i < result.length; i++) {
                const cv = parseInt(result.substring(i, i + 1), base);
                const ec = formulaItem.expected.substring(i, i + 1)
                subLegal[ec] = [cv]
                subUsed[cv] = true
            }
            level = formulaItem.totalExpected;
        }
        formulapos++
        if (formulapos == formulaSet.length) {
            // Success!!!!
            if (found == 0) {
                // We need to save the mappings
                tracker.mapping = {}
                for (const c in subLegal) {
                    if (subLegal[c].length === 1) {
                        tracker.mapping[c] = subLegal[c][0];
                    } else {
                        const filtered = filterLegal(subLegal[c], subUsed)
                        if (filtered.length === 1) {
                            const v = filtered[0]
                            subUsed[v] = true
                            tracker.mapping[c] = v
                        }
                    }
                }
            }
            return found + 1;
        }
        // We know there is at least one more formula available to us
        formulaItem = formulaSet[formulapos]
    }

    // If there are no more formulas, then we have solved the problem
    // Note that this does mean that not all the letters are known
    if (formulapos >= formulaSet.length) {
        // We need to save the mappings
        tracker.mapping = {}
        for (const c in subLegal) {
            if (subLegal[c].length === 1) {
                tracker.mapping[c] = subLegal[c][0];
            }
        }
        return 1;
    }
    // We don't have enough known letters to try out the formula, so try an extra one and recurse to see if it is enough
    const l = letterOrder[level];
    const subset = [...subLegal[l]]
    for (const v of subset) {
        if (!subUsed[v]) {
            tracker.backtracks++;
            if (tracker.backtracks > tracker.maxBacktracks) {
                tracker.aborted = true;
                return found;
            }
            subUsed[v] = true
            subLegal[l] = [v]
            // We need to filter out all the values that aren't legal for the remaining letters
            for (let i = level + 1; i < base; i++) {
                const sc = letterOrder[i]
                if (sc !== undefined) {
                    subLegal[sc] = filterLegal(legal[sc], subUsed)
                }
            }
            // Now we need to try a lower level to check the result
            found = tryFormulaLevel(level + 1, formulaSet.slice(formulapos), subLegal, letterOrder, subUsed, found, base, tracker);
            // If we have more than one match (or we gave up), exit quickly
            if (found > 1 || tracker.aborted) {
                return found;
            }
            subUsed[v] = false
        }
    }
    return found;
}

/**
 * Synchronously solve a parsed cryptarithm with the general constraint
 * solver, counting solutions (up to 2) to determine whether the problem has a
 * unique solution.
 * @param parsed Parsed cryptarithm
 * @param base Number base of the problem
 * @param maxBacktracks Backtrack budget before giving up (aborted is set in the result)
 */
export function solveCryptarithm(parsed: cryptarithmParsed, base: number = 10, maxBacktracks: number = 1000000): cryptarithmSolveResult {
    const { formulaSet, letterOrder } = buildFormulaSet(parsed);
    if (formulaSet.length === 0 || letterOrder.length === 0) {
        return { count: 0, mapping: {}, backtracks: 0, aborted: false };
    }
    const tracker: cryptarithmSearchTracker = {
        backtracks: 0,
        maxBacktracks: maxBacktracks,
        aborted: false,
        mapping: {}
    };
    const legal = buildLegal(parsed, base);
    const used = makeFilledArray(base, false) as Boolean[];
    const count = tryFormulaLevel(0, formulaSet, legal, letterOrder, used, 0, base, tracker);
    return { count: count, mapping: tracker.mapping, backtracks: tracker.backtracks, aborted: tracker.aborted };
}

export interface cryptarithmProductSolution {
    mapping: NumberMap;   // letter -> digit for all letters involved
    quotient?: number;    // For free-quotient searches, the numeric quotient found
}
export interface cryptarithmProductResult {
    count: number;
    solutions: cryptarithmProductSolution[];
    backtracks: number;
    aborted: boolean;
}

/**
 * Search for digit assignments where factorA * factorB = product (as letter
 * patterns with a bijective letter/digit mapping and no leading zeros).
 * This is the engine behind generating division problems (divisor * quotient
 * = dividend) and square root problems (root * root = radicand, pass the same
 * word for both factors).
 *
 * When factorB is null/empty the multiplier is a free numeric quotient
 * instead of a letter pattern ("A/B=?" style): every quotient value whose
 * product has the right number of digits is tried against the product
 * pattern, and the matching quotient is returned with each solution.
 *
 * @param factorA First factor word
 * @param factorB Second factor word (or null for a free numeric quotient)
 * @param product Product word
 * @param base Number base to work in
 * @param maxBacktracks Limit on assignments/values tried before aborting
 * @param maxSolutions Stop collecting after this many solutions
 */
export function cryptarithmProductSearch(factorA: string, factorB: string, product: string, base: number = 10, maxBacktracks: number = 2000000, maxSolutions: number = 10): cryptarithmProductResult {
    const result: cryptarithmProductResult = { count: 0, solutions: [], backtracks: 0, aborted: false };
    const isFree = factorB === null || factorB === undefined || factorB === "";
    // Quick length feasibility check
    if (!isFree) {
        const lenlow = factorA.length + factorB.length - 1;
        if (product.length < lenlow || product.length > lenlow + 1) {
            return result;
        }
    } else if (product.length <= factorA.length) {
        return result;
    }
    // Gather the distinct letters to assign (factorA first so we can prune on
    // its value as soon as it is complete)
    const letters: string[] = [];
    for (const c of factorA + (isFree ? "" : factorB)) {
        if (letters.indexOf(c) < 0) {
            letters.push(c);
        }
    }
    let nA = 0;
    for (const c of factorA) {
        const idx = letters.indexOf(c);
        if (idx >= nA) {
            nA = idx + 1;
        }
    }
    const nonzero: BoolMap = {};
    nonzero[factorA.substring(0, 1)] = true;
    if (!isFree) {
        nonzero[factorB.substring(0, 1)] = true;
    }
    nonzero[product.substring(0, 1)] = true;

    const assign: NumberMap = {};
    const used: boolean[] = makeFilledArray(base, false) as boolean[];

    const wordVal = (word: string): number => {
        let v = 0;
        for (const c of word) {
            v = v * base + assign[c];
        }
        return v;
    };
    // Match a computed product value against the product letter pattern,
    // extending the current assignment.  Returns the extra assignments or
    // undefined if it doesn't fit.
    const matchProduct = (val: number): NumberMap => {
        const str = basedStr(val, base);
        if (str.length !== product.length) {
            return undefined;
        }
        const local: NumberMap = {};
        const lused = [...used];
        for (let i = 0; i < str.length; i++) {
            const dv = parseInt(str.substring(i, i + 1), base);
            const c = product.substring(i, i + 1);
            let cur = assign[c];
            if (cur === undefined) {
                cur = local[c];
            }
            if (cur !== undefined) {
                if (cur !== dv) {
                    return undefined;
                }
            } else {
                if (lused[dv] || (dv === 0 && nonzero[c])) {
                    return undefined;
                }
                local[c] = dv;
                lused[dv] = true;
            }
        }
        return local;
    };

    const dfs = (idx: number): void => {
        if (result.aborted || result.solutions.length >= maxSolutions) {
            return;
        }
        if (!isFree && idx === nA && idx < letters.length) {
            // factorA is fully assigned - prune if no factorB value can
            // produce a product of the right length
            const valA = wordVal(factorA);
            const minB = Math.pow(base, factorB.length - 1);
            const maxB = Math.pow(base, factorB.length) - 1;
            const minP = Math.pow(base, product.length - 1);
            const maxP = Math.pow(base, product.length) - 1;
            if (valA * maxB < minP || valA * minB > maxP) {
                return;
            }
        }
        if (idx === letters.length) {
            const valA = wordVal(factorA);
            if (isFree) {
                // Try every quotient which gives a product of the right length
                const lo = Math.ceil(Math.pow(base, product.length - 1) / valA);
                const hi = Math.floor((Math.pow(base, product.length) - 1) / valA);
                for (let q = lo; q <= hi; q++) {
                    result.backtracks++;
                    if (result.backtracks > maxBacktracks) {
                        result.aborted = true;
                        return;
                    }
                    const local = matchProduct(valA * q);
                    if (local !== undefined) {
                        result.solutions.push({ mapping: Object.assign({}, assign, local), quotient: q });
                        if (result.solutions.length >= maxSolutions) {
                            return;
                        }
                    }
                }
            } else {
                const local = matchProduct(valA * wordVal(factorB));
                if (local !== undefined) {
                    result.solutions.push({ mapping: Object.assign({}, assign, local) });
                }
            }
            return;
        }
        const c = letters[idx];
        for (let v = nonzero[c] ? 1 : 0; v < base; v++) {
            if (!used[v]) {
                result.backtracks++;
                if (result.backtracks > maxBacktracks) {
                    result.aborted = true;
                    return;
                }
                assign[c] = v;
                used[v] = true;
                dfs(idx + 1);
                delete assign[c];
                used[v] = false;
                if (result.aborted || result.solutions.length >= maxSolutions) {
                    return;
                }
            }
        }
    };
    dfs(0);
    result.count = result.solutions.length;
    return result;
}

/**
 * Build the long division cryptarithm string (A/B=Q-P1=R1-P2...) for an exact
 * division dividend = divisor * quotient.
 * @param dividend Dividend value
 * @param divisor Divisor value
 * @param quotient Quotient value
 * @param digitToLetter String where the letter at index N is the letter for digit N
 * @param base Number base to work in
 * @returns The problem string, or undefined if the numbers don't produce a
 *          clean canonical long division layout
 */
export function buildDivisionProblemString(dividend: number, divisor: number, quotient: number, digitToLetter: string, base: number = 10): string {
    if (divisor * quotient !== dividend || quotient < base) {
        return undefined;
    }
    const L = (val: number): string => {
        let out = "";
        for (const ch of basedStr(val, base)) {
            out += digitToLetter.substring(parseInt(ch, base), parseInt(ch, base) + 1);
        }
        return out;
    };
    const dstr = basedStr(dividend, base);
    const qstr = basedStr(quotient, base);
    const firstlen = dstr.length - (qstr.length - 1);
    if (firstlen < 1) {
        return undefined;
    }
    let result = L(dividend) + "/" + L(divisor) + "=" + L(quotient);
    let rem = parseInt(dstr.substring(0, firstlen), base);
    for (let i = 0; i < qstr.length; i++) {
        const qd = parseInt(qstr.substring(i, i + 1), base);
        if (qd === 0) {
            // A zero quotient digit needs the skip-a-column layout, so pass on it
            return undefined;
        }
        const prod = qd * divisor;
        if (prod > rem) {
            return undefined;
        }
        result += "-" + L(prod);
        rem -= prod;
        if (rem >= divisor) {
            // Not a canonical long division step
            return undefined;
        }
        if (i < qstr.length - 1) {
            // Bring down the next digit of the dividend
            rem = rem * base + parseInt(dstr.substring(firstlen + i, firstlen + i + 1), base);
            result += "=" + L(rem);
        }
    }
    if (rem !== 0) {
        return undefined;
    }
    return result;
}

/**
 * Build the square root cryptarithm string (√RA'DI'CA'ND=RT-...)
 * for an exact square radicand = root * root.
 * @param radicand Radicand value (a perfect square)
 * @param root Square root value
 * @param digitToLetter String where the letter at index N is the letter for digit N
 * @param base Number base to work in
 * @returns The problem string, or undefined if the numbers don't produce a
 *          clean layout
 */
export function buildSquareRootProblemString(radicand: number, root: number, digitToLetter: string, base: number = 10): string {
    if (root * root !== radicand || root < base) {
        return undefined;
    }
    const L = (val: number): string => {
        let out = "";
        for (const ch of basedStr(val, base)) {
            out += digitToLetter.substring(parseInt(ch, base), parseInt(ch, base) + 1);
        }
        return out;
    };
    const rstr = basedStr(radicand, base);
    const rootstr = basedStr(root, base);
    // Split the radicand into pairs of digits from the right
    const groups: string[] = [];
    let pos = rstr.length;
    while (pos > 0) {
        const start = Math.max(0, pos - 2);
        groups.unshift(rstr.substring(start, pos));
        pos = start;
    }
    if (groups.length !== rootstr.length) {
        return undefined;
    }
    // Emit the radicand with quote grouping between the pairs
    let quoted = "";
    for (const g of groups) {
        let gl = "";
        for (const ch of g) {
            gl += digitToLetter.substring(parseInt(ch, base), parseInt(ch, base) + 1);
        }
        if (quoted === "") {
            quoted = gl;
        } else {
            quoted += "'" + gl;
        }
    }
    let result = "√" + quoted + "=" + L(root);
    let acc = parseInt(groups[0], base);
    let found = 0;
    for (let i = 0; i < rootstr.length; i++) {
        const rd = parseInt(rootstr.substring(i, i + 1), base);
        if (rd === 0) {
            // A zero root digit needs the skip-a-column layout, so pass on it
            return undefined;
        }
        const sub = i === 0 ? rd * rd : ((found * 2 * base) + rd) * rd;
        if (sub > acc) {
            return undefined;
        }
        result += "-" + L(sub);
        acc -= sub;
        found = found * base + rd;
        if (i < rootstr.length - 1) {
            const pairval = parseInt(groups[i + 1], base);
            if (acc === 0 && pairval < base) {
                // The next working value would be written with a leading zero
                // dropped, which misaligns the layout
                return undefined;
            }
            acc = acc * base * base + pairval;
            result += "=" + L(acc);
        }
    }
    if (acc !== 0) {
        return undefined;
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
