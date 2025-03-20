import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the virtual environment's site-packages directory to the Python path
venv_path = os.path.join(os.path.dirname(__file__), 'venv', 'Lib', 'site-packages')
sys.path.append(venv_path)

from flask import Flask, render_template, jsonify, request, session
import boto3
import requests

app = Flask(__name__, static_folder='static')
app.secret_key = 'supersecretkey'

dynamodb = boto3.resource('dynamodb')
padeliver_table_name = os.getenv('PADELIVER_PRODUCTS_TABLE')

if not padeliver_table_name:
    raise ValueError("PADELIVER_PRODUCTS_TABLE environment variable is not set")

padeliver_table = dynamodb.Table(padeliver_table_name)

API_BASE_URL = os.getenv('API_BASE_URL')

if not API_BASE_URL:
    raise ValueError("API_BASE_URL environment variable is not set")

@app.route('/')
def hello_world():
    """Render the index page."""
    return render_template('index.html')

@app.route('/restaurant.html')
def restaurant_page():
    """Render the restaurant page."""
    return render_template('restaurant.html')

@app.route('/signin.html', methods=['GET', 'POST'])
def signin():
    """Render the sign-in page or handle sign-in logic."""
    if request.method == 'POST':
        username = request.json.get('username', '').lower()

        # Validate username
        if not username:
            return jsonify({'error': 'Username is required.'}), 400
        if not username.isalnum():
            return jsonify({'error': 'Invalid username. Only lowercase letters and numbers are allowed.'}), 400

        # Check if username is "admin"
        if username == 'admin':
            key_code = request.json.get('key_code', '')
            if not key_code:
                return jsonify({'error': 'Key code is required for admin.'}), 400
            if key_code != 'hello':
                return jsonify({'error': 'Invalid key code. Access denied.'}), 403
            session['user_id'] = username
            return jsonify({'redirect': '/dashboard'}), 200

        # Store username in session and redirect other users to the index page
        session['user_id'] = username
        return jsonify({'redirect': '/'}), 200

    return render_template('signin.html')

@app.route('/dashboard')
def dashboard():
    """Render the admin dashboard."""
    if 'user_id' not in session or session['user_id'] != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403
    return render_template('dashboard.html')

