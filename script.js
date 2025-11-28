// Cart functionality with localStorage
let cart = JSON.parse(localStorage.getItem('gameverse_cart')) || [];
let allProducts = []; // Store all products for filtering

// --- AUTHENTICATION LOGIC ---

function saveUsers(users) {
    localStorage.setItem('gameverse_users', JSON.stringify(users));
}

function getUsers() {
    return JSON.parse(localStorage.getItem('gameverse_users')) || [];
}

function getCurrentUser() {
    return localStorage.getItem('gameverse_currentUser');
}

function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password); // Password stored in plaintext for prototype
    
    if (user) {
        localStorage.setItem('gameverse_currentUser', user.email);
        return true;
    }
    return false;
}

function signupUser(email, password) {
    const users = getUsers();
    if (users.some(u => u.email === email)) {
        return { success: false, message: 'User with this email already exists.' };
    }
    
    users.push({ email, password });
    saveUsers(users);
    return { success: true, message: 'Sign up successful! Please log in.' };
}

function logoutUser() {
    localStorage.removeItem('gameverse_currentUser');
    window.location.href = 'index.html'; // Redirect to home after logout
}

// --- UTILITY UI FUNCTIONS (NEW) ---

/**
 * Displays a non-blocking toast notification.
 * @param {string} message The message to display.
 * @param {('success'|'error'|'info')} type The type of notification.
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.error('Toast container not found. Falling back to alert.');
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10); // Small delay for CSS transition to work

    // Hide and remove the toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 500); // Wait for transition
    }, 4000);
}

/**
 * Shows the custom logout confirmation modal.
 * @param {string} email The user email for display.
 */
