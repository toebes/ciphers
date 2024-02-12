/**
 * Copyright (c) 2023 John Toebes
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
export function classListAdd(elem: HTMLElement, classlist: string) {
    classlist.split(' ').forEach((val: string) => {
        elem.classList.add(val);
    });
}

export function createDocumentElement(
    tagName: string,
    attributes?: { [index: string]: string }
): HTMLElement {
    const elem = document.createElement(tagName);
    if (attributes !== undefined && attributes !== null) {
        for (let attr in attributes) {
            if (attr === 'class') {
                classListAdd(elem, attributes[attr]);
            } else if (attr === 'textContent') {
                elem.textContent = attributes[attr];
            } else {
                elem.setAttribute(attr, attributes[attr]);
            }
        }
    }
    return elem;
}
/**
 * Create an HTML Dom Element from a string
 * from https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro
 * var td = htmlToElement('<td>foo</td>'),
 *   div = htmlToElement('<div><span>nested</span> <span>stuff</span></div>');
 *
 * @param {String} HTML representing a single element
 * @return {Element}
 */
export function htmlToElement(html: string): ChildNode {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

export function getCSSRule(selector: string): CSSStyleRule | null {
    // Get all style sheets on the page
    const styleSheets = document.styleSheets;

    // Iterate through each style sheet
    for (let i = 0; i < styleSheets.length; i++) {
        const styleSheet = styleSheets[i] as CSSStyleSheet;

        // Iterate through each rule in the style sheet
        for (let j = 0; j < styleSheet.cssRules.length; j++) {
            const rule = styleSheet.cssRules[j];

            // Check if the rule matches the target selector
            if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
                // Return the matching CSSStyleRule
                return rule;
            }
        }
    }

    // If no matching rule is found, return null
    return null;
}
/**
 * Determine the Screen Resolution
 * @returns Pixels Per Inch on the screen
 */
export function getScreenDPI(): number {
    // Create a temporary element to measure inches
    const tempDiv = document.createElement('div');
    tempDiv.style.width = '1in';
    tempDiv.style.height = '1in';
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    document.body.appendChild(tempDiv);

    // Measure the width and height of the temporary element
    const rect = tempDiv.getBoundingClientRect();

    // Remove the temporary element
    document.body.removeChild(tempDiv);

    return rect.width; // Use either width or height, as they should be the same
}
/**
 * Measure an element in the DOM
 * @param element Element to measure
 * @returns [width, height] of the element in inches
 */
export function getElementSizeInInches(element: HTMLElement): { width: number, height: number } {
    if (!element) {
        return { width: 0, height: 0 }
    }
    const rect = element.getBoundingClientRect();
    const dpi = getScreenDPI(); // Get screen DPI
    const widthInInches = rect.width / dpi;
    const heightInInches = rect.height / dpi;
    return {
        width: widthInInches,
        height: heightInInches
    };
}