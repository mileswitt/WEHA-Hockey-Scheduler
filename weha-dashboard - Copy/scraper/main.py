"""
main.py — Entry point for the WEHA web scraper.
Searches Gamesheet's API for matching seasons, validates them,
then runs the spider sequence to populate the MySQL database.
"""

import sys

try:
    import mysql.connector  # noqa: F401
except ImportError:
    print("ERROR: mysql-connector-python is not installed. Run: pip install mysql-connector-python")
    sys.exit(1)

import asyncio
loop = asyncio.SelectorEventLoop()
asyncio.set_event_loop(loop)
from twisted.internet import asyncioreactor
asyncioreactor.install(eventloop=loop)

from HelperClasses.SearchSeason import SearchSeason
from HelperClasses.RunSpiders import RunSpiders


def main():
    print("Starting Web Scrape")
    try:
        seasonNameQueryInputs = ["WEHA", "WCHL", "Winter Gunnison", "Town League"]
        searchResults = SearchSeason().SearchSeasonID(seasonNameQueryInputs)
        validSeasons = SearchSeason().getValidSeasons(searchResults)
        RunSpiders().runSpiderProcesses(seasonInfo=validSeasons)
        print("Web Scraping Complete")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
