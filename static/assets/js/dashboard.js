document.addEventListener("DOMContentLoaded", function () {
  const lowStockTable = document.getElementById("low-stock");
  const productsStockTable = document.getElementById("products-stock");
  const paginationControls = document.getElementById("pagination-controls");
  const categoryDropdowns = document.querySelectorAll("#productCategory, #editProductCategory");
  const storageKey = "allProducts";
  const itemsPerPage = 5;
  let currentPage = 1;
  let currentProducts = [];
  let currentSortKey = null;
  let currentSortOrder = null;

  // Fetch all products and save them in local storage
  function fetchAndStoreProducts() {
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

        // Save products to local storage
        localStorage.setItem(storageKey, JSON.stringify(products));
        updateLowStockProducts(products);
        updateAllProducts();
        fetchAndPopulateCategories(products); // Dynamically update categories
      })
      .catch((error) => console.error("Error fetching products:", error));
  }

  // Fetch and populate categories dynamically
  function fetchAndPopulateCategories(products) {
    if (!products || !Array.isArray(products)) {
      console.error("Invalid products array passed to fetchAndPopulateCategories");
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

  // Update the "Low Stock Products" section
  function updateLowStockProducts(products) {
    if (!lowStockTable) return;

    // Clear the current table content
    lowStockTable.innerHTML = "";

    // Filter products with stock below 30
    const lowStockProducts = products.filter((product) => product.stock < 30);

    // Populate the table with low stock products
    lowStockProducts.forEach((product) => {
      const row = document.createElement("tr");
      const stockBadgeClass = product.stock < 10 ? "bg-danger" : "bg-warning";
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
          <span class="status-indicator status-active"></span> Active
        </td>
        <td>
          <button class="btn btn-sm btn-primary">Update Stock</button>
        </td>
      `;
      lowStockTable.appendChild(row);
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
      const stockBadgeClass = product.stock < 10 ? "bg-danger" : product.stock < 30 ? "bg-warning" : "bg-success";
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
          <span class="status-indicator status-active"></span> Active
        </td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#editProductModal">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger">
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
    updateSortIndicators();
  }

  // Update sort indicators
  function updateSortIndicators() {
    const sortButtons = document.querySelectorAll("[data-sort]");
    sortButtons.forEach((button) => {
      const key = button.getAttribute("data-sort");
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

  // Load products from local storage and update the tables
  function loadProductsFromStorage() {
    const storedProducts = localStorage.getItem(storageKey);
    if (storedProducts) {
      const products = JSON.parse(storedProducts);
      currentProducts = products;
      updateLowStockProducts(products);
      updateAllProducts();
      fetchAndPopulateCategories(products);
    } else {
      fetchAndStoreProducts();
    }
  }

  // Initial load
  loadProductsFromStorage();
  attachSortingListeners();

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
          fetchAndStoreProducts();
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
  fetchAndPopulateCategories();

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
});
