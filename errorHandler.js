// Centralized error handler
module.exports = (err, req, res, next) => {
  // Mongoose schema validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Duplicate key (e.g. SKU already exists)
  if (err.code === 11000) {
    return res.status(409).json({
      message: `Duplicate value for: ${Object.keys(err.keyValue).join(", ")}`,
    });
  }

  // Bad ObjectId or bad type cast
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
  });
};
