import scrapy
import csv

class CSVStorage:
    def open_spider(self, spider):
        self.playersFile = open("player.csv", "w", encoding="UTF8", newline="")
        self.gamesFile = open("game.csv", "w", encoding="UTF8", newline="")
        self.playersWriter = None
        self.gamesWriter = None

    def process_item(self, item):
        print(f"Header: {item}")
        # The item variable holds columns names and values that were scraped from the website
        extractedItem = dict(item)
        print(f"Values: {extractedItem}")

        header = extractedItem.keys()

        if "playerId" in extractedItem:
            try:
                if self.playersWriter is None:
                    self.playersWriter = csv.DictWriter(self.playersFile, fieldnames=header)
                    self.playersWriter.writeheader()
                self.playersWriter.writerow(extractedItem)
            except Exception as e:
                    print(f"ERROR: {e}\n")
        if "teamId" in extractedItem:
            try:
                if self.gamesWriter is None:
                    self.gamesWriter = csv.DictWriter(self.gamesFile, fieldnames=header)
                    self.gamesWriter.writeheader()
                self.gamesWriter.writerow(extractedItem)
            except Exception as e:
                    print(f"ERROR: {e}\n")
        return item
    
    def close_spider(self, spider):
        self.playersFile.close()
        self.gamesFile.close()
