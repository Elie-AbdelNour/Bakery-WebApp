const API_BASE_URL = "/api";
let isInitialized = false;
let currentUser = null;
let productsPagination = { currentPage: 1, totalPages: 1 };
let driversCache = [];
let productsCache = {}; // NEW: store products so cart can access image_url

// ---------- Helpers ----------
async function apiFetch(path, options = {}) {
  const opts = Object.assign(
    {
      credentials: "include",
    },
    options
  );

  const res = await fetch(path, opts);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}

  if (!res.ok) {
    const err = new Error((data && data.message) || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function showGlobalMessage(msg, type = "info") {
  const el = document.getElementById("global-message");
  if (!el) return;
  el.textContent = msg;
  el.className = `message ${type} show`;
  setTimeout(() => el.classList.remove("show"), 4000);
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  if (isInitialized) return;
  isInitialized = true;

  // try to load current user; proceed even if it fails (guest)
  try {
    await loadCurrentUser();
  } catch (_) {
    currentUser = null;
  }

  // ✅ Redirect admin and driver to their dashboards
  if (currentUser) {
    if (currentUser.role === "admin") {
      window.location.href = "/admin";
      return;
    }
    if (currentUser.role === "driver") {
      window.location.href = "/driver";
      return;
    }
  }

  initLogout(); // ✅ Call after currentUser is loaded
  setupRoleVisibility();
  attachCommonHandlers();
  loadProducts(1);

  if (!currentUser) return;

  if (currentUser.role === "customer" && !window.IS_CART_PAGE) {
    if (document.querySelector("#customer-orders-table")) loadCustomerOrders();
  } else if (currentUser.role === "admin") {
    if (document.querySelector("#admin-products-table"))
      loadAdminProductsTable();
    if (document.querySelector("#admin-orders-table")) loadAdminOrders();
    if (document.querySelector("#users-table")) loadUsers();
    loadDriversList();
  } else if (currentUser.role === "driver") {
    if (document.querySelector("#driver-orders-table")) loadDriverOrders();
  }
});

// ---------- Auth helpers (shared) ----------
async function loadCurrentUser() {
  try {
    const data = await apiFetch(`${API_BASE_URL}/auth/me`);
    currentUser = data.user;
    return currentUser;
  } catch (err) {
    currentUser = null;
    throw err;
  }
}

function setupRoleVisibility() {
  const navCart = document.getElementById("nav-cart");
  const navOrders = document.getElementById("nav-orders");
  const navLogin = document.getElementById("nav-login");
  const logoutBtn = document.getElementById("logout-btn");
  const ui = document.getElementById("user-info");

  if (navCart) navCart.hidden = true;
  if (navOrders) navOrders.hidden = true;
  if (logoutBtn) logoutBtn.hidden = true;
  if (navLogin) navLogin.hidden = false;

  if (!currentUser) {
    if (ui) ui.textContent = "Guest";
    return;
  }

  if (navLogin) navLogin.hidden = true;
  if (logoutBtn) logoutBtn.hidden = false;

  if (ui) ui.textContent = `${currentUser.email} (${currentUser.role})`;

  if (currentUser.role === "customer") {
    if (navCart) navCart.hidden = false;
    if (navOrders) navOrders.hidden = false;
  }
}

function initLogout() {
  const btn = document.getElementById("logout-btn");

  // Attach logout click handler (works for both logged-in and guest users)
  if (btn && !btn.dataset.logoutAttached) {
    btn.addEventListener("click", async () => {
      try {
        await apiFetch(`${API_BASE_URL}/auth/logout`, { method: "POST" });
      } catch (err) {
        console.error(err);
      } finally {
        window.location.href = "/loginPage";
      }
    });
    btn.dataset.logoutAttached = "true";
  }
}

// ---------- Products / Catalog ----------
function attachCommonHandlers() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("input", () => loadProducts(1));

  const categoryInput = document.getElementById("category-input");
  if (categoryInput)
    categoryInput.addEventListener("input", () => loadProducts(1));

  const minInput = document.getElementById("min-price-input");
  const maxInput = document.getElementById("max-price-input");
  if (minInput) minInput.addEventListener("input", () => loadProducts(1));
  if (maxInput) maxInput.addEventListener("input", () => loadProducts(1));

  const filtersForm = document.getElementById("product-filters");
  if (filtersForm)
    filtersForm.addEventListener("submit", (e) => {
      e.preventDefault();
      loadProducts(1);
    });

  const prevBtn = document.getElementById("products-prev");
  const nextBtn = document.getElementById("products-next");

  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      if (productsPagination.currentPage > 1)
        loadProducts(productsPagination.currentPage - 1);
    });

  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      if (productsPagination.currentPage < productsPagination.totalPages)
        loadProducts(productsPagination.currentPage + 1);
    });

  // ✅ Cart page buttons
  const clearCartBtn = document.getElementById("clear-cart-btn");
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", clearCart);
  }

  const placeOrderBtn = document.getElementById("place-order-btn");
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", placeOrder);
  }
}

