const express = require("express");
const router = express.Router();
const controller = require("../controllers/productController");

// Keep report routes above /:id so they are not treated as product IDs.
router.get("/low-stock", controller.getLowStockProducts);
router.get("/summary", controller.getCategorySummary);

router.post("/", controller.createProduct);
router.get("/", controller.getProducts);
router.get("/:id", controller.getProductById);
router.put("/:id", controller.updateProduct);
router.patch("/:id/stock", controller.adjustStock);
router.delete("/:id", controller.deleteProduct);

module.exports = router;
