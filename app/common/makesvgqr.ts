import { Ecc, QrCode } from 'qr-code-generator/typescript-javascript/qrcodegen'

/**
 * Generate a SVG version of a QR code to encode a string passed in.
 * @param content Content string to be encoded as a QR Code
 * @param ecc QR code redundancy.  One Ecc.LOW|MEDIUM|QUARTILE|HIGH default=MEDIUM
 * @param darkColor CSS Color of dark part Default=black
 * @param lightColor CSS Color of light part Default=white
 * @param border Width of border. Default = 4
 * @returns 
 */
export function makeSVGQR(content: string,
    ecc: Ecc = Ecc.MEDIUM,
    darkColor: string = "black",
    lightColor: string = "white",
    border: number = 4): SVGSVGElement {
    const qr = QrCode.encodeText(content, ecc);

    // Create a SVG canvas for us to draw into
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('viewBox', '0 0 ' + (qr.size + border * 2) + " " + (qr.size + border * 2));
    svg.setAttribute('stroke', 'none');
    svg.classList.add('qrcode');

    if (border < 0) {
        border = 4
    }
    let parts: Array<string> = [];
    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y))
                parts.push(`M${x + border},${y + border}h1v1h-1z`);
        }
    }
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('fill', lightColor);
    svg.append(rect);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', parts.join(' '));
    path.setAttribute('fill', darkColor);
    svg.append(path);

    return svg;
}
