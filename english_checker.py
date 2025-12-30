import csv
import sys
from enchant import DictWithPWL
from enchant.checker import SpellChecker
from nltk.corpus import wordnet as wn
import nltk

# Use a personal word list so proper nouns etc. are not wrongly flagged
dict_en = DictWithPWL("en_US")   # you can change to en_GB if you prefer

def is_valid_english(word):
    word_lower = word.lower()
    # Quick dictionary check
    if dict_en.check(word_lower):
        return "Yes"
    # Some words are missing from enchant but are real (especially rare/archaic ones)
    if wn.synsets(word_lower):
        return "Yes"
    # Allow known proper suffixes on real roots (e.g. "cat's")
    if word_lower.endswith("'s") or word_lower.endswith("s'"):
        root = word_lower.rstrip("'s")
        if dict_en.check(root) or wn.synsets(root):
            return "Yes"
    return "No"

def get_pos_and_def(word):
    word_lower = word.lower()
    synsets = wn.synsets(word_lower)
    if not synsets:
        return "", ""
    # Take the most common sense
    ss = synsets[0]
    pos_map = {"n": "noun", "v": "verb", "a": "adjective", "r": "adverb", "s": "adjective (satellite)"}
    pos = pos_map.get(ss.pos(), ss.pos())
    definition = ss.definition().split(";")[0].split("(")[0].strip()
    # Keep it very short
    definition = definition[:80] + ("..." if len(definition) > 80 else "")
    return pos, definition

def process_file(input_file, output_file):
    with open(input_file, newline='', encoding='utf-8') as infile, \
         open(output_file, 'w', newline='', encoding='utf-8') as outfile:

        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        writer.writerow(["Word", "IsValidEnglish", "PartOfSpeech", "ShortDefinition"])

        for row in reader:
            if not row:
                continue
            word = row[0].strip()
            if not word:
                continue

            valid = is_valid_english(word)
            pos = ""
            defin = ""
            if valid == "Yes":
                pos, defin = get_pos_and_def(word)

            writer.writerow([word, valid, pos, defin])
            print(f"Processed: {word} → {valid}")

    print(f"\nDone! Results saved to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python english_checker.py input.csv output.csv")
        print("   Put all your words (one per line or in one column) in input.csv")
        sys.exit(1)
    process_file(sys.argv[1], sys.argv[2])