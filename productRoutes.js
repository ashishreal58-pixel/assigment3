const express = require("express");
const router = express.Router();

const validateId = require("../middleware/validateId");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getCategorySummary,
} = require("../controllers/productController");

router.post("/", createProduct);
router.get("/", getProducts);

// Fixed routes must come before "/:id"
router.get("/low-stock", getLowStockProducts);
router.get("/summary", getCategorySummary);

router.get("/:id", validateId, getProductById);
router.put("/:id", validateId, updateProduct);
router.patch("/:id/stock", validateId, adjustStock);
router.delete("/:id", validateId, deleteProduct);

module.exports = router;
