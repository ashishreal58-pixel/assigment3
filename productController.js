const Product = require("../models/Product");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// CREATE
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// GET ALL  (filter, search, sort, pagination)
// ?category=Furniture&search=pen&minPrice=100&maxPrice=5000
// &sort=price&order=asc&page=1&limit=10
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
      limit = 10,
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };
    }

    if (search) {
      filter.name = { $regex: escapeRegex(search), $options: "i" };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && !isNaN(minPrice)) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined && !isNaN(maxPrice)) filter.price.$lte = Number(maxPrice);
      if (Object.keys(filter.price).length === 0) delete filter.price;
    }

    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const allowedSort = ["name", "price", "quantity", "createdAt", "category"];
    const sortField = allowedSort.includes(sort) ? sort : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber),
      Product.countDocuments(filter),
    ]);

    res.json({
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// GET ONE
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

// UPDATE
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

// STOCK ADJUSTMENT  (+ restock, - sale)  body: { "change": 10 }
// Done atomically so two requests at once can never push stock below zero
exports.adjustStock = async (req, res, next) => {
  try {
    const change = Number(req.body.change);

    if (!Number.isInteger(change) || change === 0) {
      return res.status(400).json({ message: "Change must be a non-zero integer" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, quantity: { $gte: -change } },
      { $inc: { quantity: change } },
      { new: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.status(400).json({ message: "Insufficient stock" });
    }

    res.json({ message: "Stock updated", product });
  } catch (error) {
    next(error);
  }
};

// DELETE
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted", id: product._id });
  } catch (error) {
    next(error);
  }
};

// LOW STOCK REPORT  (quantity <= reorderLevel)
exports.getLowStockProducts = async (req, res, next) => {
  try {
    // find() (not aggregate) so the stockValue virtual and id are included
    const lowStockItems = await Product.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] },
    }).sort({ quantity: 1 });

    res.json({ count: lowStockItems.length, lowStockItems });
  } catch (error) {
    next(error);
  }
};

// CATEGORY-WISE SUMMARY
exports.getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          avgPrice: { $avg: "$price" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ categories: summary.length, summary });
  } catch (error) {
    next(error);
  }
};
