document.addEventListener("DOMContentLoaded", async function() {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurant = urlParams.get('restaurant');
  document.getElementById('restaurant-name').textContent = `${restaurant} Menu`;

  // Fetch brand images
  const brandImages = await fetch("/api/brand-images")
    .then(response => response.json())
    .then(data => {
      const baseUrl = data.images[0]; // Base URL for brand images
      const images = data.images.slice(1); // List of brand image URLs
      const imageMap = {};
      images.forEach(image => {
        const brandName = image.split("/").pop().split(".")[0]; // Extract brand name from URL
        imageMap[brandName] = image;
      });
      return { baseUrl, imageMap };
    })
    .catch(error => {
      console.error("Failed to fetch brand images:", error);
      return { baseUrl: "", imageMap: {} };
    });

  fetch("/api/products")
    .then(response => response.json())
    .then(products => {
      const restaurantProducts = products.filter(product => product.brand === restaurant && product.stock > 0); // Filter out products with stock = 0
      const categories = ["All", ...new Set(restaurantProducts.map(product => product.category))];
      const categoryButtons = document.getElementById("category-buttons");
      let activeButton = null;

      categories.forEach(category => {
        const button = document.createElement("button");
        button.className = category === "All" ? "btn btn-primary category-item" : "btn btn-outline-secondary category-item";
        button.textContent = category;
        button.addEventListener("click", () => {
          displayMenu(category);
          if (activeButton) {
            activeButton.classList.remove("btn-primary");
            activeButton.classList.add("btn-outline-secondary");
          }
          button.classList.remove("btn-outline-secondary");
          button.classList.add("btn-primary");
          activeButton = button;
        });
        categoryButtons.appendChild(button);
        if (category === "All") {
          activeButton = button;
        }
      });

      displayMenu("All");

      function displayMenu(category) {
        const menu = document.getElementById("menu");
        menu.innerHTML = "";
        const filteredProducts = category === "All" ? restaurantProducts : restaurantProducts.filter(product => product.category === category);
        filteredProducts.forEach(product => {
          if (product.stock === 0) return; // Skip products with stock = 0
          const productImage = product.product_image_url || `../static/assets/${product.brand}.jpg`; // Use S3 image URL if available
          const productCard = `
        <div class="col-md-6 mb-4">
          <div class="card food-item h-100 d-flex flex-column" data-product-id="${product.product_id}" data-product-stock="${product.stock}">
            <div class="row g-0 flex-grow-1">
              <div class="col-4">
                <img src="${productImage}" class="img-fluid rounded-start" alt="${product.item}" style="width: 100%; height: auto;">
              </div>
              <div class="col-8 d-flex flex-column">
                <div class="card-body d-flex flex-column flex-grow-1">
                  <h5 class="card-title">${product.item}</h5>
                  <p class="card-text text-muted small flex-grow-1">${product.product_description}</p>
                  <p class="card-text small">Stock: ${product.stock}</p>
                  <div class="d-flex justify-content-between align-items-center mt-auto">
                    <span class="fw-bold">Php ${product.price}</span>
                    <button class="btn btn-sm btn-primary">Add</button> 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
          menu.insertAdjacentHTML("beforeend", productCard);
        });
      }

      // Featured Restaurants
      const featuredRestaurants = document.querySelector("#featured-restaurants .row");
      const restaurantDropdown = document.getElementById("restaurant-dropdown");
      const brands = [...new Set(products.map(product => product.brand))];
      brands.forEach(brand => {
        const brandProducts = products.filter(product => product.brand === brand && product.stock > 0); // Filter out products with stock = 0
        const categories = [...new Set(brandProducts.map(product => product.category))].slice(0, 3);
        const brandImage = brandImages.imageMap[brand] || `../static/assets/${brand}.jpg`; // Use fetched brand image or fallback
        const restaurantCard = `
          <div class="col-md-2 col-sm-4">
            <div class="card restaurant-card h-100 shadow-sm">
              <a href="/restaurant.html?restaurant=${brand}">
                <img src="${brandImage}" class="card-img-top" alt="${brand}" style="width: 100%; height: auto;">
              </a>
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h5 class="card-title mb-0">${brand}</h5>
                  <span class="badge bg-secondary">${brandProducts.length} items</span>
                </div>
                <p class="card-text text-muted small">${categories.join(' • ')}</p>
              </div>
            </div>
          </div>
        `;
        featuredRestaurants.insertAdjacentHTML("beforeend", restaurantCard);

        const dropdownItem = `
          <li><a class="dropdown-item" href="/restaurant.html?restaurant=${brand}">${brand}</a></li>
        `;
        restaurantDropdown.insertAdjacentHTML("beforeend", dropdownItem);
      });
    });
});
