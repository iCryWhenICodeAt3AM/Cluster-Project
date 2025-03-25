document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Fetch the user's orders from the server
        const userId = sessionStorage.getItem('user_id'); // Retrieve user ID from session storage
        if (!userId) {
            console.log('User ID not found in session storage');
            throw new Error('User ID not found in session storage');
        }
        
        console.log('Fetching orders for user:', userId);
        const response = await fetch(`/api/orders/${userId}`);
        if (!response.ok) {
            console.error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
        }

        const ordersData = await response.json().catch(() => {
            console.error('Failed to parse JSON response');
            throw new Error('Failed to parse JSON response');
        });

        console.log('Orders data received:', ordersData);
        const orders = Array.isArray(ordersData.orders) ? ordersData.orders : [];
        console.log('Parsed orders:', orders);
        
        // Categorize orders - Current orders are Preparing, Shipped, and Delivered
        const currentOrders = orders.filter(order => ["Preparing", "Shipped", "Delivered"].includes(order.status));
        console.log('Current orders (Preparing, Shipped, Delivered):', currentOrders);
        
        // Count the current orders
        const orderCount = currentOrders.length;
        console.log('Current order count:', orderCount);

        // Retry mechanism to ensure the target element is available
        const getCountElement = async (retries = 5, delay = 100) => {
            for (let i = 0; i < retries; i++) {
                const countElement = document.getElementById('orders-count');
                if (countElement) {
                    console.log('Found orders-count element');
                    return countElement;
                }
                console.log(`Attempt ${i+1}: orders-count element not found, retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            console.error('Element with ID "orders-count" not found after retries.');
            throw new Error('Element with ID "orders-count" not found after retries.');
        };

        const countElement = await getCountElement();
        console.log('Setting orders-count to:', orderCount);
        countElement.textContent = orderCount;
    } catch (error) {
        console.error('Error fetching or processing orders:', error);
    }
});
