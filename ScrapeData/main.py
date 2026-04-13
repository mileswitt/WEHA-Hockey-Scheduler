# -*- coding: utf-8 -*-
"""
Created on Mon Mar  9 13:29:06 2026

@author: djibr
"""

# Must be installed before any other Twisted/Scrapy imports.
# Spiders use `async def start()` which requires the asyncio reactor.
# Windows defaults to ProactorEventLoop which Twisted doesn't support — switch to SelectorEventLoop first.
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
if __name__ == "__main__":
    main()