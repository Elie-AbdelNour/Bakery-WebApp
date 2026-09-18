const API_BASE_URL = "/api";
let currentDriver = null;

const driverEmailSpan = document.getElementById("driver-email");
const logoutBtn = document.getElementById("logout-btn");
const messageEl = document.getElementById("message");
const reloadOrdersBtn = document.getElementById("reload-orders-btn");
const driverOrdersTableBody = document.querySelector(
  "#driver-orders-table tbody"
);

function showMessage(msg, type = "info") {
  messageEl.textContent = msg || "";
  messageEl.className = `message ${type}`;
}

async function fetchCurrentDriver() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Not authenticated");
    }

    const data = await res.json();
    if (!data.user || data.user.role !== "driver") {
      // if not driver, send them to homepage
      window.location.href = "/homepage";
      return null;
    }

    currentDriver = data.user;
    driverEmailSpan.textContent = `${data.user.email} (driver)`;
    return data.user;
  } catch (err) {
    console.error(err);
    window.location.href = "/loginPage";
    return null;
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {
    console.error(e);
  } finally {
    window.location.href = "/loginPage";
  }
}

async function loadDriverOrders() {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/driver`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Failed to load orders", "error");
      return;
    }

    console.log("Driver orders data:", data.orders); // Debug log
    renderDriverOrders(data.orders || []);
  } catch (err) {
    console.error(err);
    showMessage("Network error loading orders", "error");
  }
}

function renderDriverOrders(orders) {
  driverOrdersTableBody.innerHTML = "";

  orders.forEach((o) => {
    console.log("Order object:", o); // Debug log to see what's in each order
    const tr = document.createElement("tr");

    const selectHtml = `
      <select class="order-status-select">
        <option value="On the way" ${
          o.status === "On the way" ? "selected" : ""
        }>On the way</option>
        <option value="Delivered" ${
          o.status === "Delivered" ? "selected" : ""
        }>Delivered</option>
        <option value="Cancelled" ${
          o.status === "Cancelled" ? "selected" : ""
        }>Cancelled</option>
      </select>
    `;

    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.customer_email || ""}</td>
      <td>${
        o.total_amount ? Number(o.total_amount).toFixed(2) + "$" : "N/A"
      }</td>
      <td>${o.status}</td>
      <td>${new Date(o.created_at).toLocaleString()}</td>
      <td>
        ${selectHtml}
        <button class="update-order-btn" data-id="${o.id}">Update</button>
      </td>
    `;

    driverOrdersTableBody.appendChild(tr);
  });

  document.querySelectorAll(".update-order-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const select = btn.closest("td").querySelector(".order-status-select");
      const status = select.value;
      await updateDeliveryStatus(id, status);
    });
  });
}

async function updateDeliveryStatus(orderId, status) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/orders/${orderId}/delivery-status`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Failed to update status", "error");
      return;
    }

    showMessage("Order status updated", "success");
    await loadDriverOrders();
  } catch (err) {
    console.error(err);
    showMessage("Network error updating status", "error");
  }
}

// Events & init
logoutBtn.addEventListener("click", logout);
reloadOrdersBtn.addEventListener("click", loadDriverOrders);

document.addEventListener("DOMContentLoaded", async () => {
  const user = await fetchCurrentDriver();
  if (!user) return;
  showMessage("Welcome, here are your assigned orders", "info");
  await loadDriverOrders();
});
