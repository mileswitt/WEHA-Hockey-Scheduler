
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings

from Spiders import PlayersSpider
from Spiders import GamesSpider
from Spiders import GoaliesSpider

class RunSpiders():
    def __init__(self):
        pass

    def runSpiderProcesses(self, seasonInfo):
        # Create Pipeline for data to be stored after web scraping
        settings = get_project_settings()
        settings.update({
            "ITEM_PIPELINES": {
                "Storage.StoreMysql.MysqlStorage": 300,
            },
            "LOG_LEVEL": "ERROR",
            "TELNETCONSOLE_ENABLED": False,
        })

        process = CrawlerProcess(settings=settings)

        for seasonId, seasonTitle in seasonInfo.items():
            process.crawl(GamesSpider, seasonID=seasonId, seasonTitle=seasonTitle)
            process.crawl(PlayersSpider, seasonID=seasonId)
            process.crawl(GoaliesSpider, seasonID=seasonId)

        process.start()
        print("Writing to CSV/MYSQL Complete")