import { ICipherType } from "./ciphertypes";
import { parseQueryString } from "./parsequerystring";

export interface menuItem {
    /** Text to appear for the menu item */
    title: string,
    /** Any sub menu items to include under this */
    menu?: menuItem[]
    /** Action to execute when selecting the item */
    action?: string
    /** URL to jump to when selecting the menu item */
    href?: string
    /** Optional additional class to add to the item */
    classname?: string
    /** Optional Cipher Type to add */
    cipherType?: ICipherType
}

/**
 * Creates a submenu from a menuitem array
 */
export function JTAppendSubMenu(parent: JQuery<HTMLElement>, submenu: menuItem[]): void {
    for (let item of submenu) {
        let li = $("<li/>")
        let href = "#"
        if (item.href !== undefined) {
            href = item.href
            if (item.cipherType !== undefined) {
                href += "?cipherType=" + item.cipherType
            }
            let match = '/' + href
            let tocheck = '/' + window.location.pathname
            // See if we are at the location of the href and mark it as such
            if (tocheck.substr(tocheck.length - match.length) === match) {
                li.addClass("active")
            }
        }
        let a = $("<a/>", { href: href }).html(item.title)
        if (item.action !== undefined) {
            a.attr('data-action', item.action)
        }
        if (item.classname !== undefined) {
            a.addClass(item.classname)
        }
        li.append(a)
        if (item.menu !== undefined) {
            let ul = $("<ul/>", { class: "menu vertical" })
            JTAppendSubMenu(ul, item.menu)
            li.append(ul)
        }
        parent.append(li)
    }
}

export function JTCreateMenu(menu: menuItem[], id: string, menutext: string): JQuery<HTMLElement> {
    // let parms = parseQueryString(window.location.search.substring(1))
    // let ciphertype: ICipherType = parms['cipherType'] as ICipherType

    let result = $("<div/>")
    let titlebar = $("<div/>", { class: "title-bar", 'data-responsive-toggle': id, 'data-hide-for': "medium" })
    $("<button/>", { class: "menu-icon", type: "button", 'data-toggle': id }).appendTo(titlebar)
    $("<div/>", { class: "title-bar-title" }).text("Menu").appendTo(titlebar)
    result.append(titlebar)

    let topbar = $("<div/>", { class: "top-bar", id: id })
    let topbarleft = $("<div/>", { class: "top-bar-left" })
    let dropdownmenu = $("<ul/>", { class: "dropdown menu", 'data-dropdown-menu': "" })
    dropdownmenu.append($("<li/>", { class: "menu-text" }).text(menutext))
    JTAppendSubMenu(dropdownmenu, menu)
    topbarleft.append(dropdownmenu)
    topbar.append(topbarleft)

    let topbarright = $("<div/>", { class: "top-bar-right" })
    let searchmenu = $("<ul/>", { class: "menu" })
    $("<li/>").append($("<input/>", { type: "search", placeholder: "Search" })).appendTo(searchmenu)
    $("<li/>").append($("<button/>", { type: "button", class: "button" }).text("Search")).appendTo(searchmenu)
    topbarright.append(searchmenu)
    topbar.append(topbarright)
    result.append(topbar)

    return result.children()
}

export function JTGetURL(menu: menuItem[], ciphertype: ICipherType): string {
    let url = ""
    for (let item of menu) {
        if (item.cipherType !== undefined && item.cipherType === ciphertype) {
            url = item.href + "?cipherType=" + String(ciphertype)
            return url
        }
        if (item.menu !== undefined) {
            url = JTGetURL(item.menu, ciphertype)
            if (url !== "") {
                return url
            }
        }
    }
    return ""
}
