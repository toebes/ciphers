export type alphaEquivType = ('above' | 'below' | 'alt' | 'plain')  // | 'center'  (doesn't exist)
export interface alphaInfo {
    combining?: string  // Character to append to make the combining character
    fixed?: string // Single pre-combined unicode versions (if any)
    type: alphaEquivType // The general position of the combining character
    name?: string // The name of the equivalent Set
    problems?: string // Letters which aren't properly rendered in this font
}
export const alphaEquivOrder = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * alphaEquiv is the set of all the unicode combining sets.  Sometimes Unicode already has a precombined
 * character (such as À) which doesn't need a combining glyph to create it.  We try to generate them if they
 * are known.
 */
export const alphaEquiv: { [index: string]: alphaInfo } = {
    //          0  1  2  3  4  5  6  7  8  9  A  B  C  E  E  F
    // U+030x	◌̀	◌́	◌̂	◌̃	◌̄	◌̅	◌̆	◌̇	◌̈	◌̉	◌̊	◌̋	◌̌	◌̍	◌̎	◌̏
    // U+031x	◌̐	◌̑	◌̒	◌̓	◌̔	◌̕	◌̖	◌̗	◌̘	◌̙	◌̚	◌̛	◌̜	◌̝	◌̞	◌̟
    // U+032x	◌̠	◌̡	◌̢	◌̣	◌̤	◌̥	◌̦	◌̧	◌̨	◌̩	◌̪	◌̫	◌̬	◌̭	◌̮	◌̯
    // U+033x	◌̰	◌̱	◌̲	◌̳	◌̴	◌̵	◌̶	◌̷	◌̸	◌̹	◌̺	◌̻	◌̼	◌̽	◌̾	◌̿
    // U+034x	◌̀	◌́	◌͂	◌̓	◌̈́	◌ͅ	◌͆	◌͇	◌͈	◌͉	◌͊	◌͋	◌͌	◌͍	◌͎	 CGJ 
    // U+035x	◌͐	◌͑	◌͒	◌͓	◌͔	◌͕	◌͖	◌͗	◌͘	◌͙	◌͚	◌͛	◌͜◌	◌͝◌	◌͞◌	◌͟◌
    // U+036x  ◌͠◌	◌͡◌	◌͢◌	◌ͣ	◌ͤ	◌ͥ	◌ͦ	◌ͧ	◌ͨ	◌ͩ	◌ͪ	◌ͫ	◌ͬ	◌ͭ	◌ͮ	◌ͯ


    // ' ': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    'GRAVE': { type: 'above', combining: '\u0300', fixed: 'À   È   Ì     Ò     Ù Ẁ Ỳ à   è   ì    ǹò     ù ẁ ỳ ' }, // À
    'DOUBLE GRAVE': { type: 'above', combining: '\u030F', fixed: 'Ȁ   Ȅ   Ȉ     Ȍ  Ȑ  ȔѶ    ȁ   ȅ   ȉ     ȍ  ȑ  ȕѷ    ' },  // Ȁ
    'GRAVE BELOW': { type: 'below', combining: '\u0316', problems: 'j' }, // A̖

    'ACUTE': { type: 'above', combining: '\u0301', fixed: 'Á Ć É Ǵ Í ḰĹḾŃÓṔ  Ś Ú Ẃ ÝŹá ć é ǵ í ḱĺḿńóṕ ŕś ú ẃ ýź', }, // Á
    'DOUBLE ACUTE': { type: 'above', combining: '\u030B' }, // A̋
    'ACUTE BELOW': { type: 'below', combining: '\u0317', problems: 'j' }, // A̗

    'CIRCUMFLEX': { type: 'above', combining: '\u0302', fixed: 'Â Ĉ Ê ĜĤÎĴ    Ô   Ŝ Û Ŵ ŶẐâ ĉ ê ĝĥîĵ    ô   ŝ û ŵ ŷẑ', }, // Â
    'CIRCUMFLEX BELOW': { type: 'below', combining: '\u032D', fixed: '   ḒḘ      Ḽ Ṋ     ṰṶ        ḓḙ      ḽ ṋ     ṱṷ     ', problems: 'j' }, // A̭

    'TILDE': { type: 'above', combining: '\u0303', fixed: 'Ã   Ẽ   Ĩ    ÑÕ     ŨṼ  Ỹ ã   ẽ   ĩ    ñõ     ũṽ  ỹ ', }, // Ã
    'TILDE BELOW': { type: 'below', combining: '\u0330', fixed: '    Ḛ   Ḭ           Ṵ         ḛ   ḭ           ṵ     ', problems: 'j' }, // A̰

    'MACRON': { type: 'above', combining: '\u0304', fixed: 'Ā   Ē Ḡ Ī           Ū   Ȳ ā   ē ḡ ī     ō     ū   ȳ ' }, // Ā
    'MACRON BELOW': { type: 'below', combining: '\u0331', fixed: ' Ḇ Ḏ      ḴḺ Ṉ   Ṟ Ṯ     Ẕ ḇ ḏ   ẖ  ḵḻ ṉ   ṟ ṯ     ẕ', problems: 'j' }, // A̱

    'OVERLINE': { type: 'above', combining: '\u0305' }, // A̅

    'BREVE': { type: 'above', combining: '\u0306', fixed: 'Ă   Ĕ Ğ Ĭ     Ŏ     Ŭ     ă   ĕ ğ ĭ     ŏ     ŭ     ' }, // Ă
    'BREVE BELOW': { type: 'below', combining: '\u032E', problems: 'j' }, // A̮
    'INVERTED BREVE': { type: 'above', combining: '\u0311', fixed: 'Ȃ   Ȇ   Ȋ     Ȏ  Ȓ  Ȗ     ȃ   ȇ   ȋ     ȏ  ȓ  ȗ     ' }, // Ȃ
    'INVERTED BREVE BELOW': { type: 'below', combining: '\u032F', problems: 'j' }, // A̯

    'DOT ABOVE': { type: 'above', combining: '\u0307', fixed: 'ȦḂĊḊĖḞĠḢİ   ṀṄȮṖ ṘṠṪ  ẆẊẎŻȧḃċḋėḟġḣ    ṁṅȯṗ ṙṡṫ  ẇẋẏż', problems: 'ij' }, // Ȧ
    'DOT ABOVE RIGHT': { type: 'above', combining: '\u0358' }, // A͘
    'DOT BELOW': { type: 'below', combining: '\u0323', fixed: 'ẠḄ ḌẸ  ḤỊ Ḳ ṂṆỌ  ṚṢṬỤṾẈ ỴẒạḅ ḍẹ  ḥị ḳḷṃṇọ  ṛṣṭụṿẉ ỵẓ', problems: 'j' }, // Ạ

    'DIAERESIS': { type: 'above', combining: '\u0308', fixed: 'Ä   Ë  ḦÏ     Ö     Ü ẄẌŸ ä   ë  ḧï     ö    ẗü ẅẍÿ ' },  // Ä
    'DIAERESIS BELOW': { type: 'below', combining: '\u0324', problems: 'j' }, // A̤

    'HOOK ABOVE': { type: 'above', combining: '\u0309', fixed: 'Ả   Ẻ   Ỉ     Ỏ     Ủ   Ỷ ả   ẻ   ỉ     ỏ     ủ   ỷ ' }, // Ả

    'RING ABOVE': { type: 'above', combining: '\u030A', fixed: 'Å                   Ů     å                   ů ẘ ẙ ' }, // Å
    'RING BELOW': { type: 'below', combining: '\u0325', problems: 'j' }, // Ḁ

    'CARON': { type: 'above', combining: '\u030C', fixed: 'Ǎ ČĎĚ ǦȞǏǰǨ  ŇǑ  ŘŠŤǓ    Žǎ č ě ǧȟǐ ǩ  ňǒ  řš ǔ    ž', problems: 'Ldt' },  // Ǎ
    'CARON BELOW': { type: 'below', combining: '\u032C', problems: 'j' }, // A̬

    'VERTICAL LINE ABOVE': { type: 'above', combining: '\u030D' }, // A̍
    'DOUBLE VERTICAL LINE ABOVE': { type: 'above', combining: '\u030E' },   // A̎
    'VERTICAL LINE BELOW': { type: 'below', combining: '\u0329', problems: 'j' }, // A̩
    'DOUBLE VERTICAL LINE BELOW': { type: 'below', combining: '\u0348', problems: 'j' }, // A͈

    'COMMA ABOVE RIGHT': { type: 'above', combining: '\u0315' }, // A̕
    'COMMA ABOVE': { type: 'above', combining: '\u0313' }, // A̓
    'COMMA BELOW': { type: 'below', combining: '\u0326', problems: 'j' }, // A̦


    'CANDRABINDU': { type: 'above', combining: '\u0310' },  // A̐

    'LEFT TACK BELOW': { type: 'below', combining: '\u0318', problems: 'j' }, // A̘
    'RIGHT TACK BELOW': { type: 'below', combining: '\u0319', problems: 'j' }, // A̙
    'UP TACK BELOW': { type: 'below', combining: '\u031D', problems: 'j' }, // A̝
    'DOWN TACK BELOW': { type: 'below', combining: '\u031E', problems: 'j' }, // A̞

    'MINUS SIGN BELOW': { type: 'below', combining: '\u0320', problems: 'j' }, // A̠
    'CEDILLA': { type: 'below', combining: '\u0327', fixed: '  ÇḐȨӺĢḨ  ĶĻ Ņ   ŖŞŢ   Ӽ  ᶏᶀçḑȩ ģḩ  ķļᶆņ   ŗşţ ᶌ ӽ ᶎ', problems: 'jg' }, // A̧
    'LOW LINE': { type: 'below', combining: '\u0332', problems: 'j' }, // A̲
    'DOUBLE LOW LINE': { type: 'below', combining: '\u0333', problems: 'j' }, // A̳
    'RIGHT HALF RING BELOW': { type: 'below', combining: '\u0339', problems: 'j' }, // A̹
    'GRAVE TONE MARK': { type: 'above', combining: '\u0340' }, // À
    'ACUTE TONE MARK': { type: 'above', combining: '\u0341' }, // Á
    'GREEK PERISPOMENI': { type: 'above', combining: '\u0342' }, // A͂
    'GREEK KORONIS': { type: 'above', combining: '\u0343' }, // A̓
    'GREEK DIALYTIKA TONOS': { type: 'above', combining: '\u0344' }, // Ä́
    'BRIDGE ABOVE': { type: 'above', combining: '\u0346' }, // A͆
    'EQUALS SIGN BELOW': { type: 'below', combining: '\u0347', problems: 'j' }, // A͇
    'LEFT ANGLE BELOW': { type: 'below', combining: '\u0349', problems: 'j' }, // A͉
    'RIGHT ARROWHEAD ABOVE': { type: 'above', combining: '\u0350' }, // A͐
    'LEFT HALF RING ABOVE': { type: 'above', combining: '\u0351' }, // A͑
    'LEFT ARROWHEAD BELOW': { type: 'below', combining: '\u0354', problems: 'j' }, // A͔
    'RIGHT ARROWHEAD BELOW': { type: 'below', combining: '\u0355', problems: 'j' }, // A͕
    'RIGHT ARROWHEAD AND UP': { type: 'above', combining: '\u0356', problems: 'j' }, // A͖
    'RIGHT HALF RING ABOVE': { type: 'above', combining: '\u0357' }, // A͗
    'ASTERISK BELOW': { type: 'below', combining: '\u0359', problems: 'j' }, // A͙
    'LEFT ANGLE ABOVE': { type: 'above', combining: '\u031A' }, // A̚
    'LEFT HALF RING BELOW': { type: 'below', combining: '\u031C', problems: 'j' }, // A̜
    'PLUS SIGN BELOW': { type: 'below', combining: '\u031F', problems: 'j' }, // A̟
    'BRIDGE BELOW': { type: 'below', combining: '\u032A', problems: 'j' }, // A̪
    'INVERTED DOUBLE ARCH BELOW': { type: 'below', combining: '\u032B', problems: 'j' }, // A̫
    'INVERTED BRIDGE BELOW': { type: 'below', combining: '\u033A', problems: 'j' }, // A̺
    'SQUARE BELOW': { type: 'below', combining: '\u033B', problems: 'j' }, // A̻
    'SEAGULL BELOW': { type: 'below', combining: '\u033C', problems: 'j' }, // A̼
    'X ABOVE': { type: 'above', combining: '\u033D' }, // A̽
    'VERTICAL TILDE': { type: 'above', combining: '\u033E' }, // A̾
    'DOUBLE OVERLINE': { type: 'above', combining: '\u033F' }, // A̿
    'NOT TILDE ABOVE': { type: 'above', combining: '\u034A' }, // A͊
    'HOMOTHETIC ABOVE': { type: 'above', combining: '\u034B' }, // A͋
    'LEFT RIGHT ARROW BELOW': { type: 'below', combining: '\u034D', problems: 'j' }, // A͍
    'UPWARDS ARROW BELOW': { type: 'below', combining: '\u034E', problems: 'j' }, // A͎
    'DOUBLE RING BELOW': { type: 'below', combining: '\u035A', problems: 'j' }, // A͚
    'ZIGZAG ABOVE': { type: 'above', combining: '\u035B' }, // A͛

    'SMALL A': { type: 'above', combining: '\u0363', }, // Aͣ
    'SMALL C': { type: 'above', combining: '\u0368', }, // Aͨ
    'SMALL D': { type: 'above', combining: '\u0369', }, // Aͩ
    'SMALL E': { type: 'above', combining: '\u0364', }, // Aͤ
    'SMALL H': { type: 'above', combining: '\u036A', }, // Aͪ
    'SMALL I': { type: 'above', combining: '\u0365', }, // Aͥ
    'SMALL M': { type: 'above', combining: '\u036B', }, // Aͫ
    'SMALL O': { type: 'above', combining: '\u0366', }, // Aͦ
    'SMALL R': { type: 'above', combining: '\u036C', }, // Aͬ
    'SMALL T': { type: 'above', combining: '\u036D', }, // Aͭ
    'SMALL U': { type: 'above', combining: '\u0367', }, // Aͧ
    'SMALL V': { type: 'above', combining: '\u036E', }, // Aͮ
    'SMALL X': { type: 'above', combining: '\u036F', }, // Aͯ



    // While it would be nice to use all of the combining charcters, some of them don't work properly with the fonts we have
    //  But we keep them here if we ever find a better font to use.
    // 
    // 'X BELOW'                : { type: 'below',  combining: '\u0353' }, // A͓ Does not overlap properly
    // 'REVERSE COMMA ABOVE'    : { type: 'above',  combining: '\u0314', fixed: 'Ἁ   Ἑ  ἩἹ     ὉῬ        Ὑ         ἱ     ὁ     ὑ     ' }, // A̓ Does not overlap properly
    // 'OGONEK'                 : { type: 'below',  combining: '\u0328', fixed: 'Ą   Ę   Į     Ǫ     Ų     ą   ę   į     ǫ     ų     ' }, // Ą Does not overlap properly
    // 'FERMATA'                : { type: 'above',  combining: '\u0352' }, // A͒  Does not overlap properly
    // 'HORN'                   : { type: 'above',  combining: '\u031B' }, // A̛  Does not overlap properly
    // 'ALMOST EQUAL TO ABOVE'  : { type: 'above',  combining: '\u034C' }, // A͌ Does not overlap properly
    // 'PALATALIZED HOOK BELOW' : { type: 'below',  combining: '\u0321' }, // A̡  Does not overlap properly
    // 'RETROFLEX HOOK BELOW'   : { type: 'below',  combining: '\u0322' }, // A̢  Does not overlap properly
    // 'TILDE OVERLAY'          : { type: 'above',  combining: '\u0334' }, // A̴   Does not overlap properly
    // 'SHORT STROKE OVERLAY'   : { type: 'above',  combining: '\u0335' }, // A̵  Does not overlap properly
    // 'LONG STROKE OVERLAY'    : { type: 'center', combining: '\u0336' }, // A̶    Does not overlap properly
    // 'SHORT SOLIDUS OVERLAY'  : { type: 'center', combining: '\u0337' }, // A̷   Does not overlap properly
    // 'LONG SOLIDUS OVERLAY'   : { type: 'center', combining: '\u0338' }, // A̸   Does not overlap properly
    // 'GREEK YPOGEGRAMMENI'    : { type: 'below',  combining: '\u0345' }, // Aͅ  Does not overlap properly
    // 'DOUBLE TILDE'           : { type: 'above',  combining: '\u0360' }, // A͠   Does not overlap properly
    // 'DOUBLE INVERTED BREVE'  : { type: 'above',  combining: '\u0361' }, // A͡  Does not overlap properly
    // 'DOUBLE RIGHTWARDS ARROW': { type: 'below',  combining: '\u0362' }, // A͢  Does not overlap properly
    // 'DOUBLE BREVE BELOW'     : { type: 'below',  combining: '\u035C' }, // A͜  Does not overlap properly
    // 'DOUBLE BREVE'           : { type: 'above',  combining: '\u035D' }, // A͝   Does not overlap properly
    // 'DOUBLE MACRON'          : { type: 'above',  combining: '\u035E' }, // A͞   Does not overlap properly
    // 'DOUBLE MACRON BELOW'    : { type: 'below',  combining: '\u035F' }, // A͟  Does not overlap properly
    // 'TURNED COMMA ABOVE'     : { type: 'above',  combining: '\u0312' }, // A̒ Does not overlap properly
    // 'PSILI'                  : { type: 'above',  fixed: 'Ἀ   Ἐ  ἨἸ     Ὀ                   ἰ     ὀ     ὐ     ' }, // Does not overlap properly
    // 'HOOK'                   : { type: 'above',  fixed: ' ƁƇƊ  Ɠ                    ɓƈɗ  ɠɦ  ƙ ɱ  ƥ  ʂƭ    ƴȥ'},
    // 'DASIA OXIA'             : { type: 'above',  fixed: 'Ἅ   Ἕ  ἭἽ     Ὅ         Ὕ         ἵ     ὅ     ὕ     '},
    // 'DASIA VARIA'            : { type: 'above',  fixed: 'Ἃ   Ἓ  ἫἻ     Ὃ         Ὓ         ἳ     ὃ     ὓ     '},
    // 'OXIA'                   : { type: 'above',  fixed: 'Ά   Έ  ΉΊ     Ό         Ύ         ί     ό           '},
    // 'PSILI OXIA'             : { type: 'above',  fixed: 'Ἄ   Ἔ  ἬἼ     Ὄ                   ἴ     ὄ     ὔ     '},
    // 'PSILI VARIA'            : { type: 'above',  fixed: 'Ἂ   Ἒ  ἪἺ     Ὂ                   ἲ     ὂ     ὒ     '},
    // 'VARIA'                  : { type: 'above',  fixed: 'Ὰ   Ὲ  Ὴ      Ὸ         Ὺ         Ὶ     ὸ           '},
    // 'CIRCUMFLEX ACUTE'       : { type: 'above',  fixed: 'Ấ   Ế         Ố           ấ   ế         ố           '},
    // 'CIRCUMFLEX DOT BELOW'   : { type: 'below',  fixed: 'Ậ   Ệ         Ộ           ậ   ệ         ộ           '},
    // 'CIRCUMFLEX GRAVE'       : { type: 'above',  fixed: 'Ầ   Ề         Ồ           ầ   ề         ồ           '},
    // 'CIRCUMFLEX HOOK ABOVE'  : { type: 'above',  fixed: 'Ẩ   Ể         Ổ           ẩ   ể         ổ           '},
    // 'CIRCUMFLEX TILDE'       : { type: 'above',  fixed: 'Ẫ   Ễ         Ỗ           ẫ   ễ         ỗ           '},
    // 'DIAERESIS MACRON'       : { type: 'above',  fixed: 'Ǟ             Ȫ     Ǖ     ǟ             ȫ     ǖ     '},
    // 'TONOS'                  : { type: 'above',  fixed: 'Ά   Έ  ΉΊ     Ό         Ύ                           '},
    // 'DESCENDER'              : { type: 'below',  fixed: '  Ҫ    Ң  ҚӶ       Ҭ   Ҳ    ҫ    Ԧ  қ        ҭ   ҳ  '},
    // 'MIDDLE TILDE'           : { type: 'center', fixed: '                           ᵬ ᵭ ᵮ     ɫᵯᵰ ᵱ ᵲᵴᵵ     ᵶ'},
    // 'BAR'                    : { type: 'center', fixed: ' ɃꞒĐ  ǤĦƗ  Ƚ   Ꝑ Ɍ ŦɄ  ӾҰƵ ƀꞓđ  ǥħɨɉ ƚ   ᵽꝗɍ ŧᵾ  ӿɏƶ'},
    // 'TURNED'                 : { type: 'alt',    fixed: '    ⅎ⅁    ⅂     ᴚ         ɐ   ǝ ᵷɥᴉ ʞ ɯ    ɹ ʇ Ʌʍ ʎ '},
    // 'CIRCLED'                : { type: 'alt',    fixed: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ' },  // Character is too wide
    // 'PARENTHESIZED'          : { type: 'alt',    fixed: '                          ⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵'},   // No uppercase letters
    'PLAIN': { type: 'plain' }
}

