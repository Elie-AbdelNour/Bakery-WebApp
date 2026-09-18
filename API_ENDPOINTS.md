# Bakery Management API — Endpoint Reference

Base path: `/api`

Important notes for frontend developers

- Authentication is cookie-based: server sets an HTTP-only cookie named `token` on successful login. All protected endpoints expect this cookie and use it to authorize requests.
- When calling protected endpoints from the browser, set `credentials: 'include'` on `fetch` (or the equivalent in your client) so the cookie is sent.
- All JSON requests must set `Content-Type: application/json`.

Example common fetch options (send cookies):

```js
fetch(url, {
  method: "GET",
  credentials: "include", // send/receive cookies
  headers: { "Content-Type": "application/json" },
});
```

---

## Authentication

### POST /api/auth/request-otp

- Public
- Body: `{ "email": "user@example.com" }` (required, valid email)
- Validation: server uses Joi — email required
- Success: `200` -> `{ success: true, message: 'OTP sent successfully.' }`
- Errors: `400` (EMAIL_REQUIRED / validation), `500` (OTP_SEND_FAIL)

Notes: OTP is emailed to the user and for development the OTP is logged to the server console.

### POST /api/auth/login-otp

- Public
- Body: `{ "email": "user@example.com", "otp": "123456" }` (otp: 6-digit string)
- Validation: Joi enforces email and 6-digit numeric OTP
- Success: `200` -> sets cookie `token` (httpOnly), returns `{ success: true, message, user, /* user object */ }`
- Errors: `400` (INVALID_OTP / OTP_EXPIRED / validation), `401` (LOGIN_FAILED)

Frontend tip: After this call the browser will receive the `token` cookie. Use `credentials: 'include'` for subsequent requests.

### POST /api/auth/logout

- Public (clears cookie server-side)
- Body: none
- Success: `200` -> `{ success: true, message: 'Logged out successfully' }`

### GET /api/auth/me

- Protected: requires token cookie
- Success: `200` -> `{ success: true, message: 'Authenticated user info', user: { id, email, role, ... } }`
- Errors: `401` (TOKEN_MISSING / TOKEN_INVALID)

### GET /api/auth/admin/dashboard

- Protected, Admin-only (requires role `admin`)
- Success: `200` -> admin message and `user` object
- Errors: `401` / `403`

---

## Products

### GET /api/products

- Public
- Query parameters (all optional): `page` (int, default 1), `limit` (int, default 10), `sortBy` (id,name,price,category,created_at), `order` (asc|desc), `category` (string), `minPrice` (number), `maxPrice` (number), `search` (string)
- Success: `200` with a paginated response:

```
{
  success: true,
  message: 'Products retrieved successfully',
  pagination: { currentPage, limit, totalItems, totalPages },
  filters: { category, minPrice, maxPrice, search },
  sort: { sortBy, order },
  products: [ { id, name, description, price, stock, category, image_url, created_at }, ... ]
}
```

Frontend tip: use query params to implement infinite scroll, filter UI, and sorting.

### GET /api/products/:id

- Public
- Path param: `id` (integer)
- Success: `200` -> `{ success: true, product: { ... } }`
- Errors: `404` PRODUCT_NOT_FOUND

### POST /api/products

- Admin only (requires cookie + role `admin`)
- Body (JSON): `{ name, description, price, stock, category, image_url }` (name and price required)
- Success: `201` -> `{ success: true, message: 'Product created', result: { id } }`
- Errors: `400` INVALID_PRODUCT_DATA, `403` forbidden

### PUT /api/products/:id

- Admin only
- Body: any of `{ name, description, price, stock, category, image_url }`
- Success: `200` -> `{ success: true, message: 'Product updated', result }`
- Errors: `404` PRODUCT_NOT_FOUND, `403`

### DELETE /api/products/:id

- Admin only
- Success: `200` -> `{ success: true, message: 'Product deleted', result }`
- Errors: `404` PRODUCT_NOT_FOUND, `403`

---

## Cart (all routes require authentication)

All cart routes expect the `token` cookie. Use `credentials: 'include'`.

### GET /api/cart

- Returns the current user's cart
- Success: `200` -> `{ success: true, cart: [ { product_id, quantity, product: { ... } }, ... ] }`
- Errors: `400` CART_EMPTY, `401`

### POST /api/cart

- Add item to cart
- Body: `{ product_id: integer, quantity: integer }` (quantity > 0)
- Success: `201` -> `{ success: true, message: 'Item added to cart.' }`
- Errors: `400` INVALID_QUANTITY, `401`

### PUT /api/cart/:productId

- Update quantity for a product in cart
- Path param: `productId` (integer)
- Body: `{ quantity: integer }` (quantity > 0)
- Success: `200` -> `{ success: true, message: 'Cart item updated.' }`
- Errors: `400` INVALID_QUANTITY, `404` CART_ITEM_NOT_FOUND

### DELETE /api/cart/:productId