async function loadProducts(page) {
  const search = document.getElementById("search-input")?.value.trim();
  const category = document.getElementById("category-input")?.value.trim();
  const minPrice = document.getElementById("min-price-input")?.value.trim();
  const maxPrice = document.getElementById("max-price-input")?.value.trim();

  const params = new URLSearchParams();
  params.set("page", page || 1);
  params.set("limit", 12);

  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);

  try {
    const data = await apiFetch(
      `${API_BASE_URL}/products?` + params.toString()
    );

    // 🔥 Store products in cache for cart image support
    productsCache = {};
    (data.products || []).forEach((p) => {
      productsCache[p.id] = p;
    });

    renderProducts(data.products || []);

    productsPagination.currentPage = data.pagination?.currentPage || 1;
    productsPagination.totalPages = data.pagination?.totalPages || 1;

    const infoEl = document.getElementById("products-page-info");
    if (infoEl)
      infoEl.textContent = `Page ${productsPagination.currentPage} of ${productsPagination.totalPages}`;
  } catch (err) {
    console.error("Failed to load products:", err);
    showGlobalMessage("Failed to load products: " + (err.message || "Unknown error"), "error");
  }
}

function renderProducts(products) {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = "";

  if (!products.length) {
    container.textContent = "No products found.";
    return;
  }

  products.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";

    const title = document.createElement("h3");
    // Render product image
    const img = document.createElement("img");
    const raw = String(p.image_url || "").trim();
    let src;
    if (!raw) {
      src = "/images/default.png";
    } else {
      src = raw.startsWith("http")
        ? raw
        : raw.startsWith("/")
        ? raw
        : "/" + raw;
    }
    img.src = src;
    img.alt = p.name;
    img.className = "product-image";
    img.onerror = () => {
      img.onerror = null;
      // try uploads fallback then default
      try {
        const parts = img.src.split("/");
        const basename = parts[parts.length - 1];
        img.src = `/uploads/products/${basename}`;
      } catch (e) {
        img.src = "/images/default.png";
      }
    };
    card.appendChild(img);

    // make product name clickable to open product modal + reviews
    const nameEl = document.createElement("a");
    nameEl.href = "#";
    nameEl.className = "product-link";
    nameEl.textContent = p.name;
    nameEl.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.showProductDetails) return window.showProductDetails(p.id);
      // fallback: navigate to product page
      window.location.href = `/homepage.html?product=${p.id}`;
    });
    title.appendChild(nameEl);

    const meta = document.createElement("div");
    meta.className = "product-meta";
    meta.textContent = `${p.category || "Uncategorized"}`;

    // show average rating if available
    if (typeof p.avg_rating !== "undefined") {
      const ratingEl = document.createElement("div");
      ratingEl.className = "product-rating";
      ratingEl.textContent = `⭐ ${p.avg_rating} (${p.review_count || 0})`;
      meta.appendChild(document.createTextNode(" "));
      meta.appendChild(ratingEl);
    }

    const price = document.createElement("div");
    price.className = "product-price";
    // Show price if available; otherwise display a dash
    if (p.price !== undefined && p.price !== null && p.price !== "") {
      const parsed = Number(p.price);
      price.textContent = isNaN(parsed) ? "-" : `${parsed.toFixed(2)}$`;
    } else {
      price.textContent = "-";
    }

    const stock = document.createElement("div");
    stock.className = "product-meta";
    stock.textContent = `Stock: ${p.stock}`;

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const btn = document.createElement("button");
    btn.className = "btn small primary";
    btn.textContent = "Add to Cart";

    actions.appendChild(btn);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(price);
    card.appendChild(stock);
    card.appendChild(actions);

    // make whole card clickable to open product modal (but ignore clicks on buttons/links)
    card.dataset.productId = p.id;
    card.addEventListener("click", (e) => {
      // don't open modal if the click originated from an actionable element
      const actionable = e.target.closest(
        "button, a, input, select, .product-actions"
      );
      if (actionable) return;
      if (window.showProductDetails) return window.showProductDetails(p.id);
      window.location.href = `/homepage.html?product=${p.id}`;
    });

    // ensure action button doesn't bubble to card click; disable while adding
    btn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      if (!currentUser) {
        showGlobalMessage("Please log in first", "error");
        setTimeout(() => {
          window.location.href = "/loginPage";
        }, 1000);
        return;
      }
      if (btn.disabled) return;
      try {
        btn.disabled = true;
        await addToCart(p.id);
      } finally {
        btn.disabled = false;
      }
    });

    container.appendChild(card);
  });
}

