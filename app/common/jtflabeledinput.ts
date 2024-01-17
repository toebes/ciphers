/**
 * Creates a Foundation labeled text box
 */
/**
 * Generate a nice UI element which has a label and the corresponding input element 
 * @param title Title of the input area
 * @param type Type of input area
 * @param id Id of the input area for retrieving/setting data
 * @param value Initial value
 * @param sizeClass Any classes to apply to the base div for the area
 * @param parm1 Optional parameter for the field (slider left side text)
 * @param parm2 Optional parameter for the field (slider right side text)
 * @returns A DOM element of the labeled string
 */
export function JTFLabeledInput(
    title: string,
    type: 'text' | 'number' | 'file' | 'textarea' | 'richtext' | 'checkbox' | 'checkboxr' | 'password' | 'readonly' | 'slider',
    id: string,
    value: number | string | boolean,
    sizeClass: string,
    parm1?: string | JQuery<HTMLElement>, // Used for slider left side
    parm2?: string, // Used for slider right side
): JQuery<HTMLElement> {
    const inputgroup = $('<div/>', { class: 'input-group' });
    const label = $('<span/>', { class: 'input-group-label' }).text(title)
    if (type !== 'checkboxr') { label.appendTo(inputgroup); }
    if (type === 'richtext') {
        $('<div/>', {
            id: id,
            class: 'input-group-field richtext',
            value: value,
        }).appendTo(inputgroup);
    } else if (type === 'textarea') {
        $('<textarea/>', {
            id: id,
            class: 'input-group-field',
            rows: 5,
        })
            .text(value)
            .appendTo(inputgroup);
    } else if (type === 'checkbox' || type === 'checkboxr') {
        // For a checkbox, the value is a boolean indicated that it should be checked
        const checkbox =
            $('<input/>', {
                id: id,
                class: 'input-group-button checkbox',
                type: 'checkbox'
            })
        if (value as boolean) {
            checkbox.prop('checked', 'checked')
        }
        checkbox.appendTo(inputgroup);
        if (type === 'checkboxr') {
            label.appendTo(inputgroup);
        }
    } else if (type === 'readonly') {
        $('<p/>', {
            id: id,
            class: 'input-group-field readonly',
        }).text(value)
            .appendTo(inputgroup);
    } else if (type === 'slider') {
        $('<div/>', { class: "grid-x input-group-field" })
            .append($('<div/>', { class: "cell shrink stext" }).text(parm1 as string))
            .append(
                $('<div/>', { class: "cell auto slider", id: id + '_base', 'data-slider': "", 'data-initial-start': value, 'data-end': "100" })
                    .append($('<span/>', { class: "slider-handle", 'data-slider-handle': "", 'role': "slider", 'tabindex': "1" }))
                    .append($('<span/>', { class: "slider-fill", 'data-slider-fill': "" }))
                    .append($('<input/>', { type: "hidden", id: id })))
            .append($('<div/>', { class: "cell shrink stext" }).text(parm2))
            .appendTo(inputgroup);
    } else {
        $('<input/>', {
            id: id,
            class: 'input-group-field',
            type: type,
            value: value,
        }).appendTo(inputgroup);
        if (parm1 !== undefined) {
            inputgroup.append(parm1)
        }
    }
    return $('<div/>', { class: 'cell ' + sizeClass }).append(inputgroup);
}

export function JTFLabeledInputApply(
    title: string,
    type: 'text' | 'number' | 'file' | 'textarea' | 'richtext',
    id: string,
    value: number | string,
    sizeClass: string,
    applyid: string,
    applyTitle: string
): JQuery<HTMLElement> {
    const inputgroup = $('<div/>', { class: 'input-group' });
    inputgroup.append($('<span/>', { class: 'input-group-label' }).text(title));
    if (type === 'richtext') {
        inputgroup.append(
            $('<div/>', {
                id: id,
                class: 'input-group-field richtext',
                value: value,
            })
        );
    } else if (type === 'textarea') {
        inputgroup.append(
            $('<textarea/>', {
                id: id,
                class: 'input-group-field',
                rows: 5,
            }).text(value)
        );
    } else {
        inputgroup.append(
            $('<input/>', {
                id: id,
                class: 'input-group-field',
                type: type,
                value: value,
            })
        );
    }

    inputgroup.append(
        $('<div/>', { class: 'input-group-button' }).append(
            $('<input/>', {
                class: 'button round',
                id: applyid,
                value: applyTitle,
            })
        )
    );

    return $('<div/>', { class: 'cell ' + sizeClass }).append(inputgroup);
}
