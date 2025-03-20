document.addEventListener("DOMContentLoaded", function () {
  const lowStockTable = document.getElementById("low-stock");
  const productsStockTable = document.getElementById("products-stock");
  const paginationControlsLowStock = document.getElementById("pagination-controls-low-stock");
  const paginationControls = document.getElementById("pagination-controls");
  const categoryDropdowns = document.querySelectorAll("#productCategory, #editProductCategory");
  const itemsPerPage = 5;
  let currentPageLowStock = 1;
  let currentPage = 1;
  let currentLowStockProducts = [];
  let currentProducts = [];
  let currentSortKeyLowStock = null;
  let currentSortOrderLowStock = null;
  let currentSortKey = null;
  let currentSortOrder = null;

  // Fetch all products from the server
  function fetchProducts() {
    fetch("/api/dashboard/padeliver-products-with-stock")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error fetching products: ${response.statusText}`);
        }
        return response.json();
      })
      .then((products) => {
        if (!products || !Array.isArray(products)) {
          console.error("Invalid products data received from API");
          return;
        }

        currentProducts = products; // Update the current products list
        currentLowStockProducts = products.filter((product) => product.stock < 30); // Filter low stock products
        updateLowStockProducts();
        updateAllProducts();
        updateDashboardStats(products); // Update dashboard stats
        populateCategories(products); // Dynamically update categories for modals
        populateCategoryFilter(products); // Populate category filter dropdown
      })
      .catch((error) => console.error("Error fetching products:", error));
  }

  // Populate categories dynamically
  function populateCategories(products) {
    if (!products || !Array.isArray(products)) {
      console.error("Invalid products array passed to populateCategories");
      return;
    }

    const categories = [...new Set(products.map((product) => product.category))]; // Extract unique categories
    categoryDropdowns.forEach((dropdown) => {
      dropdown.innerHTML = '<option selected disabled>Select category</option>'; // Reset dropdown
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        dropdown.appendChild(option);
      });
    });
  }

  // Populate categories dynamically for the filter dropdown
  function populateCategoryFilter(products) {
    const categoryFilter = document.getElementById("filter-category");
    if (!categoryFilter) return;

    const categories = ["All Categories", ...new Set(products.map(product => product.category))];
    categoryFilter.innerHTML = ""; // Clear existing options

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  // Handle adding a new category for both modals
  function handleNewCategoryInput(modalId, dropdownId, inputId, buttonId) {
    const addNewCategoryButton = document.querySelector(`#${modalId} #${buttonId}`);
    const newCategoryInput = document.querySelector(`#${modalId} #${inputId}`);
    const categoryDropdown = document.querySelector(`#${modalId} #${dropdownId}`);

    // Ensure elements exist before attaching event listeners
    if (!addNewCategoryButton || !newCategoryInput || !categoryDropdown) {
      console.error(`Elements not found for modalId: ${modalId}`);
      return;
    }

    addNewCategoryButton.addEventListener("click", function () {
      newCategoryInput.classList.toggle("d-none");
      if (!newCategoryInput.classList.contains("d-none")) {
        newCategoryInput.focus();
      }
    });

    newCategoryInput.addEventListener("blur", function () {
      const newCategory = newCategoryInput.value.trim();
      if (newCategory) {
        const option = document.createElement("option");
        option.value = newCategory;
        option.textContent = newCategory;
        categoryDropdown.appendChild(option);
        categoryDropdown.value = newCategory; // Select the new category
        newCategoryInput.value = ""; // Clear the input
        newCategoryInput.classList.add("d-none");
      }
    });
  }

  // Attach new category handlers for both "Add Product" and "Edit Product" modals
  handleNewCategoryInput("addProductModal", "productCategory", "newCategoryInput", "addNewCategoryButton");
  handleNewCategoryInput("editProductModal", "editProductCategory", "editNewCategoryInput", "editAddNewCategoryButton");

  // Update the "Low Stock Products" section with sorting and pagination
  function updateLowStockProducts() {
    if (!lowStockTable) return;

    // Clear the current table content
    lowStockTable.innerHTML = "";

    // Sort products if a sort key is set
    if (currentSortKeyLowStock) {
      currentLowStockProducts.sort((a, b) => {
        const aValue = currentSortKeyLowStock === "price" ? parseFloat(a[currentSortKeyLowStock]) : a[currentSortKeyLowStock];
        const bValue = currentSortKeyLowStock === "price" ? parseFloat(b[currentSortKeyLowStock]) : b[currentSortKeyLowStock];
        if (aValue < bValue) return currentSortOrderLowStock === "asc" ? -1 : 1;
        if (aValue > bValue) return currentSortOrderLowStock === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Calculate pagination
    const startIndex = (currentPageLowStock - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLowStockProducts = currentLowStockProducts.slice(startIndex, endIndex);

    // Populate the table with paginated low stock products
    paginatedLowStockProducts.forEach((product) => {
      const row = document.createElement("tr");
      const stockBadgeClass = product.stock < 10 ? "bg-danger" : "bg-warning";
      const status = product.stock === 0 ? "Inactive" : "Active";
      const statusClass = product.stock === 0 ? "status-inactive" : "status-active";

      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <img src="../static/assets/${product.brand}.jpg" alt="Product" class="product-img me-3">
            <div>
              <h6 class="mb-0">${product.item}</h6>
              <small class="text-muted">#${product.product_id}</small>
            </div>
          </div>
        </td>
        <td>${product.category}</td>
        <td>
          <span class="badge ${stockBadgeClass}">${product.stock} left</span>
        </td>
        <td>
          <span class="status-indicator ${statusClass}"></span> ${status}
        </td>
        <td>
          <button class="btn btn-sm btn-primary" data-product-id="${product.product_id}">Update Stock</button>
        </td>
      `;
      lowStockTable.appendChild(row);
    });

    // Update pagination controls
    updatePaginationControlsLowStock(currentLowStockProducts.length);
  }

  // Update pagination controls for low stock products
  function updatePaginationControlsLowStock(totalItems) {
    if (!paginationControlsLowStock) return;

    paginationControlsLowStock.innerHTML = "";

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Showing text
    const showingText = document.createElement("div");
    showingText.className = "me-auto";
    showingText.textContent = `Showing ${Math.min(currentPageLowStock * itemsPerPage, totalItems)} of ${totalItems} items.`;
    paginationControlsLowStock.appendChild(showingText);

    // Pagination buttons container
    const paginationButtons = document.createElement("div");
    paginationButtons.className = "d-flex align-items-center";

    // Previous button
    if (currentPageLowStock > 1) {
      const prevButton = document.createElement("button");
      prevButton.className = "btn btn-sm btn-outline-primary me-2";
      prevButton.textContent = "Previous";
      prevButton.addEventListener("click", () => {
        currentPageLowStock--;
        updateLowStockProducts();
      });
      paginationButtons.appendChild(prevButton);
    }

    // Go to page input
    const goToPageInput = document.createElement("input");
    goToPageInput.type = "number";
    goToPageInput.className = "form-control form-control-sm me-2";
    goToPageInput.style.width = "60px";
    goToPageInput.value = currentPageLowStock;
    goToPageInput.min = 1;
    goToPageInput.max = totalPages;
    goToPageInput.addEventListener("change", () => {
      const page = parseInt(goToPageInput.value, 10);
      if (page >= 1 && page <= totalPages) {
        currentPageLowStock = page;
        updateLowStockProducts();
      } else {
        goToPageInput.value = currentPageLowStock;
      }
    });
    paginationButtons.appendChild(goToPageInput);

    // Total pages text
    const totalPagesText = document.createElement("span");
    totalPagesText.className = "me-2";
    totalPagesText.textContent = `of ${totalPages}`;
    paginationButtons.appendChild(totalPagesText);

    // Next button
    if (currentPageLowStock < totalPages) {
      const nextButton = document.createElement("button");
      nextButton.className = "btn btn-sm btn-outline-primary";
      nextButton.textContent = "Next";
      nextButton.addEventListener("click", () => {
        currentPageLowStock++;
        updateLowStockProducts();
      });
      paginationButtons.appendChild(nextButton);
    }

    paginationControlsLowStock.appendChild(paginationButtons);
  }

  // Attach sorting event listeners for low stock products
  function attachSortingListenersLowStock() {
    const sortButtons = document.querySelectorAll("[data-sort-low-stock]");
    sortButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-sort-low-stock");
        const ascending = button.getAttribute("data-order") === "asc";
        currentSortKeyLowStock = key;
        currentSortOrderLowStock = ascending ? "asc" : "desc";
        button.setAttribute("data-order", ascending ? "desc" : "asc");
        currentPageLowStock = 1; // Reset to the first page after sorting
        updateLowStockProducts();
        updateSortIndicators(sortButtons, currentSortKeyLowStock, currentSortOrderLowStock);
      });
    });
  }

  // Update the "All Products" section with pagination
  function updateAllProducts() {
    if (!productsStockTable) return;

    // Clear the current table content
    productsStockTable.innerHTML = "";

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = currentProducts.slice(startIndex, endIndex);

    // Populate the table with paginated products
    paginatedProducts.forEach((product) => {
      const row = document.createElement("tr");
      row.setAttribute("data-product-id", product.product_id); // Store the product_id in a data attribute
      const stockBadgeClass = product.stock < 10 ? "bg-danger" : product.stock < 30 ? "bg-warning" : "bg-success";
      const status = product.stock === 0 ? "Inactive" : "Active";
      const statusClass = product.stock === 0 ? "status-inactive" : "status-active";

      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <img src="../static/assets/${product.brand}.jpg" alt="Product" class="product-img me-3">
            <div>
              <h6 class="mb-0">${product.item}</h6>
              <small class="text-muted">#${product.product_id}</small>
            </div>
          </div>
        </td>
        <td>${product.category}</td>
        <td>Php ${product.price}</td>
        <td>
          <span class="badge ${stockBadgeClass}">${product.stock} left</span>
        </td>
        <td>
          <span class="status-indicator ${statusClass}"></span> ${status}
        </td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-product='${JSON.stringify(product)}'>
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.product_id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      productsStockTable.appendChild(row);
    });

    // Update pagination controls
    updatePaginationControls(currentProducts.length);
  }

  // Update pagination controls
  function updatePaginationControls(totalItems) {
    if (!paginationControls) return;

    paginationControls.innerHTML = "";

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Showing text
    const showingText = document.createElement("div");
    showingText.className = "me-auto";
    showingText.textContent = `Showing ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} items.`;
    paginationControls.appendChild(showingText);

    // Pagination buttons container
    const paginationButtons = document.createElement("div");
    paginationButtons.className = "d-flex align-items-center";

    // Previous button
    if (currentPage > 1) {
      const prevButton = document.createElement("button");
      prevButton.className = "btn btn-sm btn-outline-primary me-2";
      prevButton.textContent = "Previous";
      prevButton.addEventListener("click", () => {
        currentPage--;
        updateAllProducts();
      });
      paginationButtons.appendChild(prevButton);
    }

    // Go to page input
    const goToPageInput = document.createElement("input");
    goToPageInput.type = "number";
    goToPageInput.className = "form-control form-control-sm me-2";
    goToPageInput.style.width = "60px";
    goToPageInput.value = currentPage;
    goToPageInput.min = 1;
    goToPageInput.max = totalPages;
    goToPageInput.addEventListener("change", () => {
      const page = parseInt(goToPageInput.value, 10);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        updateAllProducts();
      } else {
        goToPageInput.value = currentPage;
      }
    });
    paginationButtons.appendChild(goToPageInput);

    // Total pages text
    const totalPagesText = document.createElement("span");
    totalPagesText.className = "me-2";
    totalPagesText.textContent = `of ${totalPages}`;
    paginationButtons.appendChild(totalPagesText);

    // Next button
    if (currentPage < totalPages) {
      const nextButton = document.createElement("button");
      nextButton.className = "btn btn-sm btn-outline-primary";
      nextButton.textContent = "Next";
      nextButton.addEventListener("click", () => {
        currentPage++;
        updateAllProducts();
      });
      paginationButtons.appendChild(nextButton);
    }

    paginationControls.appendChild(paginationButtons);
  }

  // Sort products by a given key
  function sortProducts(key, ascending = true) {
    currentProducts.sort((a, b) => {
      const aValue = key === "price" ? parseFloat(a[key]) : a[key];
      const bValue = key === "price" ? parseFloat(b[key]) : b[key];
      if (aValue < bValue) return ascending ? -1 : 1;
      if (aValue > bValue) return ascending ? 1 : -1;
      return 0;
    });
    currentSortKey = key;
    currentSortOrder = ascending ? "asc" : "desc";
    currentPage = 1; // Reset to the first page after sorting
    updateAllProducts();

    // Pass the correct sort buttons to updateSortIndicators
    const sortButtons = document.querySelectorAll("[data-sort]");
    updateSortIndicators(sortButtons, currentSortKey, currentSortOrder);
  }

  // Update sort indicators
  function updateSortIndicators(sortButtons, currentSortKey, currentSortOrder) {
    if (!sortButtons) return; // Ensure sortButtons is defined
    sortButtons.forEach(button => {
      const key = button.getAttribute("data-sort") || button.getAttribute("data-sort-low-stock") || button.getAttribute("data-sort-inventory");
      if (key === currentSortKey) {
        button.innerHTML = `${button.textContent.trim().replace(/ ▲| ▼/g, "")} ${
          currentSortOrder === "asc" ? "▲" : "▼"
        }`;
      } else {
        button.innerHTML = button.textContent.trim().replace(/ ▲| ▼/g, "");
      }
    });
  }

  // Attach sorting event listeners
  function attachSortingListeners() {
    const sortButtons = document.querySelectorAll("[data-sort]");
    sortButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-sort");
        const ascending = button.getAttribute("data-order") === "asc";
        sortProducts(key, ascending);
        button.setAttribute("data-order", ascending ? "desc" : "asc");
      });
    });
  }

  // Attach sorting event listeners for inventory
  function attachSortingListenersInventory() {
    const sortButtons = document.querySelectorAll("[data-sort-inventory]");
    sortButtons.forEach(button => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-sort-inventory");
        const ascending = button.getAttribute("data-order") === "asc";
        currentSortKeyInventory = key;
        currentSortOrderInventory = ascending ? "asc" : "desc";
        button.setAttribute("data-order", ascending ? "desc" : "asc");
        currentPageInventory = 1; // Reset to the first page after sorting
        updateInventoryTable(currentInventory);

        // Pass the correct sort buttons to updateSortIndicators
        updateSortIndicators(sortButtons, currentSortKeyInventory, currentSortOrderInventory);
      });
    });
  }

  // Function to handle adding inventory
  function addInventory(productId) {
    const quantity = parseInt(prompt("Enter quantity to add:", "0"));
    if (isNaN(quantity) || quantity <= 0) {
      alert("Invalid quantity. Please enter a positive number.");
      return;
    }

    const remark = prompt("Enter remark for this inventory update:", "Restock!");
    if (!remark) {
      alert("Remark is required.");
      return;
    }

    const payload = {
      product_id: productId,
      quantity: quantity,
      remark: remark,
    };

    fetch("/api/add-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || `HTTP error! Status: ${response.status}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        alert(data.message || "Inventory updated successfully!");
        fetchProducts(); // Refresh the product list
      })
      .catch((error) => {
        console.error("Error adding inventory:", error);
        alert(`An error occurred: ${error.message}`);
      });
  }

  // Attach event listener to dynamically handle "Update Stock" button clicks
  document.getElementById("low-stock").addEventListener("click", function (e) {
    const target = e.target.closest(".btn-primary"); // Ensure the correct button is targeted
    if (target && target.dataset.productId) {
      openUpdateStockModal(target.dataset.productId);
    }
  });

  // Function to open the Update Stock modal
  function openUpdateStockModal(productId) {
    const updateStockProductId = document.getElementById("updateStockProductId");
    const updateStockAction = document.getElementById("updateStockAction");
    const updateStockQuantity = document.getElementById("updateStockQuantity");
    const updateStockRemark = document.getElementById("updateStockRemark");

    // Reset the form fields
    updateStockProductId.value = productId;
    updateStockAction.value = "add";
    updateStockQuantity.value = "";
    updateStockRemark.value = "";

    // Show the modal
    const updateStockModalElement = document.getElementById("updateStockModal");
    const updateStockModal = bootstrap.Modal.getOrCreateInstance(updateStockModalElement);
    updateStockModal.show();
  }

  // Handle Update Stock form submission
  document.getElementById("updateStockForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const productId = document.getElementById("updateStockProductId").value;
    const action = document.getElementById("updateStockAction").value;
    const quantity = parseInt(document.getElementById("updateStockQuantity").value, 10);
    const userRemark = document.getElementById("updateStockRemark").value.trim();

    if (isNaN(quantity) || quantity <= 0) {
      alert("Invalid quantity. Please enter a positive number.");
      return;
    }

    const remark = action === "add" ? `Stock-in: ${userRemark}` : `Stock-out: ${userRemark}`;

    const payload = {
      product_id: productId,
      quantity: action === "add" ? quantity : -quantity,
      remark: remark,
    };

    fetch("/api/add-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || `HTTP error! Status: ${response.status}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        alert(data.message || "Stock updated successfully!");
        fetchProducts(); // Refresh the product list
        const updateStockModalElement = document.getElementById("updateStockModal");
        const updateStockModal = bootstrap.Modal.getInstance(updateStockModalElement);
        updateStockModal.hide();
      })
      .catch((error) => {
        fetchProducts(); // Refresh the product list
        console.error("Error updating stock:", error);
        alert(`An error occurred: ${error.message}`);
      });
  });

  // Attach event listener to dynamically handle "Update Stock" button clicks
  document.getElementById("low-stock").addEventListener("click", function (e) {
    const target = e.target.closest(".btn-primary"); // Ensure the correct button is targeted
    if (target && target.dataset.productId) {
      openUpdateStockModal(target.dataset.productId);
    }
  });

  // Update dashboard stats
  function updateDashboardStats(products) {
    const totalProducts = products.length;
    const lowStockItems = products.filter(product => product.stock < 30).length;
    const activeProducts = products.filter(product => product.stock > 0).length;
    const outOfStockItems = products.filter(product => product.stock === 0).length;

    // Update the correct element IDs
    document.getElementById("total-products").textContent = totalProducts;
    document.getElementById("low-stock-items").textContent = lowStockItems;
    document.getElementById("active-products").textContent = activeProducts;
    document.getElementById("out-of-stock-items").textContent = outOfStockItems;
  }

  // Initial load
  fetchProducts();
  attachSortingListenersLowStock();
  attachSortingListeners();
  attachSortingListenersInventory();

  // Add Product Form Submission
  const addProductForm = document.querySelector("#addProductModal form");
  addProductForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const productCategoryDropdown = document.getElementById("productCategory");
    const newCategoryInput = document.getElementById("newCategoryInput");
    const productCategory = newCategoryInput.value.trim() || productCategoryDropdown.value;

    const productData = {
      product_id: document.getElementById("productId").value,
      item: document.getElementById("productName").value,
      description: document.getElementById("productDescription").value,
      price: document.getElementById("productPrice").value,
      brand: document.getElementById("productBrand").value,
      category: productCategory, // Use the new category if provided, otherwise use the dropdown value
    };

    fetch("/api/padeliver-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Product added successfully") {
          alert("Product added successfully!");
          addProductForm.reset();
          // Re-fetch and update the product list
          fetchProducts();
        } else {
          alert(data.error || data.message || "Error adding product");
          if (data.invalid_field) {
            document.getElementById(data.invalid_field).classList.add("is-invalid");
          }
        }
      })
      .catch((error) => console.error("Error adding product:", error));
  });

  // Fetch and populate categories on page load
  fetchProducts();

  // Handle "Add New Category" toggle for the "Add Product" modal
  const addNewCategoryButton = document.getElementById("addNewCategoryButton");
  const newCategoryInput = document.getElementById("newCategoryInput");

  if (addNewCategoryButton && newCategoryInput) {
    addNewCategoryButton.addEventListener("click", function () {
      newCategoryInput.classList.toggle("d-none");
      if (!newCategoryInput.classList.contains("d-none")) {
        newCategoryInput.focus();
      }
    });
  }

  // Attach event listener for the "Edit Product" form submission
  document.getElementById("editProductForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const oldProductId = document.getElementById("editProductId").dataset.oldProductId; // Retrieve the old product ID
    const newProductId = document.getElementById("editProductId").value.trim();
    const productName = document.getElementById("editProductName").value.trim();
    const productCategory = document.getElementById("editProductCategory").value.trim();
    const productPrice = document.getElementById("editProductPrice").value.trim();
    const productBrand = document.getElementById("editProductBrand").value.trim();
    const productDescription = document.getElementById("editProductDescription").value.trim();

    // Validate required fields
    if (!oldProductId) {
        alert("Old product ID is required.");
        return;
    }

    // Prepare the payload with the old product ID and updated fields
    const payload = { product_id: oldProductId }; // Always include the old product ID
    if (newProductId) payload.new_product_id = newProductId;
    if (productName) payload.item = productName;
    if (productCategory) payload.category = productCategory;
    if (productPrice) {
        const price = parseFloat(productPrice);
        if (isNaN(price)) {
            alert("Invalid price format. Please enter a valid number.");
            return;
        }
        payload.price = price;
    }
    if (productBrand) payload.brand = productBrand;
    if (productDescription) payload.description = productDescription;

    // Send the update request
    fetch("/api/update-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! Status: ${response.status}`);
        }
        return data;
    })
    .then((data) => {
        if (data.success) {
            alert(data.message || "Product updated successfully!");
            document.getElementById("editProductForm").reset(); // Reset the form
            fetchProducts(); // Refresh the product list
        } else {
            alert(data.error || "Failed to update product.");
            fetchProducts(); // Refresh the product list
        }
    })
    .catch((error) => {
        console.error("Error updating product:", error);
        alert(`An error occurred: ${error.message}`);
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
      return response.json();
  })
  .then(data => {
      if (data.success) {
          alert('Product deleted successfully!');
          fetchProducts(); // Refresh the product list
      } else {
          alert(data.error || 'Failed to delete product.');
      }
  })
  .catch(error => {
      console.error('Error deleting product:', error);
      alert('An error occurred. Please check the server logs or try again.');
  });
}

