import os
from scrapy.crawler import CrawlerRunner
from scrapy.utils.project import get_project_settings
from twisted.internet import reactor, defer

from Spiders import PlayersSpider
from Spiders import GamesSpider
from Spiders import GoaliesSpider


class RunSpiders():
    def __init__(self):
        pass

    def runSpiderProcesses(self, seasonInfo):
        settings = get_project_settings()
        settings.update({
            "ITEM_PIPELINES": {
                "Storage.StoreMySQL.MySQLStorage": 300,
            },
            "TWISTED_REACTOR": "twisted.internet.asyncioreactor.AsyncioSelectorReactor",
            "LOG_LEVEL": "ERROR",
            "TELNETCONSOLE_ENABLED": False,
        })

        runner = CrawlerRunner(settings=settings)

        # GamesSpider must finish for ALL seasons before Players/Goalies start.
        # This ensures League, Season, Division, and Team rows exist in the DB
        # before InsertPlayerTeam tries to look them up.
        @defer.inlineCallbacks
        def crawlSequentially():
            for seasonId, seasonTitle in seasonInfo.items():
                yield runner.crawl(GamesSpider, seasonID=seasonId, seasonTitle=seasonTitle)
            for seasonId in seasonInfo.keys():
                yield runner.crawl(PlayersSpider, seasonID=seasonId)
                yield runner.crawl(GoaliesSpider, seasonID=seasonId)
            reactor.stop()

        def handleError(failure):
            print(f"ERROR in crawl sequence: {failure.getErrorMessage()}")
            reactor.stop()
            os._exit(1)  # sys.exit is swallowed by Twisted's reactor; os._exit bypasses it

        d = crawlSequentially()
        d.addErrback(handleError)
        reactor.run()
        print("Web scraping and MySQL storage complete")
