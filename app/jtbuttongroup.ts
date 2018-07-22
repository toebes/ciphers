export interface JTButtonItem {
    /** Text to appear for the menu item */
    title: string,
    /** Color type for button (primary, secondary, warning, etc) */
    color?: "Primary" | "Secondary" | "Success" | "Warning" | "Alert"
    /** Optional id for the item */
    id?: string
    /** Initial enable/disabled status for the button */
    disabled?: boolean
    /** Optional additional class to add to the item */
    class?: string
}

/** Options passed when creating the button with JQuery */
interface JQbtnOptions {
    type: string
    class: string
    value: string
    id?: string
    disabled?: boolean

}
/**
 * Creates a submenu from a menuitem array
 */
export function JTButtonGroup(submenu: JTButtonItem[]): JQuery<HTMLElement> {
    let buttons = $("<div/>", { class: "button-group round cmds" })
    for (let item of submenu) {
        let options: JQbtnOptions = {
            type: "button", class: "button", value: item.title
        }
        if (item.color !== undefined) {
            options.class += " " + item.color
        }
        if (item.class !== undefined) {
            options.class += " " + item.class
        }

        if (item.id !== undefined) {
            options.id = item.id
        }
        if (item.disabled !== undefined) {
            options.disabled = item.disabled
        }
        buttons.append($("<input/>", options))
    }
    return buttons
}