/**
 * fourWayEquiv gives us sets of 4 characters which can be interchanged so that the test taker
 * has to determine which pair is the A and which is the B
 */
export const fourWayEquiv: string[][] = [
/* ÀÁA̖A̗ */['GRAVE', 'ACUTE', 'GRAVE BELOW', 'ACUTE BELOW'],
/* ȦÄẠA̤ */['DOT ABOVE', 'DIAERESIS', 'DOT BELOW', 'DIAERESIS BELOW'],
/* ȦÄẠA̤ */['RING ABOVE', 'DIAERESIS', 'RING BELOW', 'DIAERESIS BELOW'],
/* A̅A̿A̲A̳ */['OVERLINE', 'DOUBLE OVERLINE', 'LOW LINE', 'DOUBLE LOW LINE'],
/* A̍A̎A̩A͈ */['VERTICAL LINE ABOVE', 'DOUBLE VERTICAL LINE ABOVE', 'VERTICAL LINE BELOW', 'DOUBLE VERTICAL LINE BELOW'],
/* ĂȂA̮A̯ */['BREVE', 'INVERTED BREVE', 'BREVE BELOW', 'INVERTED BREVE BELOW'],
/* A̮A̯A̫A̼ */['BREVE BELOW', 'INVERTED BREVE BELOW', 'INVERTED DOUBLE ARCH BELOW', 'SEAGULL BELOW'],
/* ĂȂA̫A̼ */['BREVE', 'INVERTED BREVE', 'INVERTED DOUBLE ARCH BELOW', 'SEAGULL BELOW'],
/* ÂǍA̭A̬ */['CIRCUMFLEX', 'CARON', 'CIRCUMFLEX BELOW', 'CARON BELOW'],
/* ÁÀA̋Ȁ */['ACUTE', 'GRAVE', 'DOUBLE ACUTE', 'DOUBLE GRAVE'],
/* A̋ȀA̗A̖ */['DOUBLE ACUTE', 'DOUBLE GRAVE', 'ACUTE BELOW', 'GRAVE BELOW'],
/* A͑A͗A̜A̹ */['LEFT HALF RING ABOVE', 'RIGHT HALF RING ABOVE', 'LEFT HALF RING BELOW', 'RIGHT HALF RING BELOW'],
/* ĀÃA̱A̰ */['MACRON', 'TILDE', 'MACRON BELOW', 'TILDE BELOW'],
/* ÂA͐A̭A͕ */['CIRCUMFLEX', 'RIGHT ARROWHEAD ABOVE', 'CIRCUMFLEX BELOW', 'RIGHT ARROWHEAD BELOW'],
];
/**
 * Some of these pairs work well together, but don't have a 4 way combo that makes sense
 */
