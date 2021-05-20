export interface StringMap {
    [index: string]: string;
}

export interface BoolMap {
    [index: string]: boolean;
}

export interface NumberMap {
    [index: string]: number;
}

/**
 * Makes a deep copy of any object
 * @param source Object to copy
 */
export function cloneObject(source: object): object {
    const clone = {};
    if (source !== null) {
        for (const elem of Object.keys(source)) {
            if (source[elem] === null) {
                clone[elem] = null;
            } else if (Array.isArray(source[elem])) {
                clone[elem] = source[elem].slice();
            } else if (typeof source[elem] === 'object') {
                clone[elem] = cloneObject(source[elem]);
            } else {
                clone[elem] = source[elem];
            }
        }
    }
    return clone;
}
/**
 * Makes a deep copy of any object ignoring any undefined elements
 * @param source Object to copy
 */
export function cloneObjectClean(source: object): object {
    const clone = {};
    if (source !== null) {
        for (const elem of Object.keys(source)) {
            if (source[elem] === null) {
                clone[elem] = null;
            } else if (Array.isArray(source[elem])) {
                clone[elem] = source[elem].slice();
            } else if (typeof source[elem] === 'object') {
                clone[elem] = cloneObjectClean(source[elem]);
            } else if (source[elem] !== undefined) {
                clone[elem] = source[elem];
            }
        }
    }
    return clone;
}
/**
 * Replaces a character in a string at a given position
 * (The reverse of substr)
 * @param str String to update
 * @param index Position to set character
 * @param chr New character to put into position
 */
export function setCharAt(str: string, index: number, chr: string): string {
    if (index > str.length - 1) {
        return str;
    }
    return str.substr(0, index) + chr + str.substr(index + 1);
}

/**
 * Make multiple copies of a string concatenated
 * @param c Character(or string) to repeat
 * @param count number of times to repeat the string
 */
export function repeatStr(c: string, count: number): string {
    let res = '';
    for (let i = 0; i < count; i++) {
        res += c;
    }
    return res;
}
/**
 * Creates an array of a given size initialized with the defined values
 * @param size Number of elements in the array
 * @param value Initialized value for the array elements
 */
export function makeFilledArray(size: number, value: any): any[] {
    const result: any[] = new Array(size);
    for (let i = 0; i < size; i++) {
        result[i] = value;
    }
    return result;
}
/**
 * Pads one string with blanks to match the length of the second string
 * @param c String to pad
 * @param m String to match length of
 */
export function padToMatch(c: string, m: string): string {
    return c + repeatStr(' ', m.length - c.length);
}
/**
 * Remove all whitespace from a string and convert it to all upper case.
 * @param text String to remove whitespace from
 * @param keepCase Boolean indicating you want the string back without bein coverted to upper case
 */
