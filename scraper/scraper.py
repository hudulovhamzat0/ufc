# scraper_multithreaded.py
import requests
from bs4 import BeautifulSoup
import json
import re
import string
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "http://ufcstats.com/statistics/fighters"
WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"

MAX_THREADS = 50  # adjust based on your connection

def parse_height_to_cm(height_str):
    match = re.match(r"(\d+)'\s*(\d+)", height_str)
    if not match:
        return None
    feet, inches = int(match.group(1)), int(match.group(2))
    return round((feet * 12 + inches) * 2.54, 1)

def parse_weight_to_kg(weight_str):
    match = re.match(r"(\d+)", weight_str)
    if not match:
        return None
    lbs = int(match.group(1))
    return round(lbs * 0.453592, 1)

def fetch_wikipedia_image(first, last):
    for title in [f"{first}_{last}", f"{first} {last}"]:
        try:
            r = requests.get(WIKI_API + title, timeout=5)
            if r.status_code != 200:
                continue
            data = r.json()
            if "originalimage" in data and "source" in data["originalimage"]:
                return data["originalimage"]["source"]
        except:
            continue
    return None

def scrape_fighter_row(row):
    cols = row.find_all("td", class_="b-statistics__table-col")
    if not cols:
        return None

    first = cols[0].get_text(strip=True)
    last = cols[1].get_text(strip=True)

    try:
        wins = int(cols[7].get_text(strip=True))
    except:
        wins = 0
    try:
        losses = int(cols[8].get_text(strip=True))
    except:
        losses = 0
    try:
        draws = int(cols[9].get_text(strip=True))
    except:
        draws = 0

    fighter = {
        "first_name": first,
        "last_name": last,
        "height_cm": parse_height_to_cm(cols[3].get_text(strip=True)),
        "weight_kg": parse_weight_to_kg(cols[4].get_text(strip=True)),
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "image_url": fetch_wikipedia_image(first, last),
    }
    return fighter

def scrape_char(char):
    url = f"{BASE_URL}?char={char}&page=all"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Failed to fetch char={char}: {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table", class_="b-statistics__table")
    if not table:
        return []

    rows = table.find("tbody").find_all("tr", class_="b-statistics__table-row")
    fighters = []

    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = {executor.submit(scrape_fighter_row, row): row for row in rows}
        for future in as_completed(futures):
            fighter = future.result()
            if fighter:
                fighters.append(fighter)
                print(f"[{char.upper()}] {fighter['first_name']} {fighter['last_name']} ✅")
    return fighters

def save_to_json(fighters, filename="fighters.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(fighters, f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    all_fighters = []
    chars = list(string.ascii_lowercase)

    for c in chars:
        fighters = scrape_char(c)
        all_fighters.extend(fighters)

        # Save every 100 fighters
        if len(all_fighters) >= 100:
            save_to_json(all_fighters)
            print(f"[INFO] Saved {len(all_fighters)} fighters so far...")

    # Final save
    save_to_json(all_fighters)
    print(f"[DONE] Scraped {len(all_fighters)} fighters in total. Saved to fighters.json")
