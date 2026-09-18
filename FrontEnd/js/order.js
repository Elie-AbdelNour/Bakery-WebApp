const API_BASE_URL = "/api";
let currentUser = null;

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
  await loadCurrentUser();

  // Redirect if not customer
  if (!currentUser || currentUser.role !== "customer") {
    window.location.href = "/loginPage";
    return;
  }

  initLogout();
  setupFilters();
  loadOrders();
  setupModal();
});

// ---------- Auth ----------
async function loadCurrentUser() {
  try {
    const data = await apiFetch(`${API_BASE_URL}/auth/me`);
    currentUser = data.user;
  } catch (err) {
    currentUser = null;
  }
}

function initLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await apiFetch(`${API_BASE_URL}/auth/logout`, { method: "POST" });
    } catch (_) {}
    window.location.href = "/loginPage";
  });
}

// ---------- Filters ----------
function setupFilters() {
  const filterChips = document.querySelectorAll(".filter-chip");
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      // Remove active class from all chips
      filterChips.forEach((c) => c.classList.remove("active"));
      // Add active class to clicked chip
      chip.classList.add("active");
      // Load orders with the selected filter
      loadOrders();
    });
  });
}

// ---------- Load Orders ----------
async function loadOrders() {
  const container = document.getElementById("orders-container");
  const emptyMsg = document.getElementById("orders-empty-msg");
  if (!container) return;

  container.innerHTML = "<p>Loading orders...</p>";
  emptyMsg.textContent = "";

  // Get active filter chip's status
  const activeChip = document.querySelector(".filter-chip.active");
  const statusFilter = activeChip ? activeChip.dataset.status : "";
  const params = new URLSearchParams();
  params.set("limit", 50);
  params.set("sortBy", "created_at");
  params.set("order", "DESC");
  if (statusFilter) params.set("status", statusFilter);

  try {
    const data = await apiFetch(
      `${API_BASE_URL}/orders/my?${params.toString()}`
    );
    const orders = data.orders || [];

    container.innerHTML = "";

    if (!orders.length) {
      emptyMsg.textContent = "No orders found.";
      return;
    }

    orders.forEach((order) => {
      const card = createOrderCard(order);
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Failed to load orders.</p>";
    showGlobalMessage(err.message || "Failed to load orders", "error");
  }
}

// ---------- Create Order Card ----------
function createOrderCard(order) {
  const card = document.createElement("div");
  card.className = "order-card";

  const statusClass = getStatusClass(order.status);

  card.innerHTML = `
    <div class="order-header">
      <div>
        <h3>Order #${order.id}</h3>
        <span class="order-status ${statusClass}">${order.status}</span>
      </div>
      <div class="order-total">$${Number(order.total_amount).toFixed(2)}</div>
    </div>
    <div class="order-meta">
      <p><strong>Placed:</strong> ${new Date(
        order.created_at
      ).toLocaleString()}</p>
      ${order.driver_id ? `<p><strong>Driver Assigned:</strong> Yes</p>` : ""}
    </div>
    <button class="btn small" data-order-id="${order.id}">View Details</button>
  `;

  const btn = card.querySelector("button");
  btn.addEventListener("click", () => showOrderDetails(order.id));

  return card;
}

function getStatusClass(status) {
  const statusMap = {
    Pending: "status-pending",
    Preparing: "status-preparing",
    Ready: "status-ready",
    "On the way": "status-on-the-way",
    Delivered: "status-delivered",
    Cancelled: "status-cancelled",
  };
  return statusMap[status] || "";
}

// ---------- Order Details Modal ----------
function setupModal() {
  const modal = document.getElementById("order-modal");
  const closeBtn = document.getElementById("modal-close");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.hidden = true;
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.hidden = true;
    }
  });
}

