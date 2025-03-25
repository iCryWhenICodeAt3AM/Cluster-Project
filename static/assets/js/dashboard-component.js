document.addEventListener('DOMContentLoaded', function () {
    // Sidebar navigation
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    const contentSections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');

            // Hide all sections
            contentSections.forEach(section => {
                section.style.display = 'none';
            });

            // Show the selected section
            document.getElementById(sectionId).style.display = 'block';

            // Remove active class from all links
            navLinks.forEach(link => {
                link.classList.remove('active');
            });

            // Add active class to the clicked link
            this.classList.add('active');
        });
    });

document.getElementById('addNewCategoryButton').addEventListener('click', function () {
    const newCategoryInput = document.getElementById('newCategoryInput');
    newCategoryInput.classList.toggle('d-none');
    if (!newCategoryInput.classList.contains('d-none')) {
        newCategoryInput.focus();
    }
});

document.getElementById('logout-button').addEventListener('click', function() {
    fetch('/logout', { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        alert(data.message || 'Logged out successfully!');
        sessionStorage.clear(); // Clear session storage
        window.location.href = data.redirect || '/signin.html'; // Redirect to sign-in page
      })
      .catch(error => console.error('Error during logout:', error));
  });
});

// Function to handle product deletion
function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
    return;
    }

    fetch(`/api/delete-product/${productId}`, {
    method: 'DELETE',
    })
    .then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.text(); // Expecting plain text response
    })
    .then(message => {
        alert(message.message || 'Product deleted successfully!');
        location.reload(); // Reload the page to reflect changes
    })
    .catch(error => {
    console.error('Error deleting product:', error);
    alert('An error occurred. Please check the server logs or try again.');
    });
}

// Attach delete button functionality dynamically
document.getElementById('products-stock').addEventListener('click', function (e) {
    const target = e.target.closest('.btn-delete'); // Ensure the correct button is targeted
    if (target) {
        const productId = target.getAttribute('data-product-id'); // Get the product ID
        if (productId) {
            deleteProduct(productId);
        } else {
            console.error('Product ID not found on delete button.');
        }
    }
});

const currentDateElement = document.getElementById('current-date');
const currentDate = new Date();
const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});
currentDateElement.textContent = `Today: ${formattedDate}`;