// ---------- Product Modal (catalog) ----------
// Create modal container if not present
function ensureProductModal() {
  let modal = document.getElementById("product-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "product-modal";
    modal.className = "product-modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="product-modal-inner">
        <button id="product-modal-close" type="button" class="modal-close" aria-label="Close">×</button>
        <h2 id="product-modal-title">Product</h2>
        <div id="product-modal-content">Loading...</div>
      </div>
    `;
    document.body.appendChild(modal);

    // Attach handlers only once when modal is created
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeProductModal();
    });

    const closeBtn = modal.querySelector("#product-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeProductModal();
      });
    }
  }

  // expose helper globally
  if (!window.closeProductModal) {
    window.closeProductModal = closeProductModal;
  }
}

function closeProductModal() {
  const m = document.getElementById("product-modal");
  if (!m) return;
  m.style.display = "none";
}

async function showProductDetails(productId) {
  ensureProductModal();
  const modal = document.getElementById("product-modal");
  const content = document.getElementById("product-modal-content");
  const title = document.getElementById("product-modal-title");
  if (!modal || !content) return;

  content.innerHTML = "Loading...";
  title.textContent = "Product";
  modal.style.display = "flex";

  try {
    const pResp = await apiFetch(`${API_BASE_URL}/products/${productId}`);
    const p = pResp && pResp.product ? pResp.product : pResp;

    const reviewsRes = await apiFetch(
      `${API_BASE_URL}/reviews/product/${productId}`
    );
    const reviews =
      reviewsRes && reviewsRes.reviews ? reviewsRes.reviews : reviewsRes || [];

    title.textContent = p?.name || `Product ${productId}`;

    let imgUrl = p?.image_url || "/images/default.png";
    if (typeof imgUrl === "string") {
      if (!imgUrl.startsWith("http") && !imgUrl.startsWith("/")) {
        imgUrl = "/" + imgUrl;
      }
    }

    let html = `
        <div class="product-detail-grid">
          <div class="product-media">
            <img id="product-modal-image-${productId}" src="${imgUrl}" alt="${
      p?.name || ""
    }" />
          </div>
          <div class="product-info">
            <h3>${p?.name || ""}</h3>
            <p class="product-price-large">${Number(p?.price || 0).toFixed(
              2
            )}$</p>
            <p class="product-desc">${p?.description || ""}</p>
          </div>
        </div>
        <hr />
        <h4>Reviews (${reviews.length})</h4>
      `;

    if (reviews.length === 0) {
      html += `<p class="no-reviews">No reviews yet.</p>`;
    } else {
      html += `<ul class="product-reviews">`;
      reviews.forEach((r) => {
        html += `
            <li class="review-item">
              <div class="review-meta"><strong>${
                r.user_email || "User"
              }</strong>
              <span class="review-stars">${"★".repeat(
                Number(r.rating)
              )}${"☆".repeat(5 - Number(r.rating))}</span>
              <small class="review-date">${new Date(
                r.created_at
              ).toLocaleString()}</small></div>
              <div class="review-body">${r.comment || ""}</div>
            </li>`;
      });
      html += `</ul>`;
    }

    content.innerHTML = html;

    // image fallback logic
    try {
      const imgEl = document.getElementById(`product-modal-image-${productId}`);
      if (imgEl) {
        let triedAlt = false;
        const original = imgEl.src;
        imgEl.onerror = function () {
          if (!triedAlt) {
            triedAlt = true;
            const parts = original.split("/");
            const basename = parts[parts.length - 1];
            imgEl.src = `/uploads/products/${basename}`;
            return;
          }
          imgEl.onerror = null;
          imgEl.src = "/images/default.png";
        };
      }
    } catch (e) {}
  } catch (err) {
    console.error("Failed to load product details for id=", productId, err);
    content.innerHTML = "<p>Failed to load product details.</p>";
  }
}

window.showProductDetails = showProductDetails;

// ---------- Cart (Customer) ----------
async function loadCart() {
  if (!currentUser || currentUser.role !== "customer") return;

  const cartGrid = document.getElementById("cart-grid");
  if (!cartGrid) return;

  cartGrid.innerHTML = "";

  const emptyMsg = document.getElementById("cart-empty-msg");
  const totalEl = document.getElementById("cart-total");

  try {
    const data = await apiFetch(`${API_BASE_URL}/cart`);
    const cart = data.cart || [];

    if (!cart.length) {
      if (emptyMsg) emptyMsg.textContent = "Your cart is empty.";
      if (totalEl) totalEl.textContent = "";
      return;
    }

    if (emptyMsg) emptyMsg.textContent = "";
    let total = 0;

    cart.forEach((item) => {
      const imageUrl = item.image_url || "/images/default.png";
      total += Number(item.total);

      const card = document.createElement("div");
      card.className = "cart-card";

      card.innerHTML = `
        <img src="${imageUrl}" class="cart-card-image" alt="${item.name}">
        <h3 class="cart-card-title">${item.name}</h3>
        
        <div class="cart-card-info">
          <span class="cart-card-label">Price:</span>
          <span class="cart-card-value cart-card-price">${Number(
            item.price
          ).toFixed(2)}$</span>
        </div>
        
        <div class="cart-card-info">
          <span class="cart-card-label">Quantity:</span>
          <div class="cart-card-quantity">
            <input type="number" min="1" value="${item.quantity}" data-pid="${
        item.product_id
      }" class="qty-input">
          </div>
        </div>
        
        <div class="cart-card-info">
          <span class="cart-card-label">Subtotal:</span>
          <span class="cart-card-value cart-card-price">${Number(
            item.total
          ).toFixed(2)}$</span>
        </div>
        
        <div class="cart-card-actions">
          <button class="btn small primary update-btn" data-pid="${
            item.product_id
          }">Update</button>
          <button class="btn small danger remove-btn" data-pid="${
            item.product_id
          }">Remove</button>
        </div>
      `;

      cartGrid.appendChild(card);
    });

    if (totalEl) totalEl.textContent = `Total: ${total.toFixed(2)}$`;

    // attach handlers after cards are added
    document.querySelectorAll(".update-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.pid;
        const qty = document.querySelector(
          `.qty-input[data-pid="${pid}"]`
        ).value;
        updateCartItem(pid, qty);
      });
    });

    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.pid;
        removeCartItem(pid);
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function addToCart(productId) {
  try {
    await apiFetch(`${API_BASE_URL}/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
    });

    showGlobalMessage("Added to cart!", "success");

    if (document.querySelector("#cart-table")) loadCart();
  } catch (err) {
    console.error(err);
  }
}

