# -*- coding: utf-8 -*-
"""
Proverbia scraper - English/commented version

This script scrapes quotes and proverbs from https://proverbia.net/.
It lets you search by author/philosopher, show the quote of the day,
browse by topic, show proverbs, show the featured author, show the weekly
selection, or choose a random author.

Note: Be polite when scraping public websites. Consider adding a delay
between requests if you expand this script for bulk downloads.
"""

from bs4 import BeautifulSoup
import requests
from random import choice
from datetime import datetime
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://proverbia.net/"
NOW = datetime.now()

HEADERS = {
    # A normal user-agent helps avoid sites rejecting the default Python requests user-agent.
    "User-Agent": "Mozilla/5.0 (compatible; ProverbiaScraper/1.0)"
}


def get_soup(url: str) -> BeautifulSoup:
    """Download a web page and return it as a BeautifulSoup object."""
    page = requests.get(url, headers=HEADERS, timeout=30, verify=False)
    page.raise_for_status()
    return BeautifulSoup(page.content, "html.parser")


def ask_yes_no(prompt: str) -> bool:
    """Ask the user a 1/2 yes/no question. Returns True for yes."""
    response = input(f"""\n{prompt}
    1) Yes
    2) No
    -> """).strip()
    return response == "1"


def print_quotes_with_authors(soup: BeautifulSoup, skip_paragraphs: int = 0) -> int:
    """
    Print quote paragraphs with their authors.

    Returns the number of quotes printed.
    Some Proverbia pages contain an introductory <p>, so skip_paragraphs
    lets us ignore one or more paragraphs at the start.
    """
    quotes = soup.find_all("p")[skip_paragraphs:]
    authors = soup.select("footer > a")

    for index, quote in enumerate(quotes, start=1):
        author = authors[index - 1].get_text().strip() if index - 1 < len(authors) else "Unknown"
        print(f"[{index}] {quote.get_text().strip()} -> {author}")

    return len(quotes)


def print_quotes_only(soup: BeautifulSoup, skip_paragraphs: int = 0) -> int:
    """Print quote paragraphs without author names. Returns the number printed."""
    quotes = soup.find_all("p")[skip_paragraphs:]

    for index, quote in enumerate(quotes, start=1):
        print(f"[{index}] {quote.get_text().strip()}")

    return len(quotes)


def show_paginated_author_quotes(author_name: str, start_page: int = 1) -> None:
    """Show pages of quotes for one author until the user stops or no more pages exist."""
    page_number = start_page

    while True:
        if page_number == 1:
            soup = get_soup(f"{BASE_URL}buscar?t={author_name}")
        else:
            soup = get_soup(f"{BASE_URL}buscar/{page_number}?t={author_name}")

        if page_number > 1:
            print(f"\nPage {page_number}")

        count = print_quotes_with_authors(soup)

        if count == 0:
            print("No more results for this author.")
            return

        if not ask_yes_no("Do you want to continue with this author?"):
            return

        page_number += 1


def show_paginated_topic_quotes(topic_slug: str, topic_title: str, skip_paragraphs: int = 1) -> None:
    """Show pages of quotes for a topic until the user stops or no more pages exist."""
    page_number = 1

    while True:
        if page_number == 1:
            soup = get_soup(f"{BASE_URL}{topic_slug}")
            print(f"\nQuotes about {topic_title}: ")
        else:
            soup = get_soup(f"{BASE_URL}{topic_slug}/{page_number}")
            print(f"\nPage {page_number}")

        count = print_quotes_with_authors(soup, skip_paragraphs=skip_paragraphs)

        if count == 0:
            print("No more results for this topic.")
            return

        if not ask_yes_no("Do you want to continue with this topic?"):
            return

        page_number += 1


def search_philosopher() -> None:
    """Ask for a philosopher/author name and show their most famous quotes."""
    author_name = input("Enter the name of the philosopher/author you want to search for: ").strip()
    show_paginated_author_quotes(author_name)


def quote_of_the_day() -> None:
    """
    Show the quote of the day from the home page.
    Then optionally show more quotes by the same author.
    """
    soup = get_soup(BASE_URL)

    quote = soup.p
    author = soup.footer.a

    if quote is None or author is None:
        print("Could not find the quote of the day.")
        return

    quote_text = quote.get_text().strip()
    author_text = author.get_text().strip()

    print(f'Quote of the Day: "{quote_text}"')
    print(f"Author: {author_text}")

    # Kept from the original script. This could be written to a file later.
    record = f"{quote_text} - {author_text} - {NOW.date()}"

    if ask_yes_no(f"Would you like to see more quotes from {author_text}?"):
        show_paginated_author_quotes(author_text)


