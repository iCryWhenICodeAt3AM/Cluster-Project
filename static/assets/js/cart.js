// Ensure PubNub is included
// <script src="https://cdn.pubnub.com/sdk/javascript/pubnub.4.29.9.min.js"></script>

document.addEventListener("DOMContentLoaded", function() {
  let cart = [];
  const userId = sessionStorage.getItem('user_id') || 'default_user'; // Replace with actual user ID logic

  function updateCart() {
    const cartContainer = document.getElementById('cart');
    cartContainer.innerHTML = '';
    let total = 0;

    if (Array.isArray(cart)) {
      cart.forEach(item => {
        const itemTotal = item.quantity * item.price;
        const cartItem = `
          <div class="cart-item py-3">
            <div class="d-flex justify-content-between">
              <div>
                <h6 class="mb-1">${item.quantity}x ${item.item}</h6>
                <p class="text-muted small mb-0">${item.description}</p>
              </div>
              <div class="text-end">
                <span class="fw-bold">Php ${itemTotal}</span>
                <button class="btn btn-outline-secondary btn-sm mt-1" onclick="openEditModal('${item.product_id}')">Edit</button>
              </div>
            </div>
          </div>
        `;
        cartContainer.insertAdjacentHTML('beforeend', cartItem);
        total += itemTotal;
      });
    }

    document.querySelector('.card-footer .fw-bold:last-child').textContent = `Php ${total}`;
    sessionStorage.setItem('cart', JSON.stringify(cart));
  }

  function addToCart(product) {
    console.log("Attempting to add product to cart:", product);

    const quantity = parseInt(prompt("Enter quantity:", "1"));
    if (isNaN(quantity) || quantity <= 0) {
      alert("Invalid quantity. Please enter a positive number.");
      console.log("Invalid quantity entered:", quantity);
      return;
    }

    // Prepare the product object with the quantity
    product.quantity = quantity;

    console.log("Sending product to server:", product);

    fetch('/add_to_cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId, product_id: product.product_id, product })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            console.error("Server error response:", data);
            throw new Error(data.error || `Server error: ${response.statusText}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log("Server response:", data);
        alert(data.message || 'Item added to cart successfully!');
        fetchCart(); // Fetch the updated cart and reload the display
      })
      .catch(error => {
        console.error('Error adding to cart:', error);
        alert('An error occurred while adding the item to the cart. Please try again.');
      });
  }

  function updateQuantity(productId, change) {
    const product = cart.find(item => item.product_id === productId);
    // console.log('Updating quantity:', productId, change);
    // console.log("Product object:", product);
    if (product) {
      const newQuantity = parseInt(product.quantity) + parseInt(change);
      product.quantity = change;

      console.log('Updated cart:', product);
      // Push only the quantity change directly to the server
      fetch(`/add_to_cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, product_id: productId, product })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to update quantity: ${response.statusText}`);
          }
          console.log('Quantity updated successfully:', response);
          return response.json();
        })
        .then(data => {
          console.log('New quantity:', newQuantity);
          product.quantity = newQuantity; // Update the quantity in the cart 
          // console.log('Quantity updated successfully product:', data);
          updateCart(); // Update the UI after successful update
        })
        .catch(error => {
          console.error('Error updating quantity:', error);
          alert('An error occurred while updating the quantity. Please try again.');
        });
    }
  }

  function openEditModal(productId) {
    const product = cart.find(item => item.product_id === productId);
    if (!product) return;

    const modal = document.getElementById('edit-product-modal');
    modal.querySelector('#edit-product-name').textContent = product.item;
    modal.querySelector('#edit-product-quantity').value = product.quantity;
    modal.querySelector('#edit-product-id').value = productId;

    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
  }

  function saveProductChanges() {
    const productId = document.getElementById('edit-product-id').value;
    const newQuantity = parseInt(document.getElementById('edit-product-quantity').value, 10);
    const operation = document.querySelector('input[name="edit-operation"]:checked').value;
  
    if (operation === 'remove') {
      cart = cart.filter(item => item.product_id !== productId);
  
      fetch('/add_to_cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, product_id: productId, product: { quantity: 0 } })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to remove product: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('Product removed successfully:', data);
          updateCart();
        })
        .catch(error => {
          console.error('Error removing product:', error);
          alert('An error occurred while removing the product. Please try again.');
        });
    } else if (operation === 'update' && newQuantity > 0) {
      const product = cart.find(item => item.product_id === productId);
      if (product) {
        product.quantity = newQuantity;
  
        fetch('/add_to_cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, product_id: productId, product })
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to update product: ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('Product updated successfully:', data);
            updateCart();
          })
          .catch(error => {
            console.error('Error updating product:', error);
            alert('An error occurred while updating the product. Please try again.');
          });
      }
    } else {
      alert('Invalid quantity. Please enter a positive number.');
    }
  
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('edit-product-modal'));
    modalInstance.hide();
    updateCart();
  }

  function fetchCart() {
    fetch(`/api/cart/${userId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        cart = data.cart || [];
        updateCart();
      })
      .catch(error => {
        console.error('Error fetching cart:', error);
        alert('An error occurred while fetching the cart. Please try again.');
      });
  }

  // Attach event listeners to Add buttons
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('btn-primary') && event.target.textContent === 'Add') {
      const productCard = event.target.closest('.card');
      const product = {
        product_id: productCard.dataset.productId,
        item: productCard.querySelector('.card-title').textContent,
        description: productCard.querySelector('.card-text').textContent,
        price: parseFloat(productCard.querySelector('.fw-bold').textContent.replace('Php', '')),
        stock: parseInt(productCard.dataset.productStock) || 0 // Add stock from data attribute with fallback
      };
      addToCart(product);
    }
  });

  window.updateQuantity = updateQuantity; // Make updateQuantity function globally accessible
  window.openEditModal = openEditModal;
  window.saveProductChanges = saveProductChanges;

  fetchCart(); // Fetch the cart when the page loads

  document.getElementById('place-order-button').addEventListener('click', () => {
    const userId = sessionStorage.getItem('user_id');
    if (!userId) {
      alert('User not signed in. Redirecting to sign-in page.');
      window.location.href = '/signin.html';
      return;
    }
  
    fetch(`/api/cart/${userId}/place-order`, { method: 'POST' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        alert(data.message || 'Order placed successfully!');
        sessionStorage.setItem('cart', JSON.stringify([])); // Clear cart in session storage
        document.getElementById('cart').innerHTML = ''; // Clear cart display
        document.getElementById('cart-total').textContent = 'Php 0.00'; // Reset total
        fetchCart(); // Re-fetch the cart
        fetchProducts(); // Re-fetch products to update stock availability
      })
      .catch(error => {
        console.error('Error during order placement:', error);
        alert('An error occurred while placing the order. Please try again.');
      });
  });

  function fetchProducts() {
    fetch('/api/products')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Products fetched successfully:', data);
        // Update the product list UI here if necessary
      })
      .catch(error => {
        console.error('Error fetching products:', error);
      });
  }
});