async function updateCartItem(productId, quantity) {
  const qty = Number(quantity);
  if (!qty || qty < 1) return showGlobalMessage("Invalid qty", "error");

  try {
    await apiFetch(`${API_BASE_URL}/cart/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    });

    showGlobalMessage("Cart updated!", "success");
    loadCart();
  } catch (err) {
    console.error(err);
  }
}

async function removeCartItem(productId) {
  try {
    await apiFetch(`${API_BASE_URL}/cart/${productId}`, { method: "DELETE" });
    showGlobalMessage("Removed!", "success");
    loadCart();
  } catch (err) {
    console.error(err);
  }
}

async function clearCart() {
  if (!currentUser || currentUser.role !== "customer") return;

  try {
    await apiFetch(`${API_BASE_URL}/cart`, { method: "DELETE" });
    showGlobalMessage("Cart cleared.", "success");
    loadCart();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to clear cart", "error");
  }
}

async function placeOrder() {
  if (!currentUser || currentUser.role !== "customer") return;

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders`, {
      method: "POST",
    });
    showGlobalMessage(data.message || "Order placed successfully.", "success");
    loadCart();
    loadCustomerOrders();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to place order", "error");
  }
}

// ---------- Customer Orders ----------
async function loadCustomerOrders() {
  if (!currentUser || currentUser.role !== "customer") return;

  const tbody = document.querySelector("#customer-orders-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders/my?limit=20`);
    const orders = data.orders || [];

    orders.forEach((o) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = o.id;

      const tdTotal = document.createElement("td");
      tdTotal.textContent = `${Number(o.total_amount).toFixed(2)}$`;

      const tdStatus = document.createElement("td");
      tdStatus.textContent = o.status;

      const tdCreated = document.createElement("td");
      tdCreated.textContent = new Date(o.created_at).toLocaleString();

      const tdDetails = document.createElement("td");
      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.textContent = "View";
      btn.addEventListener("click", () => loadOrderDetails(o.id));
      tdDetails.appendChild(btn);

      tr.appendChild(tdId);
      tr.appendChild(tdTotal);
      tr.appendChild(tdStatus);
      tr.appendChild(tdCreated);
      tr.appendChild(tdDetails);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load orders", "error");
  }
}

async function loadOrderDetails(orderId) {
  if (!currentUser || currentUser.role !== "customer") return;

  const container = document.getElementById("order-details");
  if (!container) return;
  container.textContent = "Loading order details...";

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders/${orderId}`);
    console.debug("Order API response:", data);
    const order = data.order || data;

    if (!order || !order.items || !order.items.length) {
      console.warn("Order details empty or malformed for id=", orderId, order);
      container.textContent = "No details for this order.";
      return;
    }

    let html = `<strong>Order #${order.id}</strong><br/>`;
    html += `<em>Status:</em> ${order.status}<br/>`;
    html += `<em>Total:</em> ${Number(order.total_amount).toFixed(
      2
    )}$<br/><br/>`;
    html += `<table class="data-table"><thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th>Review</th></tr></thead><tbody>`;

    order.items.forEach((it) => {
      html += `<tr data-product-id="${it.product_id}" data-order-id="${
        order.id
      }">
        <td><a href="#" class="order-product-link" data-product-id="${
          it.product_id
        }">${it.product_name}</a></td>
        <td>${Number(it.price).toFixed(2)}$</td>
        <td>${it.quantity}</td>
        <td>${Number(it.subtotal).toFixed(2)}$</td>
        <td>
          ${
            order.status === "Delivered"
              ? it.reviewed
                ? "<em>Reviewed</em>"
                : `
            <div class="review-form">
              <select class="review-rating">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5" selected>5</option>
              </select>
              <input class="review-comment" placeholder="Write a short review" />
              <button class="btn small primary submit-review">Submit</button>
              <span class="review-loading" style="display:none">Submitting...</span>
            </div>
          `
              : "-"
          }
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;

    // Attach product click handlers and review submit handlers after injecting HTML

    container.innerHTML = html;

    // product links open product modal
    document.querySelectorAll(".order-product-link").forEach((lnk) => {
      lnk.addEventListener("click", (e) => {
        e.preventDefault();
        const pid = lnk.dataset.productId;
        // reuse global order page product modal if available
        if (window.showProductDetails) return window.showProductDetails(pid);
        // otherwise open product in new tab
        window.open(`/homepage.html?product=${pid}`, "_blank");
      });
    });

    // review submit handlers
    document.querySelectorAll(".submit-review").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = btn.closest("tr");
        const productId = row.dataset.productId;
        const orderId = row.dataset.orderId;
        const rating = row.querySelector(".review-rating").value;
        const comment = row.querySelector(".review-comment").value.trim();
        const loadingEl = row.querySelector(".review-loading");

        try {
          loadingEl.style.display = "inline";
          btn.disabled = true;
          await apiFetch(`${API_BASE_URL}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: Number(orderId),
              product_id: Number(productId),
              rating: Number(rating),
              comment,
            }),
          });
          showGlobalMessage("Review submitted", "success");
          row.querySelector("td:last-child").innerHTML = "<em>Reviewed</em>";
        } catch (err) {
          console.error(err);
          showGlobalMessage(err.message || "Failed to submit review", "error");
        } finally {
          loadingEl.style.display = "none";
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.textContent = "Failed to load order details.";
  }
}

