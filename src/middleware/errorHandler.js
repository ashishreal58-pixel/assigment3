function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 11000) {
    return res.status(409).json({
      message: "A product with this SKU already exists",
      field: Object.keys(err.keyValue || {})[0] || "sku"
    });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((item) => item.message);
    return res.status(400).json({ message: "Validation failed", errors });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid value supplied" });
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
}

module.exports = errorHandler;
