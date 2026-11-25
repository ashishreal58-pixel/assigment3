const mongoose = require("mongoose");

// Rejects requests with a malformed :id before they reach the controller
module.exports = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }
  next();
};
