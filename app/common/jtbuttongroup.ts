export interface JTButtonItem {
    /** Text to appear for the menu item */
    title: string;
    /** Color type for button (primary, secondary, warning, etc) */
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'alert';
    /** Optional id for the item */
    id?: string;
    /** Initial enable/disabled status for the button */
    disabled?: boolean;
    /** Optional additional class to add to the item */
    class?: string;
    download?: boolean;
    href?: string;
    target?: string;
}

/** Options passed when creating the button with JQuery */
interface JQbtnOptions {
    type: string;
    class: string;
    value: string;
    id?: string;
    disabled?: boolean;
    download?: string;
    href?: string;
    target?: string;
}
/**
 * Creates a submenu from a menuitem array
 */
export function JTButtonGroup(submenu: JTButtonItem[]): JQuery<HTMLElement> {
    const buttons = $('<div/>', { class: 'button-group round shrink cmds' });
    for (const item of submenu) {
        const options: JQbtnOptions = {
            type: 'button',
            class: 'button',
            value: item.title,
        };
        if (item.color !== undefined) {
            options.class += ' ' + item.color;
        }
        if (item.class !== undefined) {
            options.class += ' ' + item.class;
        }

        if (item.id !== undefined) {
            options.id = item.id;
        }
        if (item.disabled !== undefined) {
            options.disabled = item.disabled;
        }
        if (item.download) {
            options.download = '';
        }
        if (item.href) {
            options.href = item.href;
        }
        if (item.target) {
            options.target = item.target;
        }
        buttons.append($('<a/>', options).text(item.title));
    }
    return $('<div/>', { class: 'grid-x' }).append(buttons);
}