// ---------- Admin: Products ----------
function renderAdminProductsTable(products) {
  if (!currentUser || currentUser.role !== "admin") return;

  const tbody = document.querySelector("#admin-products-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.textContent = p.id;

    const tdName = document.createElement("td");
    tdName.textContent = p.name;

    const tdCat = document.createElement("td");
    tdCat.textContent = p.category || "";

    const tdPrice = document.createElement("td");
    tdPrice.textContent = `${Number(p.price).toFixed(2)}$`;

    const tdStock = document.createElement("td");
    tdStock.textContent = p.stock;

    const tdActions = document.createElement("td");
    tdActions.className = "actions";

    const tdImg = document.createElement("td");
    tdImg.innerHTML = `<img src="${p.image_url}" class="admin-img">`;
    tr.appendChild(tdImg);

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn small";
    btnEdit.textContent = "Edit";
    btnEdit.addEventListener("click", () => fillProductForm(p));

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn small danger";
    btnDelete.textContent = "Delete";
    btnDelete.addEventListener("click", () => deleteProduct(p.id));

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdCat);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStock);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

// In case you need to force reload separate from catalog
async function loadAdminProductsTable() {
  if (!currentUser || currentUser.role !== "admin") return;

  try {
    const data = await apiFetch(`${API_BASE_URL}/products?page=1&limit=100`);
    renderAdminProductsTable(data.products || []);
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load products", "error");
  }
}