def quotes_by_topic() -> None:
    """Let the user choose a quote topic, then show quotes for that topic."""
    soup = get_soup(f"{BASE_URL}tematica/index")
    topics = soup.find_all("h2", class_="my-1")

    if not topics:
        print("No topics were found.")
        return

    print("")
    for index, topic in enumerate(topics, start=1):
        print(f"{index}) {topic.get_text().strip()}")

    print("")
    try:
        topic_number = int(input("Which topic would you like to search?\n    -> ").strip())
    except ValueError:
        print("Invalid selection. Exiting...")
        return

    if topic_number < 1 or topic_number > len(topics):
        print("Invalid selection. Exiting...")
        return

    topic_title = topics[topic_number - 1].get_text().strip()

    # The original script hard-coded this special case.
    if topic_number == 7:
        topic_slug = "frases-de-pensamiento-y-razon"
        topic_title = "Thought and Reason"
    else:
        topic_slug = f"frases-de-{topic_title.lower()}"

    # The original script skipped two paragraphs for topic #5. Most topics skip one.
    skip_paragraphs = 2 if topic_number == 5 else 1

    show_paginated_topic_quotes(topic_slug, topic_title.capitalize(), skip_paragraphs=skip_paragraphs)


def proverbs() -> None:
    """Show pages of Spanish proverbs."""
    page_number = 1

    while True:
        if page_number == 1:
            soup = get_soup(f"{BASE_URL}refranes")
        else:
            soup = get_soup(f"{BASE_URL}refranes/{page_number}")
            print(f"\nPage {page_number}")

        count = print_quotes_only(soup)

        if count == 0:
            print("No more proverbs were found.")
            return

        if not ask_yes_no("Do you want to continue viewing more proverbs?"):
            return

        page_number += 1


def featured_author() -> None:
    """Show the currently featured author and their most famous quotes."""
    soup = get_soup(BASE_URL)
    author = soup.find("h5", class_="card-title")

    if author is None:
        print("Could not find the featured author.")
        return

    author_name = author.get_text().strip()
    print(f"\nThe featured author is: {author_name}")
    print("\nTheir most famous quotes are:")

    show_paginated_author_quotes(author_name)


def weekly_selection() -> None:
    """Show the weekly quote selection from the home page."""
    print("Weekly Selection:")
    soup = get_soup(BASE_URL)

    authors = soup.select("footer > a")[1:]
    quotes = soup.find_all("p")[2:9]

    for index, quote in enumerate(quotes, start=1):
        author = authors[index - 1].get_text().strip() if index - 1 < len(authors) else "Unknown"
        print(f"[{index}] {quote.get_text().strip()} -> {author}")


def random_author() -> None:
    """Choose a random author and show their most famous quotes."""
    authors = [
        "Platón", "Aristóteles", "Asimov", "Heráclito", "Demócrito",
        "Sócrates", "Pitágoras", "Epicuro", "Averroes", "Descartes",
        "Locke", "Oscar Wilde", "Kant", "Hegel", "Karl Marx", "Tolkien",
        "Nietzsche", "Cervantes", "Nicolás Maquiavelo", "Confucio", "Comte",
    ]

    author_name = choice(authors)
    print(f"The selected author is: {author_name}")

    show_paginated_author_quotes(author_name)


def main() -> None:
    """Display the main menu and run the selected action."""
    try:
        selection = int(input("""What would you like to do?
    1) Search philosopher/author
    2) Quote of the Day
    3) Quotes by topic
    4) Proverbs
    5) Featured Author
    6) Weekly Selection
    7) Random Author
    -> """).strip())
    except ValueError:
        print("Invalid selection. Exiting...")
        return

    if selection == 1:
        search_philosopher()
    elif selection == 2:
        quote_of_the_day()
    elif selection == 3:
        quotes_by_topic()
    elif selection == 4:
        proverbs()
    elif selection == 5:
        featured_author()
    elif selection == 6:
        weekly_selection()
    elif selection == 7:
        random_author()
    else:
        print("Exiting...")


if __name__ == "__main__":
    main()