export const pairEquiv: string[][] = [
/* A̓A̦ */['COMMA ABOVE', 'COMMA BELOW'],
/* A̚A͉ */['LEFT ANGLE ABOVE', 'LEFT ANGLE BELOW'],
/* A͆A̪ */['BRIDGE ABOVE', 'BRIDGE BELOW'],
]

/**
 * Generate a string with all of the letters modified by a single set
 * @param str String to modify
 * @param alphaSet Which set to use to modify the string
 * @returns Unicode generated string using the set
 */
export function genEquivString(str: string, alphaSet: alphaInfo): string {
    let result = ""
    for (let c of str) {
        let pos = alphaEquivOrder.indexOf(c)
        if (pos === -1) {
            result += c
        } else {
            let r = ''
            if (alphaSet.fixed !== undefined) {
                r = alphaSet.fixed.charAt(pos)
            }
            if (r !== '' && r !== ' ') {
                result += r
            } else {
                result += c
                if (alphaSet.combining !== undefined) {
                    result += alphaSet.combining
                }

            }
        }
    }
    return result
}
/**
 * Apply two sets of modifiers to a single string, alternating on characters (such as A̅A̲A̅A̲A̅)
 * @param str String to modify
 * @param alphaSet1 Set to apply to all the odd characters in the string
 * @param alphaSet2 Set to apply to all the even characters in the string
 * @returns Modified string
 */