function fillProductForm(p) {
  if (!currentUser || currentUser.role !== "admin") return;

  document.getElementById("product-id").value = p.id;
  document.getElementById("product-name").value = p.name;
  document.getElementById("product-category").value = p.category || "";
  document.getElementById("product-price").value = p.price;
  document.getElementById("product-stock").value = p.stock;
  document.getElementById("product-image-url").value = p.image_url || "";
  document.getElementById("product-description").value = p.description || "";
}

function resetProductForm() {
  if (!currentUser || currentUser.role !== "admin") return;

  document.getElementById("product-id").value = "";
  document.getElementById("product-name").value = "";
  document.getElementById("product-category").value = "";
  document.getElementById("product-price").value = "";
  document.getElementById("product-stock").value = "";
  document.getElementById("product-image-url").value = "";
  document.getElementById("product-description").value = "";
}

async function handleProductSave(e) {
  if (!currentUser || currentUser.role !== "admin") return;

  e.preventDefault();
  const id = document.getElementById("product-id").value;
  const payload = {
    name: document.getElementById("product-name").value.trim(),
    category: document.getElementById("product-category").value.trim(),
    price: Number(document.getElementById("product-price").value),
    stock: Number(document.getElementById("product-stock").value),
    image_url: document.getElementById("product-image-url").value.trim(),
    description: document.getElementById("product-description").value.trim(),
  };

  const method = id ? "PUT" : "POST";
  const url = id
    ? `${API_BASE_URL}/products/${id}`
    : `${API_BASE_URL}/products`;

  try {
    await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showGlobalMessage("Product saved.", "success");
    resetProductForm();
    loadProducts(productsPagination.currentPage || 1);
    loadAdminProductsTable();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to save product", "error");
  }
}

