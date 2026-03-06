// ========== النقطة 1: النظام الأساسي والمتغيرات العامة ==========
let products = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];

// ========== النقطة 2: تحميل المستخدمين من localStorage ==========
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { 
                id: 1, 
                name: 'azer', 
                email: 'azer@admin.com', 
                password: '123456', 
                role: 'admin',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}

loadUsers();

// ========== النقطة 3: دوال المساعدة والإشعارات ==========
function showAdvancedNotification(message, type = 'info', title = '') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const titles = {
        success: 'نجاح',
        error: 'خطأ',
        warning: 'تنبيه',
        info: 'معلومات'
    };
    
    toast.innerHTML = `
        <div class="toast-icon ${type}">
            <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : type === 'warning' ? 'fa-exclamation' : 'fa-info'}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    toggle.innerHTML = isDarkMode ? 
        '<i class="fas fa-moon"></i><span>ليلي</span>' : 
        '<i class="fas fa-sun"></i><span>نهاري</span>';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ========== النقطة 4: دوال التاريخ والوقت الصحيحة ==========
function getSimpleTimeAgo(dateString) {
    if (!dateString) return '';
    
    const now = new Date();
    const productDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - productDate) / 1000);
    
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
    }
    if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
    }
    if (diffInSeconds < 2592000) {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`;
    }
    if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
    }
    const years = Math.floor(diffInSeconds / 31536000);
    return `منذ ${years} ${years === 1 ? 'سنة' : 'سنوات'}`;
}

// ========== النقطة 5: دوال تقييم النجوم ==========
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star star filled"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt star half"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star star"></i>';
    }
    
    return starsHTML;
}

// ========== النقطة 6: دوال الفرز ==========
function sortProducts(productsArray) {
    switch(sortBy) {
        case 'newest':
            return [...productsArray].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        case 'price_low':
            return [...productsArray].sort((a, b) => a.price - b.price);
        case 'price_high':
            return [...productsArray].sort((a, b) => b.price - a.price);
        case 'rating':
            return [...productsArray].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        default:
            return productsArray;
    }
}

function changeSort(value) {
    sortBy = value;
    displayProducts();
}

// ========== النقطة 7: تحميل المنتجات ==========
function loadProducts() {
    const saved = localStorage.getItem('nardoo_products');
    if (saved) {
        products = JSON.parse(saved);
    } else {
        products = [
            { 
                id: 1, 
                name: "عرض رمضان - طقم بهارات كامل", 
                category: "promo", 
                price: 3500, 
                stock: 20, 
                rating: 5.0,
                images: ["https://via.placeholder.com/300/ff6b6b/ffffff?text=عرض+رمضان"],
                merchantId: null,
                soldCount: 0,
                createdAt: new Date().toISOString()
            }
        ];
        saveProducts();
    }
    displayProducts();
}

function saveProducts() {
    localStorage.setItem('nardoo_products', JSON.stringify(products));
}

function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => p.merchantId === currentUser.id);
    }
    else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px;">لا توجد منتجات</div>';
        return;
    }

    container.innerHTML = filtered.map(product => {
        const timeAgo = getSimpleTimeAgo(product.createdAt);
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">${product.price} دج</div>
                    <div class="product-actions">
                        <button class="add-to-cart" onclick="addToCart(${product.id})">أضف للسلة</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

// ========== النقطة 8: إدارة السلة ==========
function loadCart() {
    const saved = localStorage.getItem('nardoo_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartCounter();
}

function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cartCounter');
    if (counter) counter.textContent = count;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            productId,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    saveCart();
    updateCartCounter();
    showAdvancedNotification('تمت الإضافة إلى السلة', 'success');
}

// ========== النقطة 9: إدارة المستخدمين ==========
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        showAdvancedNotification(`مرحباً ${user.name}`, 'success');
        updateUIBasedOnRole();
    } else {
        showAdvancedNotification('بيانات الدخول غير صحيحة', 'error');
    }
}

function updateUIBasedOnRole() {
    if (currentUser?.role === 'admin') {
        document.getElementById('dashboardBtn').style.display = 'flex';
    }
}

// ========== النقطة 10: دوال التمرير ==========
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

function toggleQuickTopButton() {
    const btn = document.getElementById('quickTopBtn');
    if (btn) {
        btn.classList.toggle('show', window.scrollY > 300);
    }
}

// ========== النقطة 11: لوحة التحكم ==========
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        showAdvancedNotification('غير مصرح', 'error');
        return;
    }
    document.getElementById('dashboardSection').style.display = 'block';
    showDashboardProducts(document.getElementById('dashboardContent'));
}

function switchDashboardTab(tab) {
    if (tab === 'products') {
        showDashboardProducts(document.getElementById('dashboardContent'));
    }
}

function showDashboardProducts(container) {
    container.innerHTML = `
        <h3>إدارة المنتجات</h3>
        <button class="btn-gold" onclick="showAddProductModal()">إضافة منتج</button>
        <div style="overflow-x: auto;">
            <table>
                <thead><tr><th>المنتج</th><th>السعر</th><th>الكمية</th></tr></thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.price} دج</td>
                            <td>${p.stock}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showAddProductModal() {
    document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productModal').style.display = 'flex';
}

function saveProduct() {
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);

    if (!name || !category || !price || !stock) {
        showAdvancedNotification('املأ جميع الحقول', 'error');
        return;
    }

    const newProduct = {
        id: products.length + 1,
        name,
        category,
        price,
        stock,
        rating: 4.5,
        images: ["https://via.placeholder.com/300/2c5e4f/ffffff?text=منتج+جديد"],
        merchantId: null,
        soldCount: 0,
        createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveProducts();
    displayProducts();
    closeModal('productModal');
    showAdvancedNotification('تم إضافة المنتج', 'success');
}

// ========== التهيئة الرئيسية ==========
window.onload = function() {
    loadProducts();
    loadCart();

    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIBasedOnRole();
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
    }

    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 500);
    }, 1000);

    window.addEventListener('scroll', toggleQuickTopButton);
};

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
