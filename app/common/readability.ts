import { syllable } from 'syllable';
const punctuationRE = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]/g;
import { easyWordSet } from './easywords';

export function copySign(x: number, y: number): number {
    return x * (y / Math.abs(y));
}
export function legacyRound(number: number, points = 0): number {
    const p = 10 ** points;
    // return float(math.floor((number * p) + math.copysign(0.5, number))) / p
    return Math.floor(number * p + copySign(0.5, number)) / p;
}
export function getDisplayGrade(grade: number): string {
    grade = Math.floor(grade);
    let result = String(grade);
    // poor export function fix this, gives { 22th and 23th grade }
    const gradeMap = {
        1: 'st',
        2: 'nd',
        3: 'rd',
    };
    if (gradeMap[grade]) {
        result += gradeMap[grade];
    } else {
        result += 'th';
    }
    return result;
}
export function charCount(text: string, ignoreSpaces = true): number {
    if (ignoreSpaces) {
        text = text.replace(/ /g, '');
    }
    return text.length;
}
export function removePunctuation(text: string): string {
    text = text.replace(punctuationRE, '');
    return text;
}
export function letterCount(text: string, ignoreSpaces = true): number {
    if (ignoreSpaces) {
        text = text.replace(/ /g, '');
    }
    return removePunctuation(text).length;
}
export function splitset(text: string): string[] {
    let textset = text.split(/,| |\n|\r/g);
    textset = textset.filter((n) => n);
    return textset;
}
export function lexiconCount(text: string): number {
    let textset = text.split(/,| |\n|\r/g);
    textset = textset.filter((n) => n);
    return textset.length;
}
export function syllableCount(text: string, lang = 'en-US'): number {
    text = text.toLocaleLowerCase();
    text = removePunctuation(text);
    if (!text) {
        return 0;
    }
    // eventually replace syllable
    const count = syllable(text);
    return count; //  js lib overs compared to python
}
export function sentenceCount(text: string): number {
    let ignoreCount = 0;
    const sentences = text.split(/ *[.?!]['")\]]*[ |\n](?=[A-Z])/g);
    for (const sentence of sentences) {
        if (lexiconCount(sentence) <= 2) {
            ignoreCount += 1;
        }
    }
    const validSentences = sentences.length - ignoreCount;
    return validSentences > 1 ? validSentences : 1;
}
export function averageSentenceLength(text: string): number {
    const asl = lexiconCount(text) / sentenceCount(text);
    const returnVal = legacyRound(asl, 1);
    return !isNaN(returnVal) ? returnVal : 0.0;
}
export function averageSyllablePerWord(text: string): number {
    const syllables = syllableCount(text);
    const words = lexiconCount(text);
    const syllablePerWord = syllables / words;
    const returnVal = legacyRound(syllablePerWord, 1);
    return !isNaN(returnVal) ? returnVal : 0.0;
}

export function averageCharacterPerWord(text: string): number {
    const charactersPerWord = charCount(text) / lexiconCount(text);
    const returnVal = legacyRound(charactersPerWord, 2);
    return !isNaN(returnVal) ? returnVal : 0.0;
}
export function averageLetterPerWord(text: string): number {
    const lettersPerWord = letterCount(text) / lexiconCount(text);
    const returnVal = legacyRound(lettersPerWord, 2);
    return !isNaN(returnVal) ? returnVal : 0.0;
}
export function averageSentencePerWord(text: string): number {
    const sentencesPerWord = sentenceCount(text) / lexiconCount(text);
    const returnVal = legacyRound(sentencesPerWord, 2);
    return !isNaN(returnVal) ? returnVal : 0.0;
}
export function fleschReadingEase(text: string): number {
    const sentenceLength = averageSentenceLength(text);
    const syllablesPerWord = averageSyllablePerWord(text);
    const flesch = 206.835 - 1.015 * sentenceLength - 84.6 * syllablesPerWord;
    const returnVal = legacyRound(flesch, 2);
    return returnVal;
}

export function fleschKincaidGrade(text: string): number {
    const sentenceLength = averageSentenceLength(text);
    const syllablePerWord = averageSyllablePerWord(text);
    const flesch = 0.39 * sentenceLength + 11.8 * syllablePerWord - 15.59;
    const returnVal = legacyRound(flesch, 1);
    return returnVal;
}
export function polySyllableCount(text: string): number {
    let count = 0;
    let wrds;
    for (const word of splitset(text)) {
        wrds = syllableCount(word);
        if (wrds >= 3) {
            count += 1;
        }
    }
    return count;
}
export function smogIndex(text: string): number {
    const sentences = sentenceCount(text);
    if (sentences >= 3) {
        const polySyllab = polySyllableCount(text);
        const smog = 1.043 * (30 * (polySyllab / sentences)) ** 0.5 + 3.1291;
        const returnVal = legacyRound(smog, 1);
        return !isNaN(returnVal) ? returnVal : 0.0;
    }
    return 0.0;
}
export function colemanLiauIndex(text: string): number {
    const letters = legacyRound(averageLetterPerWord(text) * 100, 2);
    const sentences = legacyRound(averageSentencePerWord(text) * 100, 2);
    const coleman = 0.058 * letters - 0.296 * sentences - 15.8;
    return legacyRound(coleman, 2);
}
export function automatedReadabilityIndex(text: string): number {
    const characters = charCount(text);
    const words = lexiconCount(text);
    const sentences = sentenceCount(text);

    const averageCharacterPerWord = characters / words;
    const averageWordPerSentence = words / sentences;
    const readability =
        4.71 * legacyRound(averageCharacterPerWord, 2) +
        0.5 * legacyRound(averageWordPerSentence, 2) -
        21.43;
    const returnVal = legacyRound(readability, 1);
    return !isNaN(returnVal) ? returnVal : 0.0;
}
export function linsearWriteFormula(text: string): number {
    let easyWord = 0;
    let difficultWord = 0;
    const textList = splitset(text).slice(0, 100);

    if (textList) {
        for (const word of textList) {
            if (syllableCount(word) < 3) {
                easyWord += 1;
            } else {
                difficultWord += 1;
            }
        }
    }
    text = textList.join(' ');
    const number = (easyWord * 1 + difficultWord * 3) / sentenceCount(text);
    let returnVal = number <= 20 ? (number - 2) / 2 : number / 2;
    returnVal = legacyRound(returnVal, 1);
    return !isNaN(returnVal) ? returnVal : 0.0;
}
export function difficultWords(text: string, syllableThreshold = 2): number {
    const textList = text.match(/[\w=‘’]+/g);
    let difficultWordCount = 0;
    if (textList) {
        for (const word of textList) {
            if (!easyWordSet.has(word) && syllableCount(word) >= syllableThreshold) {
                difficultWordCount++;
            }
        }
    }
    return difficultWordCount;
}
export function daleChallReadabilityScore(text: string): number {
    const wordCount = lexiconCount(text);
    const count = wordCount - difficultWords(text);
    const per = (count / wordCount) * 100;
    if (isNaN(per)) {
        return 0.0;
    }
    const diffWordCount = 100 - per;
    // console.log('difficult words : ', difficultWords)
    let score = 0.1579 * diffWordCount + 0.0496 * averageSentenceLength(text);
    if (diffWordCount > 5) {
        score += 3.6365;
    }
    return legacyRound(score, 2);
}
export function gunningFog(text: string): number {
    const perDiffWords = (difficultWords(text, 3) / lexiconCount(text)) * 100;
    const grade = 0.4 * (averageSentenceLength(text) + perDiffWords);
    const returnVal = legacyRound(grade, 2);
    return !isNaN(returnVal) ? returnVal : 0.0;
}
export function lix(text: string): number {
    const words = splitset(text);
    const wordsLen = words.length;
    const longWords = words.filter((wrd) => wrd.length > 6).length;
    const perLongWords = (longWords * 100) / wordsLen;
    const asl = averageSentenceLength(text);
    const lix = asl + perLongWords;
    return legacyRound(lix, 2);
}
export function rix(text: string): number {
    const words = splitset(text);
    const longWordsCount = words.filter((wrd) => wrd.length > 6).length;
    const sentencesCount = sentenceCount(text);
    const rix = longWordsCount / sentencesCount;
    return !isNaN(rix) ? legacyRound(rix, 2) : 0.0;
}
export function textStandardRaw(text: string): number {
    const grade = [];
    // Appending Flesch Kincaid Grade
    let lower = legacyRound(fleschKincaidGrade(text));
    let upper = Math.ceil(fleschKincaidGrade(text));
    grade.push(Math.floor(lower));
    grade.push(Math.floor(upper));

    let score = fleschReadingEase(text);
    if (score < 100 && score >= 90) {
        grade.push(5);
    } else if (score < 90 && score >= 80) {
        grade.push(6);
    } else if (score < 80 && score >= 70) {
        grade.push(7);
    } else if (score < 70 && score >= 60) {
        grade.push(8);
        grade.push(9);
    } else if (score < 60 && score >= 50) {
        grade.push(10);
    } else if (score < 50 && score >= 40) {
        grade.push(11);
    } else if (score < 40 && score >= 30) {
        grade.push(12);
    } else {
        grade.push(13);
    }

    // console.log('grade till now: \n', grade)

    lower = legacyRound(smogIndex(text));
    upper = Math.ceil(smogIndex(text));
    grade.push(Math.floor(lower));
    grade.push(Math.floor(upper));

    // Appending Coleman_Liau_Index
    lower = legacyRound(colemanLiauIndex(text));
    upper = Math.ceil(colemanLiauIndex(text));
    grade.push(Math.floor(lower));
    grade.push(Math.floor(upper));

    // Appending Automated_Readability_Index
    lower = legacyRound(automatedReadabilityIndex(text));
    upper = Math.ceil(automatedReadabilityIndex(text));
    grade.push(Math.floor(lower));
    grade.push(Math.floor(upper));

    // console.log('grade till now : 2 : \n', grade)

    // Appending  Dale_Chall_Readability_Score
    lower = legacyRound(daleChallReadabilityScore(text));
    upper = Math.ceil(daleChallReadabilityScore(text));
    grade.push(Math.floor(lower));
    grade.push(Math.floor(upper));

    // Appending linsearWriteFormula
    lower = legacyRound(linsearWriteFormula(text));
    upper = Math.ceil(linsearWriteFormula(text));
    grade.push(Math.floor(lower));
    grade.push(Math.floor(upper));

    // Appending Gunning Fog Index
    lower = legacyRound(gunningFog(text));
    upper = Math.ceil(gunningFog(text));
    grade.push(Math.floor(lower));
    grade.push(Math.floor(upper));

    // d = Counter(grade)
    // final_grade = d.most_common(1)
    // score = final_grade[0][0]

    // if float_output:
    //     return float(score)
    // else:
    //     lower_score = int(score) - 1
    //     upper_score = lower_score + 1
    //     return "{}{} and {}{} grade".format(
    //         lower_score, get_grade_suffix(lower_score),
    //         upper_score, get_grade_suffix(upper_score)
    //     )
    // Finding the Readability Consensus based upon all the above tests
    // console.log('grade List: ', grade)
    const counterMap = grade.map((x) => [x, grade.filter((y) => y === x).length]);
    const finalGrade = counterMap.reduce((x, y) => (y[1] >= x[1] ? y : x));
    score = finalGrade[0];
    // makes sure the difficulty level displayed doesn't go below 0 (-1th grade)
    if (score < 1) {
        score = 1;
    }
    return score;
}

export function textStandard(text: string): string {
    const score = textStandardRaw(text);
    const lowerScore = Math.floor(score) - 1;
    const upperScore = lowerScore + 1;
    return getDisplayGrade(lowerScore) + ' and ' + getDisplayGrade(upperScore) + ' grade';
}
