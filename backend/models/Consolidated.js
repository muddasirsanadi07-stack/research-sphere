const mongoose = require("mongoose");

const schema = new mongoose.Schema({}, { strict: false });
// flexible since your JSON is nested

module.exports = mongoose.model("Consolidated", schema, "Consolidated");