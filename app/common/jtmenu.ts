import { ICipherType } from './ciphertypes';

export interface menuItem {
    /** Text to appear for the menu item */
    title: string;
    /** Any sub menu items to include under this */
    menu?: menuItem[];
    /** Action to execute when selecting the item */
    action?: string;
    /** URL to jump to when selecting the menu item */
    href?: string;
    /** Optional additional class to add to the item */
    classname?: string;
    /** Optional Cipher Type to add */
    cipherType?: ICipherType;
    /** Ciphers accepted for solving */
    solveType?: ICipherType[];
    /** Optional Language */
    lang?: string;
    /** This menu item is for a solver */
    solver?: boolean;
}

/**
 * Creates a submenu from a menuitem array
 */
export function JTAppendSubMenu(parent: JQuery<HTMLElement>, submenu: menuItem[]): void {
    for (const item of submenu) {
        const li = $('<li/>');
        let href = '#';
        if (item.href !== undefined) {
            href = item.href;
            if (item.cipherType !== undefined) {
                href += '?cipherType=' + item.cipherType;
            }
            if (item.lang !== undefined) {
                if (href.includes("?")) href += '&curlang=' + item.lang;
                else href += '?curlang=' + item.lang;
            }
            const match = '/' + href;
            const tocheck = '/' + window.location.pathname;
            // See if we are at the location of the href and mark it as such
            if (tocheck.substr(tocheck.length - match.length) === match) {
                li.addClass('active');
            }
        }
        if (item.classname === 'divider') {
            li.addClass('divider');
        } else {
            const a = $('<a/>', {
                href: href,
            }).html(item.title);
            if (item.action !== undefined) {
                a.attr('data-action', item.action);
            }
            if (item.classname !== undefined) {
                a.addClass(item.classname);
            }
            li.append(a);
            if (item.menu !== undefined) {
                a.addClass('is-dropdown-submenu-parent');
                const ul = $('<ul/>', { class: 'menu vertical' });
                JTAppendSubMenu(ul, item.menu);
                li.append(ul);
            }
        }
        parent.append(li);
    }
}

export function JTCreateMenu(
    menu: menuItem[],
    id: string,
    menutext: string,
    extra?: JQuery<HTMLElement>
): JQuery<HTMLElement> {
    // let parms = parseQueryString(window.location.search.substring(1))
    // let ciphertype: ICipherType = parms['cipherType'] as ICipherType

    const result = $('<div/>', { class: 'mainmenubar' });
    const titlebar = $('<div/>', {
        class: 'title-bar',
        'data-responsive-toggle': id,
        'data-hide-for': 'medium',
    });
    $('<button/>', {
        class: 'menu-icon',
        type: 'button',
        'data-toggle': id,
    }).appendTo(titlebar);
    $('<div/>', { class: 'title-bar-title' })
        .text('Menu')
        .appendTo(titlebar);
    result.append(titlebar);

    const topbar = $('<div/>', { class: 'top-bar stacked-for-medium', id: id });

    const topbarleft = $('<div/>', { class: 'top-bar-left' });
    if (extra !== null) {
        topbarleft.append(extra);
    }

    const dropdownmenu = $('<ul/>', {
        class: 'dropdown menu',
        'data-dropdown-menu': '',
    });
    dropdownmenu.append(
        $('<li/>', { class: 'menu-text' }).append($('<a/>', { href: 'index.html' }).text(menutext))
    );
    JTAppendSubMenu(dropdownmenu, menu);
    topbarleft.append(dropdownmenu);
    topbar.append(topbarleft);

    const topbarright = $('<div/>', { class: 'top-bar-right' });
    // let searchmenu = $("<ul/>", { class: "menu" });
    // $("<li/>")
    //     .append($("<input/>", { type: "search", placeholder: "Search" }))
    //     .appendTo(searchmenu);
    // $("<li/>")
    //     .append(
    //         $("<button/>", { type: "button", class: "button" }).text("Search")
    //     )
    //     .appendTo(searchmenu);
    // topbarright.append(searchmenu);
    topbar.append(topbarright);
    result.append(topbar);

    return result;
}

export function JTGetURL(menu: menuItem[], ciphertype: ICipherType, lang: string): string {
    let url = '';
    // Handle the case where we saved a cipher with Xenocrypt instead of
    // Aristocrat in order to look it up.
    if (ciphertype === ICipherType.Xenocrypt) {
        ciphertype = ICipherType.Aristocrat;
    }
    // Handle temporary rename of DancingMen to RunningMen
    if (ciphertype === ICipherType.RunningMen) {
        ciphertype = ICipherType.DancingMen;
    }
    for (const item of menu) {
        if (item.cipherType !== undefined && item.cipherType === ciphertype && item.lang === lang) {
            url = item.href + '?cipherType=' + String(ciphertype);
            return url;
        }
        if (item.menu !== undefined) {
            url = JTGetURL(item.menu, ciphertype, lang);
            if (url !== '') {
                return url;
            }
        }
    }
    return '';
}

export function JTGetSolveURL(menu: menuItem[], ciphertype: ICipherType): string {
    let url = '';
    for (const item of menu) {
        if (item.solveType !== undefined && item.solveType.indexOf(ciphertype) !== -1) {
            return item.href;
        }
        if (item.menu !== undefined) {
            url = JTGetSolveURL(item.menu, ciphertype);
            if (url !== '') {
                return url;
            }
        }
    }
    return '';
}