async function deleteProduct(id) {
  if (!currentUser || currentUser.role !== "admin") return;
  if (!confirm("Delete this product?")) return;

  try {
    await apiFetch(`${API_BASE_URL}/products/${id}`, { method: "DELETE" });
    showGlobalMessage("Product deleted.", "success");
    loadProducts(productsPagination.currentPage || 1);
    loadAdminProductsTable();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to delete product", "error");
  }
}

// ---------- Admin: Orders & Drivers ----------
async function loadDriversList() {
  if (!currentUser || currentUser.role !== "admin") return;

  try {
    const data = await apiFetch(`${API_BASE_URL}/users/drivers`);
    driversCache = data.drivers || [];
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load drivers", "error");
  }
}

function createDriverSelect(currentDriverId) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "Unassigned";
  select.appendChild(emptyOpt);

  driversCache.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.email;
    if (currentDriverId && Number(currentDriverId) === Number(d.id)) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  return select;
}

async function loadAdminOrders() {
  if (!currentUser || currentUser.role !== "admin") return;

  const tbody = document.querySelector("#admin-orders-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const statusFilter = document.getElementById("admin-order-status-filter");
  const params = new URLSearchParams();
  params.set("limit", 50);
  if (statusFilter && statusFilter.value) {
    params.set("status", statusFilter.value);
  }

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders?` + params.toString());
    const orders = data.orders || [];

    if (!driversCache.length) {
      await loadDriversList();
    }

    orders.forEach((o) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = o.id;

      const tdUser = document.createElement("td");
      tdUser.textContent = o.user_id;

      const tdTotal = document.createElement("td");
      tdTotal.textContent = `${Number(o.total_amount).toFixed(2)}$`;

      const tdStatus = document.createElement("td");
      const statusSelect = document.createElement("select");
      ["Pending", "Preparing", "Ready", "Delivered", "Cancelled"].forEach(
        (s) => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s;
          if (o.status === s) opt.selected = true;
          statusSelect.appendChild(opt);
        }
      );
      tdStatus.appendChild(statusSelect);

      const tdDriver = document.createElement("td");
      const driverSelect = createDriverSelect(o.driver_id);
      tdDriver.appendChild(driverSelect);

      const tdActions = document.createElement("td");
      tdActions.className = "actions";

      const btnUpdate = document.createElement("button");
      btnUpdate.className = "btn small";
      btnUpdate.textContent = "Update";
      btnUpdate.addEventListener("click", async () => {
        try {
          await apiFetch(`${API_BASE_URL}/orders/${o.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: statusSelect.value }),
          });

          if (driverSelect.value) {
            await apiFetch(`${API_BASE_URL}/orders/${o.id}/assign-driver`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ driver_id: Number(driverSelect.value) }),
            });
          }

          showGlobalMessage("Order updated.", "success");
          loadAdminOrders();
        } catch (err) {
          console.error(err);
          showGlobalMessage(err.message || "Failed to update order", "error");
        }
      });

      tdActions.appendChild(btnUpdate);

      tr.appendChild(tdId);
      tr.appendChild(tdUser);
      tr.appendChild(tdTotal);
      tr.appendChild(tdStatus);
      tr.appendChild(tdDriver);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load orders", "error");
  }
}