function showLogoutModal(email) {
    const modal = document.getElementById('logoutModal');
    const messageEl = document.getElementById('logoutMessage');
    const confirmBtn = document.getElementById('logoutConfirmBtn');
    const cancelBtn = document.getElementById('logoutCancelBtn');

    if (!modal) {
         // Fallback to old confirm for this one case if modal is missing
         if (confirm(`Logged in as: ${email}. Do you want to log out?`)) {
             logoutUser();
         }
         return;
    }
    
    messageEl.textContent = `Are you sure you want to log out from ${email}?`;
    modal.classList.add('active');

    const handleConfirm = () => {
        modal.classList.remove('active');
        logoutUser();
        // Remove listeners to prevent memory leaks/multiple calls
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    const handleCancel = () => {
        modal.classList.remove('active');
        // Remove listeners
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    // Remove any existing listeners before adding new ones
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

// Update the user status check to use the new modal
function checkUserStatus() {
    const currentUser = getCurrentUser();
    const profileButton = document.querySelector('.profile-btn');
    const profileIcon = profileButton?.querySelector('svg');
    
    if (profileButton) {
        if (currentUser) {
            // User is logged in: Change button action to show custom modal
            profileButton.onclick = () => {
                showLogoutModal(currentUser);
            };
            
            // Visual cue: Change icon color to green
            if (profileIcon) {
                // Ensure there is a CSS variable for accent-green defined in styles.css
                profileIcon.style.stroke = '#2dd4bf'; 
            }
        } else {
            // User is logged out: Redirect to signup.html
            profileButton.onclick = () => {
                window.location.href = 'signup.html';
            };
            if (profileIcon) {
                profileIcon.style.stroke = 'currentColor'; // Default color
            }
        }
    }
}


// --- PRODUCT DISPLAY, FILTERING, AND SEARCH LOGIC ---

// New helper function to display products
function displayProducts(productsToDisplay) {
    // Hide all products first
    allProducts.forEach(p => p.element.style.display = 'none');
    
    // Show filtered/searched products
    const grid = document.querySelector('.products-grid');
    if (grid) {
        // Clear and re-append in sorted order (important for sorting)
        productsToDisplay.forEach(p => {
            p.element.style.display = 'block';
            grid.appendChild(p.element);
        });
    }
}

// Helper function to handle sorting/filtering logic
function filterAndSortProducts(productsToProcess, productType, priceRange, sortBy) {
    let filteredProducts = [...productsToProcess];

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

    return filteredProducts;
}


// Master function to update product display based on filters AND search
function updateProductDisplay() {
    const productTypeFilter = document.querySelector('.filter-select:nth-child(2)');
    const priceRangeFilter = document.querySelector('.filter-select:nth-child(3)');
    const sortFilter = document.querySelector('.filter-select:nth-child(4)');
    const searchInput = document.getElementById('searchInput');

    const productType = productTypeFilter?.value || 'All Products';
    const priceRange = priceRangeFilter?.value || 'Price Range';
    const sortBy = sortFilter?.value || 'Sort By: Featured';
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';

    let productsToProcess = [...allProducts];

    // 1. Apply Search Filter first (if applicable)
    if (searchTerm) {
        productsToProcess = productsToProcess.filter(p => 
            p.title.includes(searchTerm) || 
            p.category.includes(searchTerm)
        );
    }

    // 2. Apply Dropdown Filters and Sort
    let finalProducts = filterAndSortProducts(productsToProcess, productType, priceRange, sortBy);
    
    // 3. Display the final list
    displayProducts(finalProducts);
}

// Filtering functionality setup for games page
function setupFiltering() {
    // Store all products initially
    const productCards = document.querySelectorAll('.product-card');
    allProducts = Array.from(productCards).map(card => ({
        element: card,
        title: card.querySelector('.product-title').textContent.toLowerCase(),
        category: card.querySelector('.product-category').textContent.toLowerCase(),
        price: parseFloat(card.querySelector('.product-price').textContent.replace('$', ''))
    }));
    
    // Get filter elements
    const productTypeFilter = document.querySelector('.filter-select:nth-child(2)');
    const priceRangeFilter = document.querySelector('.filter-select:nth-child(3)');
    const sortFilter = document.querySelector('.filter-select:nth-child(4)');
    const searchInput = document.getElementById('searchInput');

    // Add event listeners for dropdowns
    if (productTypeFilter) {
        productTypeFilter.addEventListener('change', updateProductDisplay);
    }
    if (priceRangeFilter) {
        priceRangeFilter.addEventListener('change', updateProductDisplay);
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', updateProductDisplay);
    }
    
    // Add event listener for search input
    if (searchInput) {
        searchInput.addEventListener('input', updateProductDisplay);
    }
}


// --- DOM MANIPULATION AND EVENT LISTENERS ---

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    checkUserStatus(); // Check and update user status on all pages
    
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

    // --- AUTH FORM SUBMISSIONS ---

    // Signup form logic
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value.trim();
            
            if (!email || !password) {
                showToast('Please enter both email and password.', 'error');
                return;
            }

            const result = signupUser(email, password);
            if (result.success) {
                showToast(result.message, 'success');
                window.location.href = 'login.html';
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // Login form logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (!email || !password) {
                showToast('Please enter both email and password.', 'error');
                return;
            }

            if (loginUser(email, password)) {
                showToast('Login successful! Welcome back.', 'success');
                window.location.href = 'index.html'; // Redirect to home on successful login
            } else {
                showToast('Login failed. Check your email and password.', 'error');
            }
        });
    }
    
    // --- SEARCH TOGGLE & INPUT LOGIC ---
    const searchToggle = document.getElementById('searchToggle');
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('searchInput');

    if (searchToggle && searchContainer && searchInput) {
        searchToggle.addEventListener('click', () => {
            searchContainer.classList.toggle('active');
            
            if (searchContainer.classList.contains('active')) {
                searchInput.focus();
            } else {
                // Clear search and re-run display logic when closing
                searchInput.value = '';
                // Only run updateProductDisplay if we are on a page that supports filtering (games.html)
                if (window.location.pathname.includes('games.html')) {
                    updateProductDisplay(); 
                }
            }
        });

        // Handle pressing ESC key to close search bar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchContainer.classList.contains('active')) {
                searchContainer.classList.remove('active');
                searchInput.value = '';
                // Only run updateProductDisplay if on games.html
                if (window.location.pathname.includes('games.html')) {
                    updateProductDisplay(); 
                }
            }
        });
    }
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
    showToast(`${item.product} added to cart!`, 'success');
}

