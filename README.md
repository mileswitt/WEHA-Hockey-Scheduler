# WEHA Hockey Scheduler

## Setup To Run Code

1. Create and activate a virtual environment (venv):
   ```bash
   python -m venv .venv
   ```
   ```bash
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate  # Mac/Linux
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file and fill in the correct DB credentials (use `.env.example` as a reference) Make sure there are 2 .env files one for the webscraping code at root level and one in the backend folder as well

4. Go to the Backend folder and install Node dependencies:
   ```bash
   cd Backend
   npm install
   ```

5. Run the backend server:
   ```bash
   node index.js
   ```

6. Run the web scraper by using `test_webscrape.http`, and using the first route to make a Post Request.
