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
            let match = '/' + href
            let tocheck = '/' + window.location.pathname
            // See if we are at the location of the href and mark it as such
            if (tocheck.substr(tocheck.length - match.length) === match) {
                li.addClass("active")
            }
        }
        let a = $("<a/>", { href: href }).text(item.title)
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
    let result = $("<div/>")
    let titlebar = $("<div/>", { class: "title-bar", 'data-responsive-toggle': id, 'data-hide-for': "medium" })
    $("<button/>", { class: "menu-icon", type: "button", 'data-toggle': id }).appendTo(titlebar)
    $("<div/>", { class: "title-bar-title" }).text("Menu").appendTo(titlebar)
    result.append(titlebar)
    // <div class="title-bar" data-responsive-toggle="example-menu" data-hide-for="medium">
    //   <button class="menu-icon" type="button" data-toggle="example-menu"></button>
    //   <div class="title-bar-title">Menu</div>
    // </div>
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

    //     <div class="top-bar-right">
    //         <ul class="menu">
    //             <li>
    //                 <input type="search" placeholder="Search">
    //             </li>
    //             <li>
    //                 <button type="button" class="button">Search</button>
    //             </li>
    //         </ul>
    //     </div>
    // </div>
    return result.children()
}

// let topbarleft = $("<div/>", { class: "top-bar-left" })
// let dropdownmenu = $("<ul/>", { class: "dropdown menu", 'data-dropdown-menu': "" })
// $("<li/>", { class: "menu-text" }).text("Cipher Tools").appendTo(dropdownmenu)
// let filemenu = $("<li>")
// filemenu.append($("<a>", { href: "#" }).text("File"))
// let fileelems = $("<ul/>", { class: "menu vertical" })
// $("<li/>").append($("<a/>", { href: "#" }).text("New")).appendTo(fileelems)
// $("<li/>").append($("<a/>", { href: "#" }).text("Open...")).appendTo(fileelems)
// $("<li/>").append($("<a/>", { href: "#" }).text("Save")).appendTo(fileelems)
// $("<li/>").append($("<a/>", { href: "#" }).text("Save As...")).appendTo(fileelems)
// $("<li/>").append($("<a/>", { href: "#" }).text("Submit")).appendTo(fileelems)
// filemenu.append(fileelems)
// dropdownmenu.append(filemenu)
// topbarleft.append(dropdownmenu)
// return topbarleft;

// <div class="title-bar" data-responsive-toggle="example-menu" data-hide-for="medium">
//   <button class="menu-icon" type="button" data-toggle="example-menu"></button>
//   <div class="title-bar-title">Menu</div>
// </div>

// <div class="top-bar" id="example-menu">
// <div class="top-bar-left">
//     <ul class="dropdown menu" data-dropdown-menu>
//         <li class="menu-text">Cipher Tools</li>
//         <li><a href="#">File</a>
//             <ul class="menu vertical">
//                 <li><a href="#">New</a></li>
//                 <li><a href="#">Open</a></li>
//                 <li><a href="#">Save</a></li>
//                 <li><a href="#">Save As...</a></li>
//                 <li><a href="#">Submit</a></li>
//             </ul>
//         </li>
//             <li>
//                 <a href="#">Edit</a>
//                 <ul class="menu vertical">
//                     <li>
//                         <a href="#">Undo</a>
//                     </li>
//                     <li>
//                         <a href="#">Redo</a>
//                     </li>
//                     <li>
//                         <a href="#">Copy</a>
//                     </li>
//                 </ul>
//             </li>
//             <li>
//                 <a href="#">Other Assistants</a>
//                 <ul class="menu vertical">
//                     <li>
//                         <a href="Solver.html">Aristocrat/Patristocrat Solving Assistant</a>
//                     </li>
//                     <!-- <li>
//                         <a href="MorbitSolver.html">Morbit Solving Assistant</a>
//                     </li>
//                     <li>
//                         <a href="FractionatedMorseSolver.html">Fractionated Morse Solving Assistant</a>
//                     </li>
//                     <li>
//                         <a href="CheckerboardSolver.html">Checkerboard Solving Assistant</a>
//                     </li> -->
//                     <li>
//                         <a href="XenocryptSolver.html">Xenocrypt Solving Assistant</a>
//                     </li>
//                     <!-- <li>
//                         <a href="VigenereSolver.html">Vigen&egrave;re Solving Assistant</a>
//                     </li>
//                     <li>
//                         <a href="GromarkSolver.html">Gromark Solving Assistant</a>
//                     </li> -->
//                     <li>
//                         <a href="CryptarithmSolver.html">Cryptarithm Solving Assistant</a>
//                     </li>
//                 </ul>
//             </li>
//             <li>
//                 <a href="#">Encryption Tools</a>
//                 <ul class="menu vertical">
//                     <li>
//                         <a href="AffineEncrypt.html">Affine</a>
//                     </li>
//                     <li>
//                         <a href="CipherCounter.html">Cipher Counter</a>
//                     </li>
//                     <li>
//                         <a href="AristocratEncrypt.html">Aristocrat Encoder</a>
//                     </li>
//                     <li>
//                         <a href="AristocratSpanishEncrypt.html">Spanish Aristocrat Encoder</a>
//                     </li>
//                     <li>
//                         <a href="XenocryptEncrypt.html">Xenocrypt Encoder</a>
//                     </li>
//                     <li>
//                         <a href="PatristocratEncrypt.html">Patristocrat Encoder</a>
//                     </li>
//                     <li>
//                         <a href="DancingMenEncrypt.html">Dancing Men Encoder</a>
//                     </li>
//                     <li>
//                         <a href="HillEncrypt.html">Hill Encoder (2x2 and 3x3)</a>
//                     </li>
//                     <li>
//                         <a href="VigenereEncrypt.html">Vigen&egrave;re Encoder</a>
//                     </li>
//                     <li>
//                         <a href="GenLanguage.html">Language Template Processor</a>
//                     </li>
//                 </ul>
//             </li>
//         </ul>
//     </div>
//     <div class="top-bar-right">
//         <ul class="menu">
//             <li>
//                 <input type="search" placeholder="Search">
//             </li>
//             <li>
//                 <button type="button" class="button">Search</button>
//             </li>
//         </ul>
//     </div>
// </div>
