document.addEventListener("DOMContentLoaded", function () {
  const inventoryTable = document.getElementById("inventory-table");
  const paginationControls = document.getElementById("pagination-controls-inventory");
  const searchInput = document.getElementById("search-inventory");
  const categoryFilter = document.getElementById("filter-inventory-category");
  const statusFilter = document.getElementById("filter-inventory-status");
  const itemsPerPage = 10;
  let currentPage = 1;
  let currentInventory = [];
  let currentSortKey = null;
  let currentSortOrder = null;

  // Fetch inventory data from the API
  function fetchInventory() {
    fetch(`${BASE_URL}/api/inventory`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error fetching inventory: ${response.statusText}`);
        }
        return response.json();
      })
      .then(inventory => {
        currentInventory = inventory;
        populateCategoryFilter(inventory);
        updateInventoryTable(inventory);
      })
      .catch(error => console.error("Error fetching inventory:", error));
  }

  // Populate category filter dropdown
  function populateCategoryFilter(inventory) {
    const categories = ["All Categories", ...new Set(inventory.map(item => item.category))];
    categoryFilter.innerHTML = ""; // Clear existing options

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  // Update the inventory table with sorting, filtering, and pagination
  function updateInventoryTable(inventory) {
    const searchQuery = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedStatus = statusFilter.value;

    // Filter inventory
    const filteredInventory = inventory.filter(item => {
      const matchesSearch = item.item.toLowerCase().includes(searchQuery);
      const matchesCategory = selectedCategory === "All Categories" || item.category === selectedCategory;
      const matchesStatus =
        selectedStatus === "All Status" ||
        (selectedStatus === "In Stock" && item.stock > 0) ||
        (selectedStatus === "Out of Stock" && item.stock === 0);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort inventory
    if (currentSortKey) {
      filteredInventory.sort((a, b) => {
        const aValue = currentSortKey === "price" ? parseFloat(a[currentSortKey]) : a[currentSortKey];
        const bValue = currentSortKey === "price" ? parseFloat(b[currentSortKey]) : b[currentSortKey];
        if (aValue < bValue) return currentSortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return currentSortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Paginate inventory
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

    // Clear the table and populate with paginated inventory
    inventoryTable.innerHTML = "";
    paginatedInventory.forEach(item => {
      const row = document.createElement("tr");
      const stockBadgeClass = item.stock < 10 ? "bg-danger" : item.stock < 30 ? "bg-warning" : "bg-success";

      row.innerHTML = `
        <td>${item.item}</td>
        <td>${item.category}</td>
        <td>Php ${item.price.toLocaleString()}</td>
        <td>
          <span class="badge ${stockBadgeClass}">${item.stock.toLocaleString()} left</span>
        </td>
        <td>${item.stock === 0 ? "Out of Stock" : "In Stock"}</td>
      `;
      inventoryTable.appendChild(row);
    });

    // Update pagination controls
    updatePaginationControls(filteredInventory.length);
  }

  // Update pagination controls
  function updatePaginationControls(totalItems) {
    paginationControls.innerHTML = "";

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Previous button
    if (currentPage > 1) {
      const prevButton = document.createElement("button");
      prevButton.className = "btn btn-sm btn-outline-primary me-2";
      prevButton.textContent = "Previous";
      prevButton.addEventListener("click", () => {
        currentPage--;
        updateInventoryTable(currentInventory);
      });
      paginationControls.appendChild(prevButton);
    }

    // Page input
    const pageInput = document.createElement("input");
    pageInput.type = "number";
    pageInput.className = "form-control form-control-sm me-2";
    pageInput.style.width = "60px";
    pageInput.value = currentPage;
    pageInput.min = 1;
    pageInput.max = totalPages;
    pageInput.addEventListener("change", () => {
      const page = parseInt(pageInput.value, 10);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        updateInventoryTable(currentInventory);
      } else {
        pageInput.value = currentPage;
      }
    });
    paginationControls.appendChild(pageInput);

    // Total pages text
    const totalPagesText = document.createElement("span");
    totalPagesText.className = "me-2";
    totalPagesText.textContent = `of ${totalPages}`;
    paginationControls.appendChild(totalPagesText);

    // Next button
    if (currentPage < totalPages) {
      const nextButton = document.createElement("button");
      nextButton.className = "btn btn-sm btn-outline-primary";
      nextButton.textContent = "Next";
      nextButton.addEventListener("click", () => {
        currentPage++;
        updateInventoryTable(currentInventory);
      });
      paginationControls.appendChild(nextButton);
    }
  }

  // Attach event listeners for filters and sorting
  searchInput.addEventListener("input", () => updateInventoryTable(currentInventory));
  categoryFilter.addEventListener("change", () => updateInventoryTable(currentInventory));
  statusFilter.addEventListener("change", () => updateInventoryTable(currentInventory));

  document.querySelectorAll("[data-sort-inventory]").forEach(button => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-sort-inventory");
      const ascending = button.getAttribute("data-order") === "asc";
      currentSortKey = key;
      currentSortOrder = ascending ? "asc" : "desc";
      button.setAttribute("data-order", ascending ? "desc" : "asc");
      currentPage = 1; // Reset to the first page after sorting
      updateInventoryTable(currentInventory);
    });
  });

  // Initial fetch
  fetchInventory();
});
