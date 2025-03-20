document.addEventListener("DOMContentLoaded", function () {
  const userId = sessionStorage.getItem("user_id");
  if (!userId) {
    alert("You must be signed in to view your orders.");
    window.location.href = "/signin.html";
    return;
  }

  const sections = {
    Preparing: document.getElementById("preparing-orders"),
    Shipped: document.getElementById("transport-orders"),
    Delivered: document.getElementById("delivered-orders"),
    Received: document.getElementById("received-orders"),
    Cancelled: document.getElementById("cancelled-orders"),
  };

  const tabCounts = {
    Preparing: document.getElementById("preparing-count"),
    Shipped: document.getElementById("shipped-count"),
    Delivered: document.getElementById("delivered-count"),
    Received: document.getElementById("received-count"),
    Cancelled: document.getElementById("cancelled-count"),
  };

  const paginations = {
    Preparing: document.getElementById("preparing-pagination"),
    Shipped: document.getElementById("transport-pagination"),
    Delivered: document.getElementById("delivered-pagination"),
    Received: document.getElementById("received-pagination"),
    Cancelled: document.getElementById("cancelled-pagination"),
  };

  const ordersPerPage = 5;
  const paginatedOrders = {};

  function fetchOrders() {
    fetch(`/api/orders/${userId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.orders) {
          paginateOrders(data.orders);
        } else {
          console.error("Failed to fetch orders:", data.error);
        }
      })
      .catch((error) => console.error("Error fetching orders:", error));
  }

  function paginateOrders(orders) {
    Object.keys(sections).forEach((status) => {
      paginatedOrders[status] = [];
    });

    orders.forEach((order) => {
      if (paginatedOrders[order.status]) {
        paginatedOrders[order.status].push(order);
      }
    });

    Object.keys(paginatedOrders).forEach((status) => {
      displayOrders(status, 1);
    });
  }

  function displayOrders(status, page) {
    const section = sections[status];
    const pagination = paginations[status];
    const orders = paginatedOrders[status] || [];
    const start = (page - 1) * ordersPerPage;
    const end = start + ordersPerPage;

    // Clear the section
    section.innerHTML = "";

    // Display orders for the current page
    orders.slice(start, end).forEach((order) => {
      const card = createOrderCard(order);
      section.appendChild(card);
    });

    // Update the tab count
    const tabCount = tabCounts[status];
    if (tabCount) {
      tabCount.textContent = orders.length;
    }

    // Add pagination controls
    const totalPages = Math.ceil(orders.length / ordersPerPage);
    addPaginationControls(pagination, status, page, totalPages);
  }

  function addPaginationControls(pagination, status, currentPage, totalPages) {
    pagination.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const button = document.createElement("button");
      button.className = `btn btn-sm ${i === currentPage ? "btn-primary" : "btn-outline-primary"} me-1`;
      button.textContent = i;
      button.onclick = () => displayOrders(status, i);
      pagination.appendChild(button);
    }
  }

  function createOrderCard(order) {
    const card = document.createElement("div");
    card.className = "card mb-3";

    const firstItem = order.items[0];
    const additionalItemsCount = order.items.length - 1;

    card.innerHTML = `
      <div class="card-header">
        <h5>Order ID: ${order.order_id}</h5>
        <small>${order.order_datetime}</small>
      </div>
      <div class="card-body">
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Items:</strong> ${firstItem.quantity}x ${firstItem.item} - Php ${firstItem.price}</p>
        ${
          additionalItemsCount > 0
            ? `<p class="text-muted">+ ${additionalItemsCount} more item(s)</p>`
            : ""
        }
        <button class="btn btn-primary btn-sm" onclick="showOrderDetails('${encodeURIComponent(
          JSON.stringify(order)
        )}')">Show Details</button>
        ${
          order.status === "Preparing"
            ? `<button class="btn btn-danger btn-sm mt-2" onclick='cancelOrder("${order.order_id}", "${encodeURIComponent(JSON.stringify(order.items))}")'>Cancel Order</button>`
            : ""
        }
        ${
          order.status === "Delivered"
            ? `<button class="btn btn-success btn-sm mt-2" onclick='generateReceipt("${order.order_id}", "${order.customer_name}")'>Generate Receipt</button>`
            : ""
        }
      </div>
    `;
    return card;
  }

  window.showOrderDetails = function (encodedOrder) {
    const orderData = JSON.parse(decodeURIComponent(encodedOrder));
    const modal = document.getElementById("order-details-modal");

    if (!modal) {
      console.error("Modal element with ID 'order-details-modal' not found.");
      return;
    }

    modal.querySelector(".modal-title").textContent = `Order ID: ${orderData.order_id}`;
    modal.querySelector(".modal-body").innerHTML = `
      <p><strong>Order Date:</strong> ${orderData.order_datetime}</p>
      ${orderData.items
        .map(
          (item) => `
        <p>${item.quantity}x ${item.item} - Php ${item.price}</p>
      `
        )
        .join("")}
      <p><strong>Status:</strong> ${orderData.status}</p>
    `;
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
  };

  window.cancelOrder = function (orderId, encodedOrderItems) {
    // Decode the order items
    const orderItems = JSON.parse(decodeURIComponent(encodedOrderItems));
    console.log("Cancelling order:", orderId, orderItems);
    // Confirm with the user before proceeding
    if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) return;

    // Update the order status to "Cancelled"
    updateOrderStatus(orderId, "Cancelled")
      .then(() => {
        // Add inventory back for each item in the order
        const restockPromises = orderItems.map((item) => {
            const payload = {
                product_id: item.product_id,
                quantity: item.quantity,
                remark: `Stock-in: Order cancelled from ${orderId} on ${new Date().toISOString()}`,
            };
            console.log(`Restocking inventory for product ${item.product_id}:`, payload);
            return fetch(`/api/padeliver-inventory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
                .then((response) => {
                if (!response.ok) {
                    return response.json().then((data) => {
                    throw new Error(data.error || `Failed to update inventory for product ${item.product_id}`);
                    });
                }
                return response.json();
                })
                .then((data) => {
                console.log(`Inventory updated for product ${item.product_id}:`, data);
                });
        });

        // Wait for all restock operations to complete
        return Promise.all(restockPromises);
      })
      .then(() => {
        alert("Order canceled and inventory restocked successfully.");
        fetchOrders(); // Refresh the orders list
      })
      .catch((error) => {
        console.error("Error canceling order or restocking inventory:", error);
        alert("Failed to cancel the order or restock inventory. Please try again later.");
      });
  };

  window.markAsReceived = function (orderId) {
    if (!confirm("Mark this order as received?")) return;
    updateOrderStatus(orderId, "Received");
  };

  function updateOrderStatus(orderId, status) {
    const userId = sessionStorage.getItem("user_id"); // Get user_id from sessionStorage
    if (!userId) {
      alert("User session has expired. Please sign in again.");
      window.location.href = "/signin.html";
      return Promise.reject("User session expired");
    }
  
    const payload = {
      order_id: orderId,
      customer_name: userId,
      status: status,
    };
  
    return fetch(`/api/orders/update-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || `Failed to update order status: ${response.statusText}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          alert(data.message || "Order updated successfully.");
          fetchOrders();
        } else {
          throw new Error(data.error || "Unknown error occurred");
        }
      })
      .catch((error) => {
        console.error("Error in updateOrderStatus:", error);
        throw error; // Re-throw the error to be handled by the caller
      });
  }

  window.generateReceipt = function (orderId, customerName) {
    if (!confirm("Do you confirm that the order is received and generate a receipt for this order?")) return;

    const payload = {
        order_id: orderId,
        customer_name: customerName,
    };

    fetch("/api/orders/generate-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert(data.message || "Receipt generated successfully.");
                fetchOrders(); // Re-fetch orders to update the UI
            } else {
                alert(data.error || "Failed to generate receipt.");
            }
        })
        .catch((error) => {
            console.error("Error generating receipt:", error);
            alert("An error occurred while generating the receipt.");
        });
  };

  fetchOrders();
});