export function sanitizeString(text: string, keepCase = false): string {
    let returnValue: string = text.replace(/[\s,.?'";:!$&-+=]/g, '');
    if (!keepCase) {
        returnValue = returnValue.toUpperCase();
    }
    return returnValue;
}
/**
 * Set the disabled state on a JQuery selected set of elements
 * @param sel JQuery Selector string to select elements to affect
 * @param disabled Boolean indicating whether to disable or enable
 */
export function setDisabled(sel: string, disabled: boolean): void {
    if (disabled) {
        $(sel).prop('disabled', true);
    } else {
        $(sel).removeAttr('disabled');
    }
}
/**
 * Take any number and pad it on the left with spaces, returning the right most
 * width digits of the formatted string.  Note that if the number is wider than
 * the width, it will be truncated.
 * @param val Value to pad
 * @param width Number of spaces to pad/truncate the number to
 */
export function padLeft(val: number, width: number): string {
    const result = repeatStr(' ', width) + String(val);
    return result.slice(-width);
}
/**
 * Determines the longest starting string from a keystring
 * @param str Key string to extract
 */
export function extractKey(str: string): string {
    let lastc;
    for (let i = str.length - 1; i >= 0; i--) {
        const c = str.substr(i, 1);
        if (c !== '?') {
            if (lastc !== undefined && c > lastc) {
                return str.substr(0, i + 1);
            }
        }
        lastc = c;
    }
    return '';
}
/**
 * Determines the best key for a polybius square.  This checks horizontal,
 * vertical and both clockwise and counter clockwise for a polybius square
 * regardless of the size.
 * @param polybius (hopefully) Square array of strings
 */
export function getPolybiusKey(polybius: string[][]): string {
    // Make sure that we are dealing with a square
    const height = polybius.length;
    // The array is empty, so return nothing
    if (height === 0) {
        return '';
    }
    // The array isn't square so we also return nothing.
    if (height !== polybius[0].length) {
        return '';
    }
    let horizkey = '';
    let vertkey = '';
    let clockkey = '';
    let counterclockkey = '';
    // get the horizontal and vertical ones
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < height; j++) {
            let c = polybius[i][j];
            if (c === undefined) {
                c = '?';
            }
            horizkey += c;
            c = polybius[j][i];
            if (c === undefined) {
                c = '?';
            }
            vertkey += c;
        }
    }
    let y = 0;
    let x = 0;
    let ylowlimit = -1;
    let yhighlimit = height;
    let xlowlimit = -1;
    let xhighlimit = height;
    let ydelta = 0;
    let lastydelta = -1;
    let xdelta = 1;
    let lastxdelta = -1;
    for (let spot = 0; spot < height * height; spot++) {
        let c = polybius[y][x];
        if (c === undefined) {
            c = '?';
        }
        clockkey += c;
        c = polybius[y][height - 1 - x];
        if (c === undefined) {
            c = '?';
        }
        counterclockkey += c;
        if (xdelta !== 0) {
            x += xdelta;
            if (x <= xlowlimit || x >= xhighlimit) {
                // Time to turn
                if (lastydelta < 0) {
                    ylowlimit++;
                } else {
                    yhighlimit--;
                }
                x -= xdelta;
                lastxdelta = xdelta;
                xdelta = 0;
                ydelta = -lastydelta;
                y += ydelta;
            }
        } else {
            y += ydelta;
            if (y <= ylowlimit || y >= yhighlimit) {
                // time to turn
                if (lastxdelta < 0) {
                    xlowlimit++;
                } else {
                    xhighlimit--;
                }
                y -= ydelta;
                lastydelta = ydelta;
                ydelta = 0;
                xdelta = -lastxdelta;
                x += xdelta;
            }
        }
    }
    // Now we have four strings
    // horizkey
    // vertkey
    //
    //
    let bestkey = extractKey(horizkey);
    let trykey = extractKey(vertkey);
    if (trykey.length < bestkey.length) {
        bestkey = trykey;
    }
    trykey = extractKey(clockkey);
    if (trykey.length < bestkey.length) {
        bestkey = trykey;
    }
    trykey = extractKey(counterclockkey);
    if (trykey.length < bestkey.length) {
        bestkey = trykey;
    }
    return bestkey;
}
/**
 * Converts the number of seconds to the timestamp interval value
 * @param seconds number of seconds to convert
 * @returns number of miliseconds in a timestamp
 */
export function timestampFromSeconds(seconds: number): number {
    return seconds * 1000;
}
/**
 * Format an interval as hh:mm:ss if it is greater than an hour and mm:ss if it is under an hour
 * @param interval Interval in milliseconds to convert to a displayable type
 */
export function formatTime(interval: number): string {
    let result = '';
    let minutepad = ' ';
    interval /= timestampFromSeconds(1);
    // Only put the hour on there if the interval is more than an hour.
    const hours = Math.trunc(interval / (60 * 60));
    if (hours > 0) {
        result = String(hours).padStart(2, ' ') + ':';
        interval -= hours * 60 * 60;
        minutepad = '0';
    } else {
        result = '   ';
    }
    const minutes = Math.trunc(interval / 60);
    const seconds = Math.trunc(interval % 60);
    result += String(minutes).padStart(2, minutepad) + ':' + String(seconds).padStart(2, '0');
    return result;
}
/**
 * Converts the number of minutes to the timestamp interval value
 * @param seconds number of minutes to convert
 * @returns number of miliseconds in a timestamp
 */
