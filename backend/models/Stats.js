const mongoose = require("mongoose");

const statsSchema = new mongoose.Schema({
    publications: Number,
    grants: Number,
    innovation: Number
});

module.exports = mongoose.model("Stats", statsSchema, "Stats");