async function showOrderDetails(orderId) {
  const modal = document.getElementById("order-modal");
  const content = document.getElementById("order-details-content");
  if (!modal || !content) return;

  content.innerHTML = "<p>Loading...</p>";
  modal.hidden = false;

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders/${orderId}`);
    const order = data.order || data;

    if (!order || !order.items || !order.items.length) {
      content.innerHTML = "<p>No details available.</p>";
      return;
    }

    let html = `
      <div class="order-detail-header">
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Status:</strong> <span class="order-status ${getStatusClass(
          order.status
        )}">${order.status}</span></p>
        <p><strong>Total:</strong> $${Number(order.total_amount).toFixed(2)}</p>
        <p><strong>Created:</strong> ${new Date(
          order.created_at
        ).toLocaleString()}</p>
      </div>
      <h3>Items</h3>
      <table class="order-items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Subtotal</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
    `;

    order.items.forEach((item) => {
      const subtotal = Number(item.price) * Number(item.quantity);
      html += `
        <tr data-product-id="${item.product_id}" data-order-id="${order.id}">
          <td><a href="#" class="order-product-link" data-product-id="${item.product_id}">${item.product_name}</a></td>
          <td>$${Number(item.price).toFixed(2)}</td>
          <td>${item.quantity}</td>
          <td>$${subtotal.toFixed(2)}</td>
          <td>
            ${order.status === "Delivered" ? (item.reviewed ? `<em>Reviewed</em>` : `
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
            `) : `-`}
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    content.innerHTML = html;
    // attach product click handlers to open product modal
    document.querySelectorAll('.order-product-link').forEach((lnk) => {
      lnk.addEventListener('click', (e) => {
        e.preventDefault();
        const pid = lnk.dataset.productId;
        showProductDetails(pid);
      });
    });
    // Attach review submit handlers
    document.querySelectorAll(".submit-review").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
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
            body: JSON.stringify({ order_id: Number(orderId), product_id: Number(productId), rating: Number(rating), comment }),
          });
          showGlobalMessage("Review submitted", "success");
          // mark reviewed in UI
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
    content.innerHTML = "<p>Failed to load order details.</p>";
    showGlobalMessage(err.message || "Failed to load details", "error");
  }
}

// ---------- Product Modal (order page) ----------
async function showProductDetails(productId) {
  const modal = document.getElementById('product-modal');
  const content = document.getElementById('product-modal-content');
  const title = document.getElementById('product-modal-title');
  const closeBtn = document.getElementById('product-modal-close');
  if (!modal || !content) return;

  content.innerHTML = 'Loading...';
  title.textContent = 'Product';
  modal.hidden = false;

  if (closeBtn) closeBtn.addEventListener('click', () => modal.hidden = true);

  try {
    const pResp = await apiFetch(`${API_BASE_URL}/products/${productId}`);
    // API returns { success: true, product: { ... } }
    const p = pResp && pResp.product ? pResp.product : pResp;

    const reviewsRes = await apiFetch(`${API_BASE_URL}/reviews/product/${productId}`);
    const reviews = (reviewsRes && reviewsRes.reviews) ? reviewsRes.reviews : reviewsRes || [];

    title.textContent = p?.name || `Product ${productId}`;

    // normalize image URL: ensure absolute path or full URL
    let imgUrl = p?.image_url || '/images/default.png';
    if (typeof imgUrl === 'string') {
      if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
        imgUrl = '/' + imgUrl;
      }
    }

    let html = `
      <div class="product-detail-grid">
        <div class="product-media">
          <img id="product-modal-image-${productId}" src="${imgUrl}" alt="${p?.name || ''}" onerror="this.onerror=null;this.src='/images/default.png'" />
        </div>
        <div class="product-info">
          <h3>${p?.name || ''}</h3>
          <p class="product-price-large">${Number(p?.price || 0).toFixed(2)}$</p>
          <p class="product-desc">${p?.description || ''}</p>
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
            <div class="review-meta"><strong>${r.user_email || 'User'}</strong>
            <span class="review-stars">${'★'.repeat(Number(r.rating))}${'☆'.repeat(5-Number(r.rating))}</span>
            <small class="review-date">${new Date(r.created_at).toLocaleString()}</small></div>
            <div class="review-body">${r.comment || ''}</div>
          </li>`;
      });
      html += `</ul>`;
    }

    content.innerHTML = html;

    // improve image onerror: try uploads path if bare filename, then fallback to default
    try {
      const imgEl = document.getElementById(`product-modal-image-${productId}`);
      if (imgEl) {
        const original = imgEl.src;
        let triedAlt = false;
        imgEl.onerror = function () {
          if (!triedAlt) {
            triedAlt = true;
            // try uploads/products/<basename>
            const parts = original.split('/');
            const basename = parts[parts.length - 1];
            imgEl.src = `/uploads/products/${basename}`;
            return;
          }
          imgEl.onerror = null;
          imgEl.src = '/images/default.png';
        };
      }
    } catch (e) {
      // ignore
    }
  } catch (err) {
    console.error('Failed to load product details for id=', productId, err);
    content.innerHTML = '<p>Failed to load product details.</p>';
  }
}

// expose for other pages
window.showProductDetails = showProductDetails;
