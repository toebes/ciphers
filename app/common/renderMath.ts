import * as katex from 'katex';

/**
 * Render a LaTeX math string with katex.
 * See https://khan.github.io/KaTeX/docs/supported.html for everything supported
 * @param str LaTeX formatted string
 */
export function renderMath(str: string): JQuery<HTMLElement> {
    return $(katex.renderToString(str));
}