// ---------- Admin: Users / Drivers ----------
async function loadUsers() {
  if (!currentUser || currentUser.role !== "admin") return;

  const tbody = document.querySelector("#users-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  try {
    const data = await apiFetch(`${API_BASE_URL}/users`);
    const users = data.users || [];

    users.forEach((u) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = u.id;

      const tdEmail = document.createElement("td");
      tdEmail.textContent = u.email;

      const tdRole = document.createElement("td");
      tdRole.textContent = u.role;

      const tdCreated = document.createElement("td");
      tdCreated.textContent = new Date(u.created_at).toLocaleString();

      const tdActions = document.createElement("td");
      tdActions.className = "actions";

      if (u.role !== "driver") {
        const btnPromote = document.createElement("button");
        btnPromote.className = "btn small";
        btnPromote.textContent = "Promote to Driver";
        btnPromote.addEventListener("click", () => promoteToDriver(u.id));
        tdActions.appendChild(btnPromote);
      } else {
        tdActions.textContent = "Driver";
      }

      tr.appendChild(tdId);
      tr.appendChild(tdEmail);
      tr.appendChild(tdRole);
      tr.appendChild(tdCreated);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load users", "error");
  }
}

async function promoteToDriver(userId) {
  if (!currentUser || currentUser.role !== "admin") return;

  try {
    await apiFetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: "PATCH",
    });
    showGlobalMessage("User promoted to driver.", "success");
    loadUsers();
    loadDriversList();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to promote user", "error");
  }
}

async function handleCreateDriver(e) {
  if (!currentUser || currentUser.role !== "admin") return;

  e.preventDefault();
  const emailInput = document.getElementById("new-driver-email");
  const email = emailInput.value.trim();
  if (!email) return;

  try {
    await apiFetch(`${API_BASE_URL}/users/drivers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    showGlobalMessage("Driver created.", "success");
    emailInput.value = "";
    loadUsers();
    loadDriversList();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to create driver", "error");
  }
}

// ---------- Driver: Orders ----------
async function loadDriverOrders() {
  if (!currentUser || currentUser.role !== "driver") return;

  const tbody = document.querySelector("#driver-orders-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders/driver?limit=50`);
    const orders = data.orders || [];

    orders.forEach((o) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = o.id;

      const tdEmail = document.createElement("td");
      tdEmail.textContent = o.customer_email || "";

      const tdTotal = document.createElement("td");
      tdTotal.textContent = `${Number(o.total_amount).toFixed(2)}$`;

      const tdStatus = document.createElement("td");
      tdStatus.textContent = o.status;

      const tdCreated = document.createElement("td");
      tdCreated.textContent = new Date(o.created_at).toLocaleString();

      const tdUpdate = document.createElement("td");
      const select = document.createElement("select");
      ["On the way", "Delivered", "Cancelled"].forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
      });

      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.textContent = "Save";
      btn.addEventListener("click", () =>
        updateDeliveryStatus(o.id, select.value)
      );

      tdUpdate.appendChild(select);
      tdUpdate.appendChild(btn);

      tr.appendChild(tdId);
      tr.appendChild(tdEmail);
      tr.appendChild(tdTotal);
      tr.appendChild(tdStatus);
      tr.appendChild(tdCreated);
      tr.appendChild(tdUpdate);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load driver orders", "error");
  }
}

async function updateDeliveryStatus(orderId, status) {
  if (!currentUser || currentUser.role !== "driver") return;

  try {
    await apiFetch(`${API_BASE_URL}/orders/${orderId}/delivery-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    showGlobalMessage("Delivery status updated.", "success");
    loadDriverOrders();
  } catch (err) {
    console.error(err);
    showGlobalMessage(
      err.message || "Failed to update delivery status",
      "error"
    );
  }
}
