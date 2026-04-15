# WEHA Hockey Scheduler

## Project Structure

```
WEHA-Hockey-Scheduler/
├── venv/               <- Python virtual environment (you create this)
├── Backend/            <- Node.js Express server
│   ├── .env            <- Backend environment variables (you create this)
│   └── routes/
│       └── Scraper.js
└── ScrapeData/         <- Python web scraper (Scrapy)
    ├── .env            <- Scraper DB credentials (you create this)
    ├── .env.example    <- Template for .env
    └── requirements.txt
```

---

## Setup 
---

### Step 1 — Create the Python venv file

From the **`WEHA-Hockey-Scheduler/`** root directory (not inside `ScrapeData`):

```powershell
cd WEHA-Hockey-Scheduler
python -m venv venv
```

---

### Step 2 — Install Python Dependencies

```powershell
venv\Scripts\pip install -r ScrapeData\requirements.txt
```

---

### Step 3 — Create the ScrapeData `.env` File

Copy the example file and fill in your database credentials:

```powershell
copy ScrapeData\.env.example ScrapeData\.env
```

Then open `ScrapeData/` and create .env file:

```
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=3306
```

---

### Step 4 — Install Node.js Dependencies

cd Backend
npm install


### Step 5 — Create the Backend `.env` File

Inside `Backend/`, create a `.env` file with the following:

.env Structure
```
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=3306
PYTHON_VENV_PATH=../../venv/Scripts/python.exe <- path to venv file
WEBSCRAPER_PATH=../../ScrapeData/main.py <- path to script to run for webscraping action
```

> The `PYTHON_VENV_PATH` and `WEBSCRAPER_PATH` are relative to `Backend/routes/` 

---

### Step 6 — Run the Backend Server

From the `Backend/` directory in a terminal run:

node index.js


Output Should be:
```
Server Listening on Port: http://127.0.0.1:5000/
```

---

### Step 7 — Run the Web Scraper

Use the `test_webscrape.http` file in `ScrapeData/` and send a POST request to `/api/runWebScrape`, or use a tool like Postman to simulate webscraping request.
