# Assignment 3: Inventory and Data Management System

Web Dev III (Unit 3, CO3). A REST API built with Node.js, Express, Mongoose and dotenv on MongoDB.

## Setup

```bash
npm install
cp .env.example .env     # then set MONGO_URI (local MongoDB or Atlas)
npm run dev              # or: npm start
```

`.env`
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/inventory
```

## Product schema

| Field | Rules |
|---|---|
| name | required, min 2 chars |
| sku | required, unique, stored uppercase |
| category | required |
| price | required, >= 0 |
| quantity | required, whole number, >= 0 |
| reorderLevel | required, >= 0 |
| supplier | required |
| stockValue | virtual: price x quantity |

## Endpoints

| Method | URL | Description |
|---|---|---|
| POST | /api/products | Create product |
| GET | /api/products | List with filter, sort, pagination |
| GET | /api/products/:id | Get one product |
| PUT | /api/products/:id | Update product details |
| PATCH | /api/products/:id/stock | Adjust stock, body `{ "change": 10 }` (negative = sale) |
| DELETE | /api/products/:id | Delete product |
| GET | /api/products/low-stock | Products with quantity <= reorderLevel |
| GET | /api/products/summary | Category-wise totals (aggregation) |

### Query parameters for `GET /api/products`

`category`, `search` (name), `minPrice`, `maxPrice`, `sort` (name, price, quantity, createdAt, category), `order` (asc/desc), `page`, `limit` (max 100).

Example: `/api/products?category=Furniture&sort=price&order=asc&page=1&limit=5`

## Error handling

All errors go through `src/middleware/errorHandler.js`:
validation errors return 400, duplicate SKU returns 409, bad ID returns 400, unknown route returns 404. A sale that would make stock negative returns 400 "Insufficient stock".

## Structure

```
server.js
src/
  app.js
  config/db.js
  models/Product.js
  controllers/productController.js
  routes/productRoutes.js
  middleware/errorHandler.js
  middleware/validateId.js
postman/
```
