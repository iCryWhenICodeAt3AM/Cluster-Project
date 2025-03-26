// Logout functionality
document.getElementById('logout-button').addEventListener('click', function () {
    fetch('/logout', { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            alert(data.message || 'Logged out successfully!');
            sessionStorage.clear(); // Clear session storage
            window.location.href = data.redirect || '/signin.html'; // Redirect to sign-in page
        })
        .catch(error => console.error('Error during logout:', error));
});

// Global variables to track current sort and filter settings
let currentOrders = [];
let currentSortField = 'order_datetime';
let currentSortDirection = 'desc'; // newest first by default

// Simplified filter function
function applyFilters() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    
    // First filter the orders
    let filteredOrders = currentOrders.filter(order => {
        const matchesSearch = order.order_id.toLowerCase().includes(searchInput) ||
                              order.customer_name.toLowerCase().includes(searchInput);
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    // Sort filtered orders
    sortOrders(filteredOrders);
    
    // Display the filtered and sorted orders
    displayFilteredOrders(filteredOrders);
}

// Shorthand for legacy function
function filterOrders() {
    applyFilters();
}

// Function to sort orders based on current sort settings
function sortOrders(orders) {
    orders.sort((a, b) => {
        let valA, valB;
        
        // Handle different data types for different fields
        if (currentSortField === 'order_datetime') {
            valA = new Date(a[currentSortField]);
            valB = new Date(b[currentSortField]);
        } else if (currentSortField === 'status') {
            // Custom sort order for statuses
            const statusOrder = {
                'Preparing': 1,
                'Shipped': 2,
                'Delivered': 3,
                'Received': 4,
                'Cancelled': 5
            };
            valA = statusOrder[a.status] || 999; // Default high value for unknown statuses
            valB = statusOrder[b.status] || 999;
        } else {
            valA = a[currentSortField].toString().toLowerCase();
            valB = b[currentSortField].toString().toLowerCase();
        }
        
        // Compare based on sort direction
        if (currentSortDirection === 'asc') {
            return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
            return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
    });
    
    return orders;
}

// Display filtered orders without changing the tab counts
function displayFilteredOrders(filteredOrders) {
    const tableBodies = [
        document.getElementById('all-orders-table-body'),
        document.getElementById('preparing-table-body'),
        document.getElementById('shipping-table-body'),
        document.getElementById('delivered-table-body'),
        document.getElementById('cancelled-table-body'),
        document.getElementById('received-table-body')
    ];
    
    // Clear all table bodies
    tableBodies.forEach(tableBody => {
        tableBody.innerHTML = '';
    });
    
    // Populate tables with filtered orders
    filteredOrders.forEach(order => {
        let actionButtons = [];

        // Add buttons based on order status
        if (order.status === 'Preparing') {
            actionButtons.push(`
                <button class="btn btn-success btn-sm ms-1" onclick="updateOrderStatus('${order.order_id}', '${order.status}', '${order.customer_name}', 'forward')">
                    <i class="bi bi-arrow-right-circle"></i> Move to Shipped
                </button>
            `);
        } else if (order.status === 'Shipped') {
            actionButtons.push(`
                <button class="btn btn-warning btn-sm ms-1" onclick="updateOrderStatus('${order.order_id}', '${order.status}', '${order.customer_name}', 'backward')">
                    <i class="bi bi-arrow-left-circle"></i> Return to Preparing
                </button>
            `);
            actionButtons.push(`
                <button class="btn btn-success btn-sm ms-1" onclick="updateOrderStatus('${order.order_id}', '${order.status}', '${order.customer_name}', 'forward')">
                    <i class="bi bi-arrow-right-circle"></i> Move to Delivered
                </button>
            `);
        } else if (order.status === 'Delivered') {
            actionButtons.push(`
                <button class="btn btn-warning btn-sm ms-1" onclick="updateOrderStatus('${order.order_id}', '${order.status}', '${order.customer_name}', 'backward')">
                    <i class="bi bi-arrow-left-circle"></i> Return to Shipped
                </button>
            `);
        }

        const row = `
            <tr>
                <td>${order.order_id}</td>
                <td>${new Date(order.order_datetime).toLocaleString()}</td>
                <td>${order.customer_name}</td>
                <td><span class="badge ${getBadgeClass(order.status)}">${order.status}</span></td>
                <td class="text-center">
                    <button class="btn btn-info btn-sm" onclick='showOrderDetails("${order.order_id}", "${encodeURIComponent(JSON.stringify(order.items))}", "${order.customer_name}", "${order.order_datetime}")'>
                        <i class="bi bi-info-circle"></i> Details
                    </button>
                </td>
                <td class="text-center">
                    ${actionButtons.join('')}
                </td>
            </tr>
        `;
        
        // Add to all orders tab
        document.getElementById('all-orders-table-body').innerHTML += row;
        
        // Add to respective tab based on status
        if (order.status === 'Preparing') {
            document.getElementById('preparing-table-body').innerHTML += row;
        } else if (order.status === 'Shipped') {
            document.getElementById('shipping-table-body').innerHTML += row;
        } else if (order.status === 'Delivered') {
            document.getElementById('delivered-table-body').innerHTML += row;
        } else if (order.status === 'Cancelled') {
            document.getElementById('cancelled-table-body').innerHTML += row;
        } else if (order.status === 'Received') {
            document.getElementById('received-table-body').innerHTML += row;
        }
    });
}

// Fetch orders for delivery
async function fetchOrders() {
    try {
        const response = await fetch('/api/orders');
        const data = await response.json();
        if (response.ok) {
            currentOrders = data.orders; // Store orders globally
            
            // Apply initial sort (newest first)
            sortOrders(currentOrders);
            
            // Display orders and update counts
            displayOrders(currentOrders);
            
            // Set up click handlers for sortable headers
            setupSortableHeaders();
        } else {
            console.error('Error fetching orders:', data.error);
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

// Set up click handlers for sortable headers
function setupSortableHeaders() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', function() {
            const field = this.dataset.field;
            
            // If clicking on the same field, toggle direction
            if (field === currentSortField) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = field;
                currentSortDirection = 'asc';
            }
            
            // Update sort indicators in UI
            document.querySelectorAll('.sortable').forEach(h => {
                h.classList.remove('sort-active', 'sort-desc');
            });
            
            this.classList.add('sort-active');
            if (currentSortDirection === 'desc') {
                this.classList.add('sort-desc');
            }
            
            // Apply sort and reapply filters
            sortOrders(currentOrders);
            applyFilters();
        });
    });
}