@app.route('/api/products')
def get_products():
    try:
        # Use the external API URL to fetch products
        response = requests.get(f"{API_BASE_URL}/api/padeliver-products-with-stock")
        if response.status_code == 200:
            products = response.json()
            return jsonify(products), 200
        else:
            return jsonify({'error': 'Failed to fetch products'}), response.status_code
    except Exception as e:
        print(f"Error fetching products: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/cart/<user_id>', methods=['GET', 'POST'])
def cart(user_id):
    if request.method == 'POST':
        product = request.json
        response = requests.post(f"{API_BASE_URL}/api/cart/{user_id}", json=product)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to add product to cart'}), response.status_code
    else:
        response = requests.get(f"{API_BASE_URL}/api/cart/{user_id}")
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to fetch cart'}), response.status_code

@app.route('/add_to_cart', methods=['POST'])
def add_to_cart():
    try:
        user_id = request.json.get('user_id')
        product = request.json.get('product')
        if not user_id or not product:
            return jsonify({'error': 'Missing user_id or product in request'}), 400

        print(f"Adding to cart: user_id={user_id}, product={product}")

        response = requests.post(f"{API_BASE_URL}/api/cart/{user_id}", json=product)
        if response.status_code == 200:
            cart = response.json()
            print(f"Successfully added to cart: {cart}")
            return jsonify(cart)
        else:
            print(f"Error in add_to_cart: {response.status_code} - {response.text}")
            return jsonify({'error': f"Failed to add product to cart: {response.text}"}), response.status_code
    except Exception as e:
        print(f"Error in add_to_cart: {e}")
        return jsonify({'error': f"Internal server error: {str(e)}"}), 500

@app.route('/get_cart/<user_id>', methods=['GET'])
def get_cart(user_id):
    try:
        response = requests.get(f"{API_BASE_URL}/api/cart/{user_id}")
        if response.status_code == 200:
            cart = response.json()
            return jsonify(cart)
        else:
            print(f"Error in get_cart: {response.status_code} - {response.text}")
            return jsonify({'error': 'Failed to fetch cart'}), response.status_code
    except Exception as e:
        print(f"Error in get_cart: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/product-names', methods=['GET'])
def get_product_names():
    try:
        response = padeliver_table.scan()
        products = response.get('Items', [])
        product_names = [{"id": product["product_id"], "name": product["item"]} for product in products]
        return jsonify(product_names)
    except Exception as e:
        print(f"Error fetching product names: {e}")
        return jsonify([])

@app.route('/logout', methods=['GET'])
def logout():
    """Clear the session and redirect to the sign-in page."""
    session.clear()  # Clear the session
    return jsonify({"message": "Logged out successfully", "redirect": "/signin.html"}), 200

@app.route('/api/cart/<user_id>/checkout', methods=['POST'])
def checkout(user_id):
    """Handle the checkout process for a user."""
    try:
        # Send a POST request to the checkout endpoint
        response = requests.post(f"{API_BASE_URL}/api/cart/{user_id}/checkout")
        if response.status_code == 200:
            checkout_data = response.json()
            print(f"Checkout successful for user {user_id}: {checkout_data}")
            return jsonify(checkout_data), 200
        else:
            print(f"Checkout failed for user {user_id}: {response.status_code} - {response.text}")
            return jsonify({'error': 'Failed to process checkout'}), response.status_code
    except Exception as e:
        print(f"Error during checkout: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/dashboard/padeliver-products-with-stock', methods=['GET'])
def get_low_stock_products():
    """Fetch low stock products from the external API."""
    try:
        # External API URL
        api_url = f"{API_BASE_URL}/api/padeliver-products-with-stock"
        
        # Make the GET request to the external API
        response = requests.get(api_url)
        if response.status_code == 200:
            products = response.json()
            return jsonify(products), 200
        else:
            return jsonify({'error': 'Failed to fetch products'}), response.status_code
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/padeliver-product', methods=['POST'])
def add_padeliver_product():
    """Handle adding a new Pa-deliver product."""
    try:
        product_data = request.json
        if not product_data:
            return jsonify({'error': 'Missing product data'}), 400

        # Send the product data to the external API
        response = requests.post(f"{API_BASE_URL}/api/padeliver-product", json=product_data)
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({'error': 'Failed to add product', 'details': response.text}), response.status_code
    except Exception as e:
        print(f"Error in add_padeliver_product: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/update-product', methods=['POST'])
def update_product():
    """Handle updating a product."""
    try:
        product_data = request.json
        if not product_data:
            return jsonify({'error': 'Missing product data'}), 400

        # Validate required fields
        if 'product_id' not in product_data or not product_data['product_id']:
            return jsonify({'error': 'Missing or invalid product_id'}), 400

        # Prepare the payload for the external API
        payload = {'old_product_id': product_data['product_id']}
        if 'new_product_id' in product_data and product_data['new_product_id']:
            payload['new_product_id'] = product_data['new_product_id']
        if 'item' in product_data and product_data['item']:
            payload['item'] = product_data['item']
        if 'category' in product_data and product_data['category']:
            payload['category'] = product_data['category']
        if 'price' in product_data:
            payload['price'] = product_data['price']
        if 'brand' in product_data and product_data['brand']:
            payload['brand'] = product_data['brand']
        if 'description' in product_data and product_data['description']:
            payload['description'] = product_data['description']
        
        # Log the payload for debugging purposes
        print(f"Payload sent to external API: {payload}")

        # Send the product data to the external API
        response = requests.put(f"{API_BASE_URL}/api/padeliver-product", json=payload)
        if response.status_code == 200:
            print(f"Product updated successfully: {response.json()}")
            return jsonify({'success': True, 'message': 'Product updated successfully'}), 200
        else:
            print(f"Failed to update product: {response.status_code} - {response.text}")
            return jsonify({'error': 'Failed to update product', 'details': response.text}), response.status_code
    except Exception as e:
        print(f"Error in update_product: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/delete-product/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Handle deleting a product."""
    try:
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400

        # Send the delete request to the external API
        response = requests.delete(f"{API_BASE_URL}/api/padeliver-product", json={"product_id": product_id})
        if response.status_code == 200:
            response_data = response.json()
            return jsonify({'success': True, 'message': response_data.get('message', 'Product deleted successfully')}), 200
        else:
            response_data = response.json()
            return jsonify({'error': response_data.get('message', 'Failed to delete product')}), response.status_code
    except Exception as e:
        print(f"Error in delete_product: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/add-inventory', methods=['POST'])
def add_inventory():
    """Handle adding or removing inventory for a product."""
    try:
        inventory_data = request.json
        if not inventory_data:
            return jsonify({'error': 'Missing inventory data'}), 400

        # Validate required fields
        if 'product_id' not in inventory_data or not inventory_data['product_id']:
            return jsonify({'error': 'Missing or invalid product_id'}), 400
        if 'quantity' not in inventory_data or not isinstance(inventory_data['quantity'], int):
            return jsonify({'error': 'Invalid quantity. Must be an integer.'}), 400
        if inventory_data['quantity'] == 0:
            return jsonify({'error': 'Quantity cannot be zero.'}), 400
        if 'remark' not in inventory_data or not inventory_data['remark']:
            return jsonify({'error': 'Remark is required.'}), 400

        # Log the payload for debugging purposes
        print(f"Inventory update payload: {inventory_data}")

        # Send the inventory data to the external API
        response = requests.post(f"{API_BASE_URL}/api/padeliver-inventory", json=inventory_data)
        if response.status_code == 200:
            return jsonify({'success': True, 'message': 'Inventory updated successfully'}), 200
        else:
            return jsonify({'error': 'Failed to update inventory', 'details': response.text}), response.status_code
    except Exception as e:
        print(f"Error in add_inventory: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Fetch inventory data from the external API."""
    try:
        # External API URL
        api_url = f"{API_BASE_URL}/api/inventory"
        
        # Make the GET request to the external API
        response = requests.get(api_url)
        if response.status_code == 200:
            inventory = response.json()
            return jsonify(inventory), 200
        else:
            return jsonify({'error': 'Failed to fetch inventory'}), response.status_code
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)