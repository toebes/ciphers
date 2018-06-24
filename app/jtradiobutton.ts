/** Definition of what radio buttons are required */
export interface JTRadioButtonItem {
    id: string
    value: any
    title: string
    class?: string
    disabled?: string
}
export type JTRadioButtonSet = Array<JTRadioButtonItem>
interface RadioButtonOptions {
    id: string
    type: string
    name: string
    value: any
    checked?: string
    class?: string
    disabled?: string
}

export default function JTRadioButton(id: string, label: string, name: string, buttons: JTRadioButtonSet, selected: any): JQuery<HTMLElement> {
    let result = $("<div/>").append($('<label/>', { for: id }).text(label))
    for (let choice of buttons) {
        let options: RadioButtonOptions = { id: choice.id, type: 'radio', name: name, value: choice.value }
        if (choice.value === selected) {
            options.checked = "checked"
        }
        if (choice.class !== undefined){
            options.class = choice.class
        }
        if (choice.disabled !== undefined){
            options.disabled = choice.disabled
        }
        result.append($('<input/>', options))
        result.append($('<label/>', { for: choice.id, class: 'rlab' }).html(choice.title))
    }
    return result
}
