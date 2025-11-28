// Cart functionality with localStorage
let cart = JSON.parse(localStorage.getItem('gameverse_cart')) || [];
let allProducts = []; // Store all products for filtering

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    
    // If on checkout page, render cart
    if (window.location.pathname.includes('checkout.html')) {
        renderCart();
        updateOrderSummary();
    }
    
    // If on games page, setup filtering
    if (window.location.pathname.includes('games.html')) {
        setupFiltering();
    }
    
    // Add to cart buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const product = e.target.dataset.product;
            const price = parseFloat(e.target.dataset.price);
            const image = e.target.closest('.product-card').querySelector('.product-image').src;
            const category = e.target.closest('.product-card').querySelector('.product-category').textContent;
            
            addToCart({ product, price, image, category });
            
            // Visual feedback
            e.target.textContent = '✓';
            e.target.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            setTimeout(() => {
                e.target.textContent = '+';
                e.target.style.background = 'linear-gradient(135deg, var(--accent-green), #3b82f6)';
            }, 1000);
        });
    });
    
    // Delivery option selection
    const deliveryOptions = document.querySelectorAll('.delivery-option');
    deliveryOptions.forEach(option => {
        option.addEventListener('click', () => {
            deliveryOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
            updateShipping(radio.value);
        });
    });
});

// Add item to cart
function addToCart(item) {
    const existingItem = cart.find(i => i.product === item.product);
    
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    
    saveCart();
    updateCartCount();
}

// Remove item from cart
function removeFromCart(productName) {
    cart = cart.filter(item => item.product !== productName);
    saveCart();
    updateCartCount();
    renderCart();
    updateOrderSummary();
}

// Update item quantity
function updateQuantity(productName, change) {
    const item = cart.find(i => i.product === productName);
    if (item) {
        item.quantity = Math.max(1, (item.quantity || 1) + change);
        saveCart();
        renderCart();
        updateOrderSummary();
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('gameverse_cart', JSON.stringify(cart));
}

// Update cart count badge
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const badges = document.querySelectorAll('#navCartCount');
    badges.forEach(badge => {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

// Render cart items
function renderCart() {
    const cartList = document.getElementById('cartList');
    const sidebarCartItems = document.getElementById('sidebarCartItems');
    const emptyCart = document.getElementById('emptyCart');
    
    if (!cartList) return;
    
    if (cart.length === 0) {
        cartList.style.display = 'none';
        emptyCart.style.display = 'block';
        if (sidebarCartItems) sidebarCartItems.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No items in cart</p>';
        return;
    }
    
    cartList.style.display = 'block';
    emptyCart.style.display = 'none';
    
    // Render full cart list
    cartList.innerHTML = cart.map(item => `
        <div class="cart-list-item">
            <img src="${item.image}" alt="${item.product}">
            <div class="cart-list-item-info">
                <h4>${item.product}</h4>
                <p>${item.category}</p>
                <p class="item-price">${item.price.toFixed(2)}</p>
            </div>
            <div class="quantity-controls">
                <button onclick="updateQuantity(\`${item.product}\`, -1)">-</button>
                <span>${item.quantity || 1}</span>
                <button onclick="updateQuantity(\`${item.product}\`, 1)">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromCart(\`${item.product}\`)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');
    
    // Render sidebar summary
    if (sidebarCartItems) {
        sidebarCartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.product}">
                <div class="cart-item-info">
                    <h4>${item.product}</h4>
                    <p>${item.category}</p>
                    <p class="item-price">${item.price.toFixed(2)}</p>
                </div>
                <span class="item-quantity">x${item.quantity || 1}</span>
            </div>
        `).join('');
    }
}

// Update order summary
function updateOrderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const tax = subtotal * 0.09; // 9% tax
    const shippingCost = parseFloat(document.querySelector('input[name="delivery"]:checked')?.value === 'express' ? 4.99 : document.querySelector('input[name="delivery"]:checked')?.value === 'overnight' ? 9.99 : 0) || 0;
    const total = subtotal + tax + shippingCost;
    
    // Update all summary elements
    document.querySelectorAll('#subtotal, #summarySubtotal').forEach(el => {
        el.textContent = '$' + subtotal.toFixed(2);
    });
    
    document.querySelectorAll('#tax, #summaryTax').forEach(el => {
        el.textContent = '$' + tax.toFixed(2);
    });
    
    document.querySelectorAll('#total, #summaryTotal').forEach(el => {
        el.textContent = '$' + total.toFixed(2);
    });
}

// Update shipping cost
function updateShipping(deliveryType) {
    const shippingElements = document.querySelectorAll('#shipping, #summaryShipping');
    let shippingCost = 0;
    
    switch(deliveryType) {
        case 'standard':
            shippingCost = 0;
            shippingElements.forEach(el => {
                el.textContent = 'FREE';
                el.classList.add('free-text');
            });
            break;
        case 'express':
            shippingCost = 4.99;
            shippingElements.forEach(el => {
                el.textContent = '$4.99';
                el.classList.remove('free-text');
            });
            break;
        case 'overnight':
            shippingCost = 9.99;
            shippingElements.forEach(el => {
                el.textContent = '$9.99';
                el.classList.remove('free-text');
            });
            break;
    }
    
    updateOrderSummary();
}

// Continue to delivery
function continueToDelivery() {
    if (cart.length === 0) {
        alert('Your cart is empty! Add some items first.');
        return;
    }
    
    document.getElementById('cartSection').style.display = 'none';
    document.getElementById('deliverySection').style.display = 'block';
    
    // Update steps
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step1').classList.add('completed');
    document.getElementById('step1').querySelector('.step-number').textContent = '✓';
    document.getElementById('step2').classList.add('active');
    
    // Update button
    document.getElementById('continueBtn').textContent = 'Continue to Payment';
    document.getElementById('continueBtn').onclick = continueToPayment;
    
    window.scrollTo(0, 0);
}

// Continue to payment
function continueToPayment() {
    // Validate form fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'zip', 'country'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            field.style.borderColor = 'var(--border-color)';
        }
    });
    
    if (!isValid) {
        alert('Please fill in all required fields');
        return;
    }
    
    document.getElementById('deliverySection').style.display = 'none';
    document.getElementById('paymentSection').style.display = 'block';
    
    // Update steps
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step2').classList.add('completed');
    document.getElementById('step2').querySelector('.step-number').textContent = '✓';
    document.getElementById('step3').classList.add('active');
    
    // Hide continue button in sidebar
    document.getElementById('continueBtn').style.display = 'none';
    
    window.scrollTo(0, 0);
}

