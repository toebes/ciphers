/** Definition of what radio buttons are required */
export interface JTRadioButtonItem {
    id?: string;
    value: any;
    title: string;
    class?: string;
    disabled?: string;
}
export type JTRadioButtonSet = Array<JTRadioButtonItem>;
interface RadioButtonOptions {
    id?: string;
    type: string;
    name: string;
    value: any;
    class?: string;
    disabled?: string;
}

export function JTRadioButton(
    width: number,
    name: string,
    buttons: JTRadioButtonSet,
    selected: any
): JQuery<HTMLElement> {
    let result = $("<div/>", { class: "grid-x" });
    let cellclass = "cell medium-" + width + " medium-offset-2";
    if (width === 0) {
        cellclass = "cell";
    }
    let cell = $("<div/>", { class: "noprint " + cellclass });
    let appmenu = $("<div/>", {
        class: "mobile-app-toggle",
        "data-mobile-app-toggle": "",
    });
    for (let choice of buttons) {
        let options: RadioButtonOptions = {
            type: "radio",
            name: name,
            value: choice.value,
            class: "button",
        };
        if (choice.id !== undefined) {
            options.id = choice.id;
        }
        if (choice.value === selected) {
            options.class += " is-active";
        }
        if (choice.class !== undefined) {
            options.class += " " + choice.class;
        }
        if (choice.disabled !== undefined) {
            options.disabled = choice.disabled;
        }
        appmenu.append($("<button/>", options).html(choice.title));
    }
    cell.append(appmenu);
    result.append(cell);
    return result;
}

export function JTRadioButtonSet(name: string, selected: any): void {
    $('[name="' + name + '"]').removeClass("is-active");
    $('[name="' + name + '"][value="' + selected + '"]').addClass("is-active");
}