// Remove item from cart
function removeFromCart(productName) {
    cart = cart.filter(item => item.product !== productName);
    saveCart();
    updateCartCount();
    renderCart();
    updateOrderSummary();
    showToast(`${productName} removed from cart.`, 'info');
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

// Render cart items (function body remains the same)
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
                <p class="item-price">$${item.price.toFixed(2)}</p>
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
                    <p class="item-price">$${item.price.toFixed(2)}</p>
                </div>
                <span class="item-quantity">x${item.quantity || 1}</span>
            </div>
        `).join('');
    }
}

// Update order summary (function body remains the same)
function updateOrderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const tax = subtotal * 0.09; // 9% tax
    
    const selectedDeliveryRadio = document.querySelector('input[name="delivery"]:checked');
    let deliveryType = selectedDeliveryRadio ? selectedDeliveryRadio.value : 'standard';

    let shippingCost = 0;
    if (deliveryType === 'express') {
        shippingCost = 4.99;
    } else if (deliveryType === 'overnight') {
        shippingCost = 9.99;
    }

    const total = subtotal + tax + shippingCost;
    
    // Update all summary elements
    document.querySelectorAll('#subtotal, #summarySubtotal').forEach(el => {
        el.textContent = '$' + subtotal.toFixed(2);
    });
    
    document.querySelectorAll('#tax, #summaryTax').forEach(el => {
        el.textContent = '$' + tax.toFixed(2);
    });

    // Update shipping text based on cost
    const shippingElements = document.querySelectorAll('#shipping, #summaryShipping');
    shippingElements.forEach(el => {
        if (shippingCost === 0) {
            el.textContent = 'FREE';
            el.classList.add('free-text');
        } else {
            el.textContent = '$' + shippingCost.toFixed(2);
            el.classList.remove('free-text');
        }
    });
    
    document.querySelectorAll('#total, #summaryTotal').forEach(el => {
        el.textContent = '$' + total.toFixed(2);
    });
}

// Update shipping cost (function body remains the same)
function updateShipping(deliveryType) {
    const shippingElements = document.querySelectorAll('#shipping, #summaryShipping');
    
    let shippingCostText = 'FREE';
    let isFree = true;
    
    switch(deliveryType) {
        case 'standard':
            shippingCostText = 'FREE';
            isFree = true;
            break;
        case 'express':
            shippingCostText = '$4.99';
            isFree = false;
            break;
        case 'overnight':
            shippingCostText = '$9.99';
            isFree = false;
            break;
    }
    
    shippingElements.forEach(el => {
        el.textContent = shippingCostText;
        if (isFree) {
            el.classList.add('free-text');
        } else {
            el.classList.remove('free-text');
        }
    });
    
    updateOrderSummary(); // Recalculate total with new shipping cost
}

// Continue to delivery
function continueToDelivery() {
    if (cart.length === 0) {
        showToast('Your cart is empty! Add some items first.', 'info');
        return;
    }
    
    // Require login to continue checkout
    if (!getCurrentUser()) {
        showToast("You need to log in or sign up to continue checkout.", 'info');
        // Do not redirect, let the user click the profile/login link
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
        // Basic email validation for prototype
        if (fieldId === 'email' && !/\S+@\S+\.\S+/.test(field.value.trim())) {
            field.style.borderColor = '#ef4444';
            isValid = false;
        } else if (!field.value.trim()) {
            field.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            field.style.borderColor = 'var(--border-color)';
        }
    });
    
    if (!isValid) {
        showToast('Please fill in all required fields correctly', 'error');
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

// Go back to delivery (function body remains the same)
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
    // Simple payment form validation
    const cardNumber = document.querySelector('.payment-form input[placeholder="1234 5678 9012 3456"]').value;
    const expiryDate = document.querySelector('.payment-form input[placeholder="MM/YY"]').value;
    const cvv = document.querySelector('.payment-form input[placeholder="123"]').value;

    if (cardNumber.length < 19 || expiryDate.length < 5 || cvv.length < 3) {
        showToast('Please enter valid payment details.', 'error');
        return;
    }
    
    // Clear cart
    cart = [];
    saveCart();
    updateCartCount();
    
    // Show success modal
    document.getElementById('successModal').style.display = 'flex';
}

// Smooth scroll for CTA buttons (function body remains the same)
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', (e) => {
        if (button.textContent.includes('Explore')) {
            window.location.href = 'games.html';
        } else if (button.textContent.includes('Sign Up')) {
            window.location.href = 'signup.html';
        }
    });
});