// Go back to delivery
function goToDelivery() {
    document.getElementById('paymentSection').style.display = 'none';
    document.getElementById('deliverySection').style.display = 'block';
    
    // Update steps
    document.getElementById('step3').classList.remove('active');
    document.getElementById('step2').classList.remove('completed');
    document.getElementById('step2').classList.add('active');
    document.getElementById('step2').querySelector('.step-number').textContent = '2';
    
    // Show continue button
    document.getElementById('continueBtn').style.display = 'block';
    
    window.scrollTo(0, 0);
}

// Complete purchase
function completePurchase() {
    // Clear cart
    cart = [];
    saveCart();
    updateCartCount();
    
    // Show success modal
    document.getElementById('successModal').style.display = 'flex';
}

// Smooth scroll for CTA buttons
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', (e) => {
        if (button.textContent.includes('Explore')) {
            window.location.href = 'games.html';
        } else if (button.textContent.includes('Sign Up')) {
            window.location.href = 'signup.html';
        }
    });
});

// Filtering functionality for games page
function setupFiltering() {
    // Store all products initially
    const productCards = document.querySelectorAll('.product-card');
    allProducts = Array.from(productCards).map(card => ({
        element: card,
        title: card.querySelector('.product-title').textContent.toLowerCase(),
        category: card.querySelector('.product-category').textContent.toLowerCase(),
        // FIX: Correctly remove the '$' symbol before parsing the price.
        price: parseFloat(card.querySelector('.product-price').textContent.replace('$', ''))
    }));
    
    // Get filter elements
    const productTypeFilter = document.querySelector('.filter-select:nth-child(2)');
    const priceRangeFilter = document.querySelector('.filter-select:nth-child(3)');
    const sortFilter = document.querySelector('.filter-select:nth-child(4)');
    
    // Add event listeners
    if (productTypeFilter) {
        productTypeFilter.addEventListener('change', applyFilters);
    }
    if (priceRangeFilter) {
        priceRangeFilter.addEventListener('change', applyFilters);
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', applyFilters);
    }
}

function applyFilters() {
    const productTypeFilter = document.querySelector('.filter-select:nth-child(2)');
    const priceRangeFilter = document.querySelector('.filter-select:nth-child(3)');
    const sortFilter = document.querySelector('.filter-select:nth-child(4)');
    
    const productType = productTypeFilter?.value || 'All Products';
    const priceRange = priceRangeFilter?.value || 'Price Range';
    const sortBy = sortFilter?.value || 'Sort By: Featured';
    
    // Filter products
    let filteredProducts = [...allProducts];
    
    // Filter by product type
    if (productType === 'Games') {
        filteredProducts = filteredProducts.filter(p => 
            !p.category.includes('controller') && 
            !p.category.includes('keyboard') && 
            !p.category.includes('headset')
        );
    } else if (productType === 'Accessories') {
        filteredProducts = filteredProducts.filter(p => 
            p.category.includes('controller') || 
            p.category.includes('keyboard') || 
            p.category.includes('headset')
        );
    }
    
    // Filter by price range
    if (priceRange === 'Under $50') {
        filteredProducts = filteredProducts.filter(p => p.price < 50);
    } else if (priceRange === '$50 - $100') {
        filteredProducts = filteredProducts.filter(p => p.price >= 50 && p.price <= 100);
    } else if (priceRange === 'Over $100') {
        filteredProducts = filteredProducts.filter(p => p.price > 100);
    }
    
    // Sort products
    if (sortBy === 'Price: Low to High') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'Price: High to Low') {
        filteredProducts.sort((a, b) => b.price - a.price);
    }
    
    // Hide all products first
    allProducts.forEach(p => p.element.style.display = 'none');
    
    // Show filtered products
    const grid = document.querySelector('.products-grid');
    if (grid) {
        // Clear and re-append in sorted order
        filteredProducts.forEach(p => {
            p.element.style.display = 'block';
            grid.appendChild(p.element);
        });
    }
}