- Remove a single product from cart
- Success: `200` -> `{ success: true, message: 'Item removed from cart.' }`
- Errors: `404` CART_ITEM_NOT_FOUND

### DELETE /api/cart

- Clear entire cart
- Success: `200` -> `{ success: true, message: 'Cart cleared successfully.' }`

---

## Orders

### POST /api/orders

- Protected, role: `customer` (use `authorizeRole('customer')`)
- Creates an order from the authenticated user's cart, clears the cart, and triggers invoice generation async
- Body: none
- Success: `201` -> `{ success: true, message: 'Order placed successfully', order: { ... } }`
- Errors: `400` CART_EMPTY, `500` ORDER_CREATION_FAILED

### GET /api/orders/my

- Protected, role: `customer`
- Query params: `page`, `limit`, `sortBy`, `order`, `status`
- Success: `200` -> `{ success: true, orders: [...], pagination: {...} }`

### GET /api/orders/driver

- Protected, role: `driver`
- Success: `200` -> `{ success: true, orders: [...], pagination: {...} }`

### GET /api/orders

- Protected, role: `admin`
- Query params: `page`, `limit`, `sortBy`, `order`, `status`
- Success: `200` -> `{ success: true, orders: [...], pagination: {...} }`

### PATCH /api/orders/:id/assign-driver

- Protected, role: `admin`
- Path param: `id` (order id)
- Body: `{ driver_id: integer }` (required)
- Success: `200` -> `{ success: true, message: 'Driver assigned successfully to order.', result: { orderId, driverId } }`

### PATCH /api/orders/:id/status

- Protected, role: `admin`
- Body: `{ status: string }` — allowed: `Pending`, `Preparing`, `Ready`, `Delivered`, `Cancelled`
- Success: `200` -> `{ success: true, message: 'Order status updated successfully', result }`

### PATCH /api/orders/:id/delivery-status

- Protected, role: `driver`
- Body: `{ status: string }` — allowed for drivers: `On the way`, `Delivered`, `Cancelled`
- Success: `200` -> `{ success: true, message: 'Delivery status updated successfully', result }`

### GET /api/orders/:id

- Protected
- Admins can view any order; customers can view only their own orders
- Success: `200` -> `{ success: true, message: 'Order details retrieved successfully', order: {...} }`

---

## Users (Admin only)

### GET /api/users

- Admin only
- Success: `200` -> `{ success: true, message, users: [ { id, email, role, created_at}, ... ] }`

### GET /api/users/drivers

- Admin only
- Success: `200` -> `{ success: true, message, drivers: [...] }`

### POST /api/users/drivers

- Admin only
- Body: `{ email: string }` (required)
- Success: `201` -> `{ success: true, message: 'Driver created successfully.', driver: { id, email, role: 'driver' } }`

### PATCH /api/users/:id/role

- Admin only — promote a user to driver
- Path param: `id` (user id)
- Success: `200` -> `{ success: true, message: 'User promoted to driver successfully.', user_id }`

---

## Error codes (common values returned by API)

- `SERVER_ERROR` (500) — Internal server error
- `VALIDATION_ERROR` (400) — Invalid input
- `NOT_FOUND` (404) — Resource not found
- `UNAUTHORIZED` / `TOKEN_MISSING` / `TOKEN_INVALID` (401)
- `FORBIDDEN` (403)
- `QUERY_FAILED` (500) — DB query failed

Specific to features:

- `OTP_EXPIRED`, `INVALID_OTP`, `OTP_SEND_FAIL` (Auth)
- `PRODUCT_NOT_FOUND`, `INVALID_PRODUCT_DATA`, `PRODUCT_CREATION_FAILED` (Products)
- `CART_EMPTY`, `INVALID_QUANTITY`, `CART_ITEM_NOT_FOUND`, `CART_UPDATE_FAILED` (Cart)
- `ORDER_NOT_FOUND`, `INVALID_ORDER_STATUS`, `ORDER_CREATION_FAILED`, `ORDER_UPDATE_FAILED` (Orders)

---

## Quick examples

1. Request OTP

```js
fetch("/api/auth/request-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com" }),
});
```

2. Login with OTP (receives cookie)

```js
fetch("/api/auth/login-otp", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
});
```

3. Get products (with pagination)

```js
fetch("/api/products?page=1&limit=12&search=chocolate")
  .then((r) => r.json())
  .then((data) => console.log(data.products));
```

4. Add product to cart (authenticated)

```js
fetch("/api/cart", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ product_id: 2, quantity: 3 }),
});
```

5. Place order (customer)

```js
fetch("/api/orders", {
  method: "POST",
  credentials: "include",
});
```

---

If you want, I can also:

- Produce a Postman collection or OpenAPI YAML/JSON from these routes.
- Add example responses for each endpoint in more detail.

Created from code in `src/Routes`, `src/Controllers`, `src/Services`, `src/Validations`, and `src/ErrorHandling`.
