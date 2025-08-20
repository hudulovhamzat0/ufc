import json
from pymongo import MongoClient

# Connect to MongoDB (adjust URI if needed)
client = MongoClient("mongodb://localhost:27017/")  # local MongoDB
db = client["ufc_db"]           # database name
collection = db["fighters"]     # collection name

# Load JSON file
with open("fighters.json", "r", encoding="utf-8") as f:
    fighters = json.load(f)

# Optional: Clear existing collection before inserting
collection.delete_many({})

# Insert all fighters
result = collection.insert_many(fighters)
print(f"Inserted {len(result.inserted_ids)} fighters into MongoDB.")
