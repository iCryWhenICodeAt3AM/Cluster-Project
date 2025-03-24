document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Fetch the user's orders from the server
        const userId = sessionStorage.getItem('user_id'); // Retrieve user ID from session storage
        if (!userId) {
            throw new Error('User ID not found in session storage');
        }
        const response = await fetch(`/api/orders/${userId}`); // Adjusted endpoint to include user_id
        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
        }

        const ordersData = await response.json().catch(() => {
            throw new Error('Failed to parse JSON response');
        });

        const orders = Array.isArray(ordersData.orders) ? ordersData.orders : []; // Extract orders array
        console.log(orders);

        // Filter orders by status using a Set for faster lookup
        const validStatuses = new Set(['Preparing', 'Shipping', 'Delivered']);
        const filteredOrders = orders.filter(order => validStatuses.has(order.status));

        // Count the filtered orders
        const orderCount = filteredOrders.length;
        console.log('Order count:', filteredOrders);

        // Retry mechanism to ensure the target element is available
        const getCountElement = async (retries = 5, delay = 100) => {
            for (let i = 0; i < retries; i++) {
                const countElement = document.getElementById('orders-count');
                if (countElement) return countElement;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            throw new Error('Element with ID "order-count" not found after retries.');
        };

        const countElement = await getCountElement();
        countElement.textContent = orderCount;
    } catch (error) {
        console.error('Error fetching or processing orders:', error);
    }
});