// Attach event listener to dynamically open the Edit Product modal
document.getElementById("products-stock").addEventListener("click", function (e) {
    const target = e.target.closest(".btn-primary"); // Ensure the correct button is targeted
    if (target && target.dataset.product) {
        const product = JSON.parse(target.dataset.product); // Parse the product data

        // Populate the edit form with product data
        const editProductIdInput = document.getElementById("editProductId");
        editProductIdInput.value = ''; // Clear the new product ID field
        editProductIdInput.setAttribute("data-old-product-id", product.product_id); // Store the old product ID

        document.getElementById("editProductName").value = product.item || '';
        document.getElementById("editProductCategory").value = product.category || '';
        document.getElementById("editProductPrice").value = product.price || '';
        document.getElementById("editProductBrand").value = product.brand || '';
        document.getElementById("editProductDescription").value = product.description || '';

        // Ensure the modal is properly initialized before showing it
        const editProductModalElement = document.getElementById("editProductModal");
        const editProductModal = bootstrap.Modal.getOrCreateInstance(editProductModalElement); // Get or create the modal instance
        editProductModal.show();
    }
});

// Add event listeners for search and filter functionality
document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("search-products");
  const categoryFilter = document.getElementById("filter-category");
  const statusFilter = document.getElementById("filter-status");

  function filterProducts() {
    const searchQuery = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedStatus = statusFilter.value;

    const filteredProducts = currentProducts.filter(product => {
      const matchesSearch = product.item.toLowerCase().includes(searchQuery);
      const matchesCategory = selectedCategory === "All Categories" || product.category === selectedCategory;
      const matchesStatus =
        selectedStatus === "All Status" ||
        (selectedStatus === "Active" && product.stock > 0) ||
        (selectedStatus === "Inactive" && product.stock === 0);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    currentPage = 1; // Reset to the first page
    updateFilteredProducts(filteredProducts);
  }

  function updateFilteredProducts(filteredProducts) {
    // Clear the current table content
    productsStockTable.innerHTML = "";

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Populate the table with paginated products
    paginatedProducts.forEach(product => {
      const row = document.createElement("tr");
      const stockBadgeClass = product.stock < 10 ? "bg-danger" : product.stock < 30 ? "bg-warning" : "bg-success";
      const status = product.stock === 0 ? "Inactive" : "Active";
      const statusClass = product.stock === 0 ? "status-inactive" : "status-active";

      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <img src="../static/assets/${product.brand}.jpg" alt="Product" class="product-img me-3">
            <div>
              <h6 class="mb-0">${product.item}</h6>
              <small class="text-muted">#${product.product_id}</small>
            </div>
          </div>
        </td>
        <td>${product.category}</td>
        <td>Php ${product.price.toLocaleString()}</td>
        <td>
          <span class="badge ${stockBadgeClass}">${product.stock.toLocaleString()} left</span>
        </td>
        <td>
          <span class="status-indicator ${statusClass}"></span> ${status}
        </td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-product='${JSON.stringify(product)}'>
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.product_id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      productsStockTable.appendChild(row);
    });

    // Update pagination controls
    updatePaginationControls(filteredProducts.length);
  }

  // Attach event listeners to search and filter inputs
  searchInput.addEventListener("input", filterProducts);
  categoryFilter.addEventListener("change", filterProducts);
  statusFilter.addEventListener("change", filterProducts);
});

  // Display the current date
  const currentDateElement = document.getElementById("current-date");
  if (currentDateElement) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    currentDateElement.textContent = `Today: ${formattedDate}`;
  }

  // Fix filter functionality
  const searchInput = document.getElementById("search-products");
  const categoryFilter = document.getElementById("filter-category");
  const statusFilter = document.getElementById("filter-status");

  function filterProducts() {
    const searchQuery = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedStatus = statusFilter.value;

    const filteredProducts = currentProducts.filter(product => {
      const matchesSearch = product.item.toLowerCase().includes(searchQuery);
      const matchesCategory = selectedCategory === "All Categories" || product.category === selectedCategory;
      const matchesStatus =
        selectedStatus === "All Status" ||
        (selectedStatus === "Active" && product.stock > 0) ||
        (selectedStatus === "Inactive" && product.stock === 0);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    currentPage = 1; // Reset to the first page
    updateFilteredProducts(filteredProducts);
  }

  function updateFilteredProducts(filteredProducts) {
    // Clear the current table content
    productsStockTable.innerHTML = "";

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Populate the table with paginated products
    paginatedProducts.forEach(product => {
      const row = document.createElement("tr");
      const stockBadgeClass = product.stock < 10 ? "bg-danger" : product.stock < 30 ? "bg-warning" : "bg-success";
      const status = product.stock === 0 ? "Inactive" : "Active";
      const statusClass = product.stock === 0 ? "status-inactive" : "status-active";

      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <img src="../static/assets/${product.brand}.jpg" alt="Product" class="product-img me-3">
            <div>
              <h6 class="mb-0">${product.item}</h6>
              <small class="text-muted">#${product.product_id}</small>
            </div>
          </div>
        </td>
        <td>${product.category}</td>
        <td>Php ${product.price.toLocaleString()}</td>
        <td>
          <span class="badge ${stockBadgeClass}">${product.stock.toLocaleString()} left</span>
        </td>
        <td>
          <span class="status-indicator ${statusClass}"></span> ${status}
        </td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-product='${JSON.stringify(product)}'>
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.product_id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      productsStockTable.appendChild(row);
    });

    // Update pagination controls
    updatePaginationControls(filteredProducts.length);
  }

  // Attach event listeners to search and filter inputs
  searchInput.addEventListener("input", filterProducts);
  categoryFilter.addEventListener("change", filterProducts);
  statusFilter.addEventListener("change", filterProducts);

  const inventoryTable = document.getElementById("inventory-table");
  const paginationControlsInventory = document.getElementById("pagination-controls-inventory");
  const searchInputInventory = document.getElementById("search-inventory");
  const matchCaseCheckbox = document.getElementById("match-case-checkbox");
  const startDateInput = document.getElementById("filter-start-date");
  const endDateInput = document.getElementById("filter-end-date");
  const stockActionFilter = document.getElementById("filter-stock-action");
  const itemsPerPageInventory = 10;
  let currentPageInventory = 1;
  let currentInventory = [];
  let currentSortKeyInventory = null;
  let currentSortOrderInventory = null;

  // Fetch inventory data from the API
  function fetchInventory() {
    fetch("/api/inventory")
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error fetching inventory: ${response.statusText}`);
        }
        return response.json();
      })
      .then(inventory => {
        currentInventory = inventory;
        updateInventoryTable(currentInventory); // Ensure inventory is updated
      })
      .catch(error => console.error("Error fetching inventory:", error));
  }

  // Update the inventory table with filtering and pagination
  function updateInventoryTable(inventory) {
    const searchQuery = searchInputInventory.value;
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
    const stockAction = stockActionFilter.value;
    const matchCase = matchCaseCheckbox.checked;

    // Filter inventory
    const filteredInventory = inventory.filter(item => {
      const itemDate = new Date(item.datetime);
      const matchesSearch = matchCase
        ? item.product_id === searchQuery
        : item.product_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStockAction =
        stockAction === "All Actions" ||
        (stockAction === "Stock-in" && item.remark.toLowerCase().includes("stock-in")) ||
        (stockAction === "Stock-out" && item.remark.toLowerCase().includes("stock-out"));
      const matchesDate =
        (!startDate || itemDate >= startDate) &&
        (!endDate || itemDate <= new Date(endDate.setHours(23, 59, 59, 999))); // Include the entire end date

      return matchesSearch && matchesStockAction && matchesDate;
    });

    // Sort inventory
    if (currentSortKeyInventory) {
      filteredInventory.sort((a, b) => {
        const aValue = a[currentSortKeyInventory];
        const bValue = b[currentSortKeyInventory];
        if (aValue < bValue) return currentSortOrderInventory === "asc" ? -1 : 1;
        if (aValue > bValue) return currentSortOrderInventory === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Paginate inventory
    const startIndex = (currentPageInventory - 1) * itemsPerPageInventory;
    const endIndex = startIndex + itemsPerPageInventory;
    const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

    // Clear the table and populate with paginated inventory
    inventoryTable.innerHTML = "";
    paginatedInventory.forEach(item => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${item.product_id}</td>
        <td>${item.quantity}</td>
        <td>${item.remark}</td>
        <td>${item.datetime}</td>
      `;
      inventoryTable.appendChild(row);
    });

    // Update pagination controls
    updatePaginationControlsInventory(filteredInventory.length);
  }

  // Update pagination controls
  function updatePaginationControlsInventory(totalItems) {
    paginationControlsInventory.innerHTML = "";

    const totalPages = Math.ceil(totalItems / itemsPerPageInventory);

    // Previous button
    if (currentPageInventory > 1) {
      const prevButton = document.createElement("button");
      prevButton.className = "btn btn-sm btn-outline-primary me-2";
      prevButton.textContent = "Previous";
      prevButton.addEventListener("click", () => {
        currentPageInventory--;
        updateInventoryTable(currentInventory);
      });
      paginationControlsInventory.appendChild(prevButton);
    }

    // Page input
    const pageInput = document.createElement("input");
    pageInput.type = "number";
    pageInput.className = "form-control form-control-sm me-2";
    pageInput.style.width = "60px";
    pageInput.value = currentPageInventory;
    pageInput.min = 1;
    pageInput.max = totalPages;
    pageInput.addEventListener("change", () => {
      const page = parseInt(pageInput.value, 10);
      if (page >= 1 && page <= totalPages) {
        currentPageInventory = page;
        updateInventoryTable(currentInventory);
      } else {
        pageInput.value = currentPageInventory;
      }
    });
    paginationControlsInventory.appendChild(pageInput);

    // Total pages text
    const totalPagesText = document.createElement("span");
    totalPagesText.className = "me-2";
    totalPagesText.textContent = `of ${totalPages}`;
    paginationControlsInventory.appendChild(totalPagesText);

    // Next button
    if (currentPageInventory < totalPages) {
      const nextButton = document.createElement("button");
      nextButton.className = "btn btn-sm btn-outline-primary";
      nextButton.textContent = "Next";
      nextButton.addEventListener("click", () => {
        currentPageInventory++;
        updateInventoryTable(currentInventory);
      });
      paginationControlsInventory.appendChild(nextButton);
    }
  }

  // Attach event listeners for filters and sorting
  searchInputInventory.addEventListener("input", () => updateInventoryTable(currentInventory));
  matchCaseCheckbox.addEventListener("change", () => updateInventoryTable(currentInventory));
  startDateInput.addEventListener("change", () => updateInventoryTable(currentInventory));
  endDateInput.addEventListener("change", () => updateInventoryTable(currentInventory));
  stockActionFilter.addEventListener("change", () => updateInventoryTable(currentInventory));

  document.querySelectorAll("[data-sort-inventory]").forEach(button => {
    button.addEventListener("click", () => {
      const sortButtons = document.querySelectorAll("[data-sort-inventory]");
      const key = button.getAttribute("data-sort-inventory");
      const ascending = button.getAttribute("data-order") === "asc";
      currentSortKeyInventory = key;
      currentSortOrderInventory = ascending ? "asc" : "desc";
      button.setAttribute("data-order", ascending ? "desc" : "asc");
      currentPageInventory = 1; // Reset to the first page after sorting
      updateInventoryTable(currentInventory);
      updateSortIndicators(sortButtons, currentSortKeyInventory, currentSortOrderInventory);
    });
  });

  // Attach sorting event listeners for inventory
  function attachSortingListenersInventory() {
    const sortButtons = document.querySelectorAll("[data-sort-inventory]");
    sortButtons.forEach(button => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-sort-inventory");
        const ascending = button.getAttribute("data-order") === "asc";
        currentSortKeyInventory = key;
        currentSortOrderInventory = ascending ? "asc" : "desc";
        button.setAttribute("data-order", ascending ? "desc" : "asc");
        currentPageInventory = 1; // Reset to the first page after sorting
        updateInventoryTable(currentInventory);

        // Pass the correct sort buttons to updateSortIndicators
        updateSortIndicators(sortButtons, currentSortKeyInventory, currentSortOrderInventory);
      });
    });
  }

  // Ensure attachSortingListenersInventory is called
  attachSortingListenersInventory();

  // Initial fetch
  fetchInventory();

});
