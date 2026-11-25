const mongoose = require("mongoose");
const Product = require("../models/Product");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: searchRegex }, { sku: searchRegex }, { supplier: searchRegex }];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        const value = Number(minPrice);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ message: "minPrice must be a non-negative number" });
        }
        filter.price.$gte = value;
      }
      if (maxPrice !== undefined) {
        const value = Number(maxPrice);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ message: "maxPrice must be a non-negative number" });
        }
        filter.price.$lte = value;
      }
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const allowedSortFields = ["name", "price", "quantity", "createdAt", "category"];
    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";
    const sortOrder = String(order).toLowerCase() === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber),
      Product.countDocuments(filter)
    ]);

    res.json({
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      products
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (error) {
    next(error);
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/products/:id/stock
// Use a positive change to add stock and a negative change to record a sale.
exports.adjustStock = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const change = Number(req.body.change);
    if (!Number.isInteger(change) || change === 0) {
      return res.status(400).json({ message: "change must be a non-zero integer" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.quantity + change < 0) {
      return res.status(400).json({ message: "Insufficient stock for this adjustment" });
    }

    product.quantity += change;
    await product.save();

    res.json({ message: "Stock updated", product });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deleted", id: product._id });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/low-stock
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] }
    }).sort({ quantity: 1 });

    res.json({ count: lowStockItems.length, lowStockItems });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/summary
exports.getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          avgPrice: { $avg: "$price" }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalItems: 1,
          totalQuantity: 1,
          totalStockValue: { $round: ["$totalStockValue", 2] },
          avgPrice: { $round: ["$avgPrice", 2] }
        }
      }
    ]);

    res.json({ categories: summary.length, summary });
  } catch (error) {
    next(error);
  }
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
