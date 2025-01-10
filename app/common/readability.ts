import { syllable } from 'syllable';
const punctuationRE = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-\.\/:;<=>\?@[\]^_`{|}~]/g;
import { easyWordSet } from './easywords';

export function copySign(x: number, y: number): number {
    return x * (y / Math.abs(y));
}
export function legacyRound(number: number, points = 0): number {
    const p = 10 ** points;
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
    let textset = text.split(/[, \n\r]+/g);
    textset = textset.filter((n) => n);
    return textset;
}
export function lexiconCount(text: string): number {
    let textset = text.split(/[, \n\r]+/g);
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
    const sentences = text.split(/ *[\.\?!]['")\]]*[ |\n](?=[A-Z])/g);
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

export function getWeightAtPosition(center: number, position: number): number {
    const stdDev = 1; // Fixed standard deviation
    const maxHeight = 10; // Fixed maximum height at the center
    const sqrtTwoPi = Math.sqrt(2 * Math.PI);

    // Compute the scaling factor to ensure maxHeight at the center
    const scalingFactor = maxHeight * stdDev * sqrtTwoPi;

    // Compute the exponent for the normal distribution formula
    const exponent = -((position - center) ** 2) / (2 * stdDev ** 2);

    // Compute and return the height using the PDF of the normal distribution
    return (1 / (stdDev * sqrtTwoPi)) * Math.exp(exponent) * scalingFactor;
}

export function markGradeScore(score: number, gradefreq: number[]) {
    const topIndex = Math.ceil(score + 3)
    const bottomIndex = Math.max(0, Math.floor(score - 3))
    while (gradefreq.length <= topIndex) {
        gradefreq.push(0);
    }
    for (let i = bottomIndex; i <= topIndex; i++) {
        gradefreq[i] += getWeightAtPosition(score, i)
    }
}

export function findConsensus(gradefreq: number[]) {
    let mostCommon = -1;
    let commonsum = 0;
    let commoncount = 1;
    for (let i = 0; i < gradefreq.length; i++) {
        if (gradefreq[i] > mostCommon) {
            commonsum = i;
            commoncount = 1;
            mostCommon = gradefreq[i];
        } else if (gradefreq[i] === mostCommon) {
            commonsum += i;
            commoncount++;
        }
    }
    return Math.floor(commonsum / commoncount);
}

export function mapfleschReadingEase(input: number): number {
    const mapping = [
        { x: 100, y: 5 },
        { x: 90, y: 6 },
        { x: 80, y: 7 },
        { x: 70, y: 8 },
        { x: 60, y: 10 },
        { x: 50, y: 11 },
        { x: 40, y: 12 },
        { x: 30, y: 13 },
        { x: 0, y: 20 }
    ];

    // Clamp input between 0 and 100
    if (input >= 100) return 5;
    if (input <= 0) return 20;

    // Find the two nearest points for interpolation
    for (let i = 0; i < mapping.length - 1; i++) {
        const p1 = mapping[i];
        const p2 = mapping[i + 1];

        if (input <= p1.x && input >= p2.x) {
            // Linear interpolation formula
            const proportion = (input - p2.x) / (p1.x - p2.x);
            return p1.y + proportion * (p2.y - p1.y);
        }
    }
}

export function textStandardRaw(text: string): number {
    text = text.replace(/[\s\n\r]+/g, ' ');

    const gradeFreq = [];

    // Flesch Kincaid Grade
    let fkG = fleschKincaidGrade(text)
    markGradeScore(fkG, gradeFreq);

    // flesch Reading Ease
    let score = fleschReadingEase(text);
    let fleschReading = mapfleschReadingEase(score);
    markGradeScore(fleschReading, gradeFreq);

    // smog Index
    const smogI = smogIndex(text)
    if (smogI > 0) {
        markGradeScore(smogI, gradeFreq);
    }

    // Coleman Liau Index
    const colemanLiau = colemanLiauIndex(text);
    markGradeScore(colemanLiau, gradeFreq);

    // Automated Readability Index
    const automatedReadability = automatedReadabilityIndex(text);
    markGradeScore(automatedReadability, gradeFreq);

    // Dale Chall Readability Score
    const daleChall = daleChallReadabilityScore(text);
    markGradeScore(daleChall, gradeFreq);

    // linsear Write Formula
    const linsearWrite = linsearWriteFormula(text);
    markGradeScore(linsearWrite, gradeFreq);

    // Gunning Fog Index
    const gunningFogVal = gunningFog(text);
    markGradeScore(gunningFogVal, gradeFreq);

    score = findConsensus(gradeFreq);
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