export function genDualEquivString(str: string, alphaSet1: alphaInfo, alphaSet2: alphaInfo): string {
    let result = ""
    let set = alphaSet1
    let other = alphaSet2
    for (let c of str) {
        result += genEquivString(c, set)
        let temp = set
        set = other
        other = temp
    }
    return result
}
/**
 * Check for glyphs which don't render properly
 * @param str String to check
 * @param set Which glyph set to check
 * @returns Boolean indicating that the string is renderable visually with the glyph set
 */
export function validEquivSet(str: string, set: alphaInfo): boolean {
    if (str === undefined || set === undefined) {
        return false
    }
    if (set.problems !== undefined) {
        for (let c of set.problems) {
            if (str.includes(c)) {
                return false
            }
        }
    }
    return true
}
/**
 * Pick two random sets that are considered different
 * @param type1 Type of set for the first set (or undefined to pick a random one)
 * @param type2 Type of set for the second set (or undefined to pick one that pairs with the first one picked)
 * @returns Two sets to work from
 */
export function pickRandomEquivSets(str: string, type1?: alphaEquivType, type2?: alphaEquivType): alphaInfo[] {
    let result: alphaInfo[] = []
    // First pass, pick the initial type
    let best = -1
    let choice = undefined
    for (let spot in alphaEquiv) {
        if (type1 === undefined || alphaEquiv[spot].type === type1) {
            // Make sure that this set doesn't have any problem visual characters
            if (validEquivSet(str, alphaEquiv[spot])) {
                let rnd = Math.random()
                // See if there are any problem characters
                if (rnd > best) {
                    choice = alphaEquiv[spot]
                    choice.name = spot
                    best = rnd
                }
            }
        }
    }
    if (choice !== undefined) {
        result.push(choice)
        let tomatch: alphaEquivType[] = []
        if (type2 !== undefined) {
            tomatch.push(type2)
        } else {
            switch (choice.type) {
                case 'above':
                    tomatch.push('below', 'alt', 'plain')
                    break;
                case 'below':
                    tomatch.push('above', 'alt', 'plain')
                    break;
                case 'alt':
                    tomatch.push('above', 'below', 'plain')
                    break;
                case 'plain':
                    tomatch.push('above', 'below', 'alt')
                    break;

            }
        }
        // We have our possibilities, go through and find a potential match
        best = -1
        choice = undefined
        for (let spot in alphaEquiv) {
            if (tomatch.includes(alphaEquiv[spot].type) && validEquivSet(str, alphaEquiv[spot])) {
                let rnd = Math.random()
                if (rnd > best) {
                    choice = alphaEquiv[spot]
                    choice.name = spot
                    best = rnd
                }
            }
        }
        if (choice !== undefined) {
            result.push(choice)
        }
    }
    return result
}

