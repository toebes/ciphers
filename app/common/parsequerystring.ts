import { StringMap } from '../common/ciphercommon';

/** parses the query string
 *  From https://www.malcontentboffin.com/2016/11/TypeScript-Function-Decodes-URL-Parameters.html
 *  If no string is passed, it uses the default query string associated with the current window
 *  Returns a map of key/value pairs.  For multiple occurances of a key, the value is returned as
 *  an array.  e.g.
 *    ?a=1&b=2&c=3&a=4
 *  returns
 *     params["a"] = ["1", "4"]
 *     params["b"] = "2"
 *     params["c"] = "3"
 */

export function parseQueryString(queryString: string): StringMap {
    // if the query string is NULL
    if (queryString == null) {
        queryString = window.location.search.substring(1);
    }

    const params = {};

    const queries = queryString.split('&');

    queries.forEach((indexQuery: string) => {
        const indexPair = indexQuery.split('=');

        const queryKey = decodeURIComponent(indexPair[0]);
        const queryValue = decodeURIComponent(indexPair.length > 1 ? indexPair[1] : '');

        // If we want to handle the multi value case
        if (params[queryKey] !== undefined) {
            if (typeof params[queryKey] === 'string') {
                params[queryKey] = [params[queryKey]];
            }
            params[queryKey].push(queryValue);
        } else {
            params[queryKey] = queryValue;
        }
    });

    return params;
}
