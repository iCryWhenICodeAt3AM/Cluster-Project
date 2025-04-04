document.addEventListener("DOMContentLoaded", function () {
  const userId = sessionStorage.getItem("user_id");
  if (!userId) {
    alert("You must be signed in to view your orders.");
    window.location.href = "/signin.html";
    return;
  }

  const sections = {
    All: document.getElementById("all-orders-section"),
    Current: document.getElementById("current-orders-section"),
    Past: document.getElementById("past-orders-section"),
    Cancelled: document.getElementById("cancelled-orders-section"),
  };

  const tabCounts = {
    All: document.getElementById("all-count"),
    Current: document.getElementById("current-count"),
    Past: document.getElementById("past-count"),
    Cancelled: document.getElementById("cancelled-count"),
  };

  const paginations = {
    All: document.getElementById("all-pagination"),
    Current: document.getElementById("current-pagination"),
    Past: document.getElementById("past-pagination"),
    Cancelled: document.getElementById("cancelled-pagination"),
  };

  const ordersPerPage = 3;
  const paginatedOrders = {};

  function fetchOrders() {
    console.log("Fetching orders for user:", userId);
    fetch(`/api/orders/${userId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.orders) {
          console.log("Fetched orders:", data.orders);
          categorizeAndDisplayOrders(data.orders);
        } else {
          console.error("Failed to fetch orders:", data.error);
        }
      })
      .catch((error) => console.error("Error fetching orders:", error));
  }

  function categorizeAndDisplayOrders(orders) {
    console.log("Categorizing orders...");
    
    // Initialize categorized orders
    const categorized = {
      All: orders,
      Current: orders.filter(order => ["Preparing", "Shipped", "Delivered"].includes(order.status)),
      Past: orders.filter(order => order.status === "Received"),
      Cancelled: orders.filter(order => order.status === "Cancelled")
    };
    
    console.log("Categorized orders:", categorized);
    
    // Assign categorized orders to paginatedOrders
    Object.keys(categorized).forEach(tab => {
      paginatedOrders[tab] = categorized[tab];
      console.log(`Tab ${tab} has ${paginatedOrders[tab].length} orders`);
      displayOrders(tab, 1);
    });
  }

  function displayOrders(status, page) {
    console.log(`Displaying ${status} orders, page ${page}`);
    const section = sections[status];
    const pagination = paginations[status];
    const orders = paginatedOrders[status] || [];
    const start = (page - 1) * ordersPerPage;
    const end = start + ordersPerPage;

    console.log(`${status} orders:`, orders);
    console.log(`Displaying orders from ${start} to ${end}`);

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
      console.log(`Setting ${status} count to ${orders.length}`);
      tabCount.textContent = orders.length;
    } else {
      console.warn(`Tab count element for ${status} not found`);
    }

    // Add pagination controls
    const totalPages = Math.ceil(orders.length / ordersPerPage);
    console.log(`Total pages for ${status}: ${totalPages}`);
    if (pagination) {
      addPaginationControls(pagination, status, page, totalPages);
    } else {
      console.warn(`Pagination element for ${status} not found`);
    }
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
  
    // Calculate time elapsed since the order date
    const orderDate = new Date(order.order_datetime);
    const now = new Date();
    const timeElapsed = calculateTimeElapsed(orderDate, now);
  
    card.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h4 style="font-size: 1.25rem;">Order ID: ${order.order_id}</h4>
          <p><small style="font-size: 1rem;">${timeElapsed}</small></p>
        </div>
        <p><small class="badge bg-${getStatusBadgeClass(order.status)}" style="font-size: 1rem;">${order.status}</small></p>
      </div>
      <div class="card-body">
        <p style="font-size: 1.1rem;">${firstItem.quantity}x ${firstItem.item} - Php ${firstItem.price}</p>
        ${
          additionalItemsCount > 0
            ? `<p class="text-muted" style="font-size: 1rem;">+ ${additionalItemsCount} more item(s)</p>`
            : ""
        }
      </div>
      <div class="card-footer d-flex justify-content-between">
        <button class="btn btn-primary btn-sm flex-fill" style="margin-right: 0.5rem;" onclick="showOrderDetails('${encodeURIComponent(
          JSON.stringify(order)
        )}')">Show Details</button>
        ${
          order.status === "Preparing" || order.status === "Shipped"
            ? `<button class="btn btn-danger btn-sm flex-fill" style="margin  -right: 0.5rem;" onclick='cancelOrder("${order.order_id}", "${encodeURIComponent(JSON.stringify(order.items))}")'>Cancel Order</button>`
            : ""
        }
        ${
          order.status === "Delivered"
            ? `<button class="btn btn-danger btn-sm flex-fill" onclick='returnOrder("${order.order_id}", "${encodeURIComponent(JSON.stringify(order.items))}")'>Return Order</button>
               <button class="btn btn-success btn-sm flex-fill" style="margin-right: 0.5rem;" onclick='generateReceipt("${order.order_id}", "${order.customer_name}")'>Order Received</button>`
            : ""
        }
      </div>
    `;
  
    function getStatusBadgeClass(status) {
      switch (status) {
        case "Preparing":
          return "warning";
        case "Shipped":
          return "info";
        case "Delivered":
          return "success";
        case "Cancelled":
          return "danger";
        case "Received":
          return "secondary";
        default:
          return "light";
      }
    }
    return card;
  }
  
  function calculateTimeElapsed(orderDate, now) {
    const diffInMs = now - orderDate;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays < 7) {
      return `${diffInDays} day(s) ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week(s) ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month(s) ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} year(s) ago`;
    }
  }

  window.showOrderDetails = function (encodedOrder) {
    const orderData = JSON.parse(decodeURIComponent(encodedOrder));
    const modal = document.getElementById("order-details-modal");
  
    if (!modal) {
      console.error("Modal element with ID 'order-details-modal' not found.");
      return;
    }
  
    // Correct the selector for the stepper container
    const stepperContainer = modal.querySelector(".stepper-wrapper");
    if (!stepperContainer) {
      console.error("Stepper container with class 'stepper-wrapper' not found.");
      return;
    }
  
    // Generate horizontal stepper steps based on order status
    const statusSteps = ["Preparing", "Shipped", "Delivered", "Received"];
    const currentStepIndex = Math.max(statusSteps.indexOf(orderData.status), 0);
    const stepper = statusSteps
      .map(
        (step, index) => `
        <div class="stepper-item ${index <= currentStepIndex ? "completed" : ""}">
          <div class="step-counter">${index + 1}</div>
          <div class="step-name">${step}</div>
        </div>
      `
      )
      .join("");
  
    // Generate item list
    const itemList = orderData.items
      .map(
        (item) => `
        <div class="d-flex justify-content-between align-items-center">
          <span>${item.quantity}x ${item.item}</span>
          <span>Php ${item.price}</span>
        </div>
      `
      )
      .join("");
  
    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal;
  
    // Populate modal content
    stepperContainer.innerHTML = stepper;
    modal.querySelector(".order-items").innerHTML = itemList;
    modal.querySelector(".order-totals").innerHTML = `
      <div class="d-flex justify-content-between fw-bold">
        <span>Total</span>
        <span>Php ${total.toFixed(2)}</span>
      </div>
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

  window.returnOrder = function (orderId, encodedOrderItems) {
    // Decode the order items
    const orderItems = JSON.parse(decodeURIComponent(encodedOrderItems));
    console.log("Returning order:", orderId, orderItems);
    
    // Confirm with the user before proceeding
    if (!confirm("Are you sure you want to return this order? This action cannot be undone.")) return;

    // Update the order status to "Cancelled" (using the same endpoint as cancel)
    updateOrderStatus(orderId, "Cancelled")
      .then(() => {
        // Add inventory back for each item in the order
        const restockPromises = orderItems.map((item) => {
          const payload = {
            product_id: item.product_id,
            quantity: item.quantity
          };
          
          return fetch("/api/inventory/restock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        });

        return Promise.all(restockPromises);
      })
      .then(() => {
        alert("Order has been returned successfully.");
        fetchOrders(); // Refresh the orders display
      })
      .catch((error) => {
        console.error("Error returning order:", error);
        alert("Failed to return order. Please try again.");
      });
  };

  function displayOrdersByTab(orders) {
    console.log("Display orders by tab called with", orders.length, "orders");
    
    // Categorize orders
    categorizeAndDisplayOrders(orders);
  }

  fetchOrders();
});