// Helper function to get appropriate badge class for order status
function getBadgeClass(status) {
    switch(status) {
        case 'Preparing':
            return 'bg-warning text-dark';
        case 'Shipped':
            return 'bg-primary';
        case 'Delivered':
            return 'bg-success';
        case 'Cancelled':
            return 'bg-danger';
        case 'Received':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

// Update order status
async function updateOrderStatus(orderId, currentStatus, customerName, direction) {
    let nextState;
    
    if (direction === 'forward') {
        nextState = {
            'Preparing': 'Shipped',
            'Shipped': 'Delivered'
        }[currentStatus];
        
        if (!nextState) {
            alert('Order is already delivered.');
            return;
        }
    } else if (direction === 'backward') {
        nextState = {
            'Shipped': 'Preparing',
            'Delivered': 'Shipped'
        }[currentStatus];
        
        if (!nextState) {
            alert('Order is already in the initial state.');
            return;
        }
    }

    const payload = {
        order_id: orderId,
        status: nextState,
        customer_name: customerName
    };

    try {
        const response = await fetch(`/api/orders/update-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            if (direction === 'forward') {
                alert(`Order successfully moved to ${nextState}.`);
            } else {
                alert(`Order successfully returned to ${nextState}.`);
            }
            fetchOrders();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to update order status.');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

// Show order details in a modal
function showOrderDetails(orderId, items, customerName, orderDate) {
    let parsedItems;

    // Attempt to parse the items JSON
    try {
        const decodedItems = decodeURIComponent(items);
        parsedItems = JSON.parse(decodedItems);
    } catch (error) {
        console.error('Error parsing items JSON:', error);
        alert('Failed to load order details due to invalid data.');
        return;
    }

    // Populate modal fields
    document.getElementById('modal-order-id').textContent = orderId;
    document.getElementById('modal-customer-name').textContent = customerName;
    document.getElementById('modal-order-date').textContent = new Date(orderDate).toLocaleString();

    // Populate items table
    const itemsTableBody = document.getElementById('modal-items-table-body');
    itemsTableBody.innerHTML = ''; // Clear existing content
    parsedItems.forEach(item => {
        const row = `
            <tr>
                <td>${item.item}</td>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${item.price} PHP</td>
            </tr>
        `;
        itemsTableBody.innerHTML += row;
    });

    // Show the modal
    const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    orderDetailsModal.show();
}

// Display all orders with tab counts
function displayOrders(orders) {
    // Store orders globally
    currentOrders = orders;
    
    const allOrdersBody = document.getElementById('all-orders-table-body');
    const preparingBody = document.getElementById('preparing-table-body');
    const shippingBody = document.getElementById('shipping-table-body');
    const deliveredBody = document.getElementById('delivered-table-body');
    const cancelledBody = document.getElementById('cancelled-table-body');
    const receivedBody = document.getElementById('received-table-body');

    // Clear existing content
    allOrdersBody.innerHTML = '';
    preparingBody.innerHTML = '';
    shippingBody.innerHTML = '';
    deliveredBody.innerHTML = '';
    cancelledBody.innerHTML = '';
    receivedBody.innerHTML = '';

    // Initialize counters
    let allOrdersCount = 0;
    let preparingCount = 0;
    let shippingCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let receivedCount = 0;

    orders.forEach(order => {
        let actionButtons = [];
        
        // Add buttons based on order status
        if (order.status === 'Preparing') {
            actionButtons.push(`
                <button class="btn btn-success btn-sm ms-1" onclick="updateOrderStatus('${order.order_id}', '${order.status}', '${order.customer_name}', 'forward')">
                    <i class="bi bi-arrow-right-circle"></i> Move to Shipped
                </button>
            `);
        } else if (order.status === 'Shipped') {
            actionButtons.push(`
                <button class="btn btn-warning btn-sm ms-1" onclick="updateOrderStatus('${order.order_id}', '${order.status}', '${order.customer_name}', 'backward')">
                    <i class="bi bi-arrow-left-circle"></i> Return to Preparing
                </button>
            `);
            actionButtons.push(`
                <button class="btn btn-success btn-sm ms-1" onclick="updateOrderStatus('${order.order_id}', '${order.status}', '${order.customer_name}', 'forward')">
                    <i class="bi bi-arrow-right-circle"></i> Move to Delivered
                </button>
            `);
        } else if (order.status === 'Delivered') {
            actionButtons.push(`
                <button class="btn btn-warning btn-sm ms-1" onclick="updateOrderStatus('${order.order_id}', '${order.status}', '${order.customer_name}', 'backward')">
                    <i class="bi bi-arrow-left-circle"></i> Return to Shipped
                </button>
            `);
        }

        const row = `
            <tr>
                <td>${order.order_id}</td>
                <td>${new Date(order.order_datetime).toLocaleString()}</td>
                <td>${order.customer_name}</td>
                <td><span class="badge ${getBadgeClass(order.status)}">${order.status}</span></td>
                <td class="text-center">
                    <button class="btn btn-info btn-sm" onclick='showOrderDetails("${order.order_id}", "${encodeURIComponent(JSON.stringify(order.items))}", "${order.customer_name}", "${order.order_datetime}")'>
                        <i class="bi bi-info-circle"></i> Details
                    </button>
                </td>
                <td class="text-center">
                    ${actionButtons.join('')}
                </td>
            </tr>
        `;

        // Add to respective tab and increment counters
        allOrdersBody.innerHTML += row;
        allOrdersCount++;
        if (order.status === 'Preparing') {
            preparingBody.innerHTML += row;
            preparingCount++;
        }
        if (order.status === 'Shipped') {
            shippingBody.innerHTML += row;
            shippingCount++;
        }
        if (order.status === 'Delivered') {
            deliveredBody.innerHTML += row;
            deliveredCount++;
        }
        if (order.status === 'Cancelled') {
            cancelledBody.innerHTML += row;
            cancelledCount++;
        }
        if (order.status === 'Received') {
            receivedBody.innerHTML += row;
            receivedCount++;
        }
    });

    // Update tab counts
    document.getElementById('all-orders-count').textContent = allOrdersCount;
    document.getElementById('preparing-count').textContent = preparingCount;
    document.getElementById('shipping-count').textContent = shippingCount;
    document.getElementById('delivered-count').textContent = deliveredCount;
    document.getElementById('cancelled-count').textContent = cancelledCount;
    document.getElementById('received-count').textContent = receivedCount;
}

// Load orders on page load
document.addEventListener('DOMContentLoaded', fetchOrders);