export function timestampFromMinutes(minutes: number): number {
    return minutes * 60 * 1000;
}
/**
 * Converts the number of weeks to the timestamp interval value
 * @param weeks number of weeks to convert
 * @returns number of milliseconds in a timestamp
 */
export function timestampFromWeeks(weeks: number): number {
    // days in a week * hours in a day * minutes in an hour * seconds in a minute * milliseconds in a second.
    return weeks * 7 * 24 * 60 * 60 * 1000;
}
/**
 * Converts a timestamp value into an ISO format string that can be passed as a value for
 * datetime-local input fields.  Normally converting a value to ISO String generates
 * a  24 character result in the format:
 *     2020-09-06T10:40:31.358Z    -- Value
 *     YYYY-MM-DDTHH:MM:SS.mmmZ    -- Interpretation of fields
 *     000000000111111111122222    -- Offset
 *     123456789012345678901234
 * If you want to edit the time just to the minute, you need to have the first 16 characters:
 *     2020-09-06T10:40
 * If you want to edit to the second, you need the three more characters to get to 19:
 *     2020-09-06T10:40:31
 *
 * Note that the miliseconds and the Z get chopped because they don't seem to be tolerated by
 * the datetime-local input field.
 *
 * If you want a good tool for printing out epoch values: https://www.epochconverter.com/
 * @param datetime Timestamp to convert
 * @param includeseconds? True says to include the seconds in the output format
 * @returns Localized time stamp in ISO format
 */
export function timestampToISOLocalString(datetime: number, includeseconds?: boolean): string {
    const tzOffset = timestampFromMinutes(new Date().getTimezoneOffset());
    const dateobj = new Date(datetime - tzOffset);
    const iso = dateobj.toISOString();
    let len = 16;
    if (includeseconds !== undefined && includeseconds) {
        len += 3;
    }
    return iso.substr(0, len);
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Generate a friendly date.
 * @param datetime Timestamp to be printed
 * @returns string human readable localized time
 */
export function timestampToFriendly(datetime: number, includeTime = true): string {
    // dd-MMM-yy hh:mm ap
    const date = new Date(datetime);
    const month = MONTHS[date.getMonth()];
    const day = date.getDate();
    const year = date
        .getFullYear()
        .toString()
        .substring(2);
    let hours = date.getHours();
    let minutes: string = date.getMinutes().toString();
    if (minutes.length === 1) {
        minutes = '0' + minutes;
    }
    let ampm = ' AM';
    if (hours >= 12) {
        ampm = ' PM';
        if (hours > 12) {
            hours %= 12;
        }
    }
    if (hours === 0) {
        hours = 12;
    }

    let dateStamp = day + '-' + month + '-' + year;
    if (includeTime) {
        const timeStamp = hours + ':' + minutes + ampm;
        dateStamp += ' ' + timeStamp;
    }
    return dateStamp;
}
/**
 * A timestamp which represents as far into the future as possible.  For now
 * we assume the limitaions of a 32 bit signed integer
 *   https://en.wikipedia.org/wiki/Year_2038_problem
 * at some point in the future this probably should be updated..
 * @type number Timestamp representing forever
 */
export const timestampForever = new Date('1-1-2038').valueOf();
/**
 * calloutTypes are the various callout renderings based on
 * Foundation
 * see:  https://get.foundation/sites/docs/callout.html
 */
export type calloutTypes = 'secondary' | 'primary' | 'success' | 'warning' | 'alert';
/**
 * makeCallout constructs a callout
 * @param content Content for the callout
 * @param type Type of callout (default=alert)
 * @returns HTML Dom for callout
 */
export function makeCallout(
    content: string | JQuery<HTMLElement>,
    type?: calloutTypes
): JQuery<HTMLElement> {
    if (type === undefined) {
        type = 'alert';
    }
    const callout = $('<div/>', {
        class: 'callout ' + type,
    });
    if (jQuery.type(content) === 'string') {
        callout.text(content as string);
    } else {
        callout.append(content);
    }
    return callout;
}
