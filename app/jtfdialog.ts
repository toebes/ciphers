/**
 * Create a container for a Foundation dialog
 */
export function JTFDialog(
    id: string,
    title: string,
    content: JQuery<HTMLElement>,
    okid: string,
    oktitle: string
): JQuery<HTMLElement> {
    // The dialog has a top bar with a title indicating the purpose of the dialog
    // The data-reveal class keeps it hidden
    let dlg = $("<div/>", {
        class: "reveal",
        id: id,
        "data-reveal": ""
    }).append(
        $("<div/>", { class: "top-bar Primary" }).append(
            $("<div/>", { class: "top-bar-left" }).append(
                $("<h3/>").text(title)
            )
        )
    );
    // Of course we need the content for the dialog
    dlg.append(content);
    // With a Cancel and an ok button
    let buttongroup = $("<div/>", { class: "expanded button-group" })
        .append(
            $("<a/>", { class: "secondary button", "data-close": "" }).text(
                "Cancel"
            )
        )
        .append(
            $("<a/>", { class: "button", disabled: "true", id: okid }).text(
                oktitle
            )
        );
    dlg.append(buttongroup);
    // Plus we need a close button at the top of the dialog
    dlg.append(
        $("<button/>", {
            class: "close-button",
            "data-close": "",
            "aria-label": "Close reveal",
            type: "button"
        }).append($("<span/>", { "aria-hidden": true }).html("&times;"))
    );
    return dlg;
}