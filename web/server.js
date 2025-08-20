const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ADD THIS LINE - Serve static files from current directory
app.use(express.static("."));

const PORT = 3000;

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/ufc_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Fighter Schema
const fighterSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  name: String,
  height_cm: Number,
  weight_kg: Number,
  wins: Number,
  losses: Number,
  draws: Number,
  image_url: String,
});

const Fighter = mongoose.model("Fighter", fighterSchema);

// Optional: load JSON to MongoDB (run once)
app.get("/load-json", async (req, res) => {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "fighters.json"), "utf-8")
    );
    // Add full name field
    data.forEach((f) => (f.name = `${f.first_name} ${f.last_name}`));
    await Fighter.deleteMany({});
    await Fighter.insertMany(data);
    res.json({ success: true, message: "Fighters loaded to MongoDB" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

// API endpoint: get all fighters
app.get("/api/fighters", async (req, res) => {
  try {
    const fighters = await Fighter.find({});
    res.json({ success: true, data: fighters });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// API endpoint: search fighters by name
app.get("/api/fighters/search/:query", async (req, res) => {
  try {
    const q = req.params.query;
    const fighters = await Fighter.find({
      $or: [
        { first_name: { $regex: q, $options: "i" } },
        { last_name: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ],
    });
    res.json({ success: true, data: fighters });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
