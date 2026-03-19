import scrapy

from scrapy.crawler import CrawlerProcess
from Spiders import PlayersSpider
from Spiders import GamesSpider

class RunSpiders(scrapy.Spider):
    def runSpiderProcesses(seasonIDChosen, querySeasonTitle):
        # Create Pipeline for data to be stored after web scraping
        process = CrawlerProcess(settings={
            "ITEM_PIPELINES": {
                "Storage.StoreCSV.CSVStorage": 300,
            },
            "LOG_LEVEL": "INFO",
        })

        ## Start Web scraping spider processes

        # This Spider gets all player information
        process.crawl(PlayersSpider, userInputSeasonID=seasonIDChosen)
        # This Spider gets all game information
        process.crawl(GamesSpider, userInputSeasonID=seasonIDChosen, seasonTitle=querySeasonTitle)
        
        # Start all spider processes
        process.start()

    