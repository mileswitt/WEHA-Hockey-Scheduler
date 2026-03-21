import pandas as pd
import re
import io

REQUIRED_COLUMNS = {"First", "Last", "YEARS PLAYED"}
USED_COLUMNS = ["First", "Last", "YEARS PLAYED"]


def clean_experience(val):
    #Parse years played — return 0 if missing or unparseable.
    if pd.isna(val):
        return 0
    match = re.search(r"\d+", str(val))
    return int(match.group()) if match else 0


def validate_columns(df):
    #Check that required columns exist in the dataframe.
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")


def load_players_from_csv(file_stream):
    #Read a CSV file stream, validate it, and return a clean list of player dicts with name and experience.
    
    try:
        content = file_stream.read().decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("File could not be decoded. Please upload a UTF-8 encoded CSV.")

    try:
        df = pd.read_csv(io.StringIO(content), usecols=lambda c: c in USED_COLUMNS)
    except Exception as e:
        raise ValueError(f"Could not parse CSV: {str(e)}")

    validate_columns(df)

    # Drop empty rows
    df = df.dropna(how="all")

    # Build name and experience columns
    df["name"] = (
        df["First"].fillna("").str.strip() + " " +
        df["Last"].fillna("").str.strip()
    ).str.strip()

    df["experience"] = df["YEARS PLAYED"].apply(clean_experience)

    # Drop rows with no name
    df = df[df["name"] != ""]

    if df.empty:
        raise ValueError("No valid players found in the CSV.")

    return df[["name", "experience"]].to_dict(orient="records")