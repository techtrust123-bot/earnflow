const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");
app.use(cors(
    {origin: "http://localhost:5175"},
    {withCredentials: true}
));

const app = express();
const __dirname = path.resolve();

app.use(express.json());

// API routes
app.use("/api", require("./routes"));

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
