
// ========== ناردو برو - الملف الرئيسي ==========

// 1️⃣ إعدادات تلجرام
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689'
};

// 2️⃣ المتغيرات العامة
let products = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];

// 3️⃣ تحميل المستخدمين
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { id: 1, name: 'azer', email: 'azer@admin.com', password: '123456', role: 'admin', phone: '0555000000', telegram: '@admin_nardoo' },
            { id: 2, name: 'أحمد التاجر', email: 'ahmed@merchant.com', password: 'a123', role: 'merchant_approved', phone: '0555111111', storeName: 'متجر أحمد' }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// 4️⃣ إضافة منتج إلى تلجرام
async function addProductToTelegram(product, imageFile) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('photo', imageFile);
        
        const caption = `🛍️ **منتج جديد**\n📦 الاسم: ${product.name}\n💰 السعر: ${product.price} دج\n📊 الكمية: ${product.stock}\n🏷️ القسم: ${product.category}\n👤 التاجر: ${product.merchantName}`;
        formData.append('caption', caption);

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST', body: formData
        });
        const data = await response.json();
        return data.ok ? { success: true, messageId: data.result.message_id } : { success: false };
    } catch (error) {
        return { success: false };
    }
}

// 5️⃣ جلب المنتجات من تلجرام
async function loadProductsFromTelegram() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        const products = [];
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                const post = update.channel_post;
                if (!post || !post.photo) continue;
                
                products.push({
                    id: post.message_id,
                    name: 'منتج',
                    price: 1000,
                    category: 'promo',
                    stock: 10,
                    merchantName: 'المتجر',
                    images: ['https://via.placeholder.com/300']
                });
            }
        }
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        return products;
    } catch (error) {
        const saved = localStorage.getItem('nardoo_products');
        return saved ? JSON.parse(saved) : [];
    }
}

// 6️⃣ حفظ المنتج
async function saveProduct() {
    if (!currentUser || !['admin', 'merchant_approved'].includes(currentUser.role)) {
        showNotification('غير مصرح لك', 'error');
        return;
    }

    const name = document.getElementById('productName')?.value;
    const category = document.getElementById('productCategory')?.value;
    const price = parseInt(document.getElementById('productPrice')?.value);
    const stock = parseInt(document.getElementById('productStock')?.value);
    const imageFile = document.getElementById('productImages')?.files[0];
    
    if (!name || !category || !price || !stock || !imageFile) {
        showNotification('املأ جميع الحقول', 'error');
        return;
    }

    const product = {
        merchantId: currentUser.id,
        name, price, category, stock,
        merchantName: currentUser.storeName || currentUser.name,
        merchantTelegram: currentUser.telegram || '@' + currentUser.name
    };

    const result = await addProductToTelegram(product, imageFile);
    
    if (result.success) {
        const newProduct = { ...product, id: result.messageId, images: [URL.createObjectURL(imageFile)] };
        products.push(newProduct);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        showNotification('✅ تم إضافة المنتج', 'success');
        closeModal('productModal');
        displayProducts();
    }
}

// 7️⃣ البحث عن منتج بالمعرف
function findProductById() {
    const id = prompt('🔍 أدخل معرف المنتج:');
    if (!id) return;
    const product = products.find(p => p.id == id);
    alert(product ? `✅ المنتج موجود: ${product.name}` : '❌ لا يوجد منتج');
}

// 8️⃣ الإشعارات
function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 9️⃣ تبديل الثيم
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i><span>ليلي</span>' : '<i class="fas fa-sun"></i><span>نهاري</span>';
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// 🔟 دوال الوقت
function getTimeAgo(dateString) {
    if (!dateString) return '';
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return 'منذ وقت';
}

// 1️⃣1️⃣ فرز المنتجات
function sortProducts(productsArray) {
    switch(sortBy) {
        case 'newest': return [...productsArray].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        case 'price_low': return [...productsArray].sort((a, b) => a.price - b.price);
        case 'price_high': return [...productsArray].sort((a, b) => b.price - a.price);
        case 'rating': return [...productsArray].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        default: return productsArray;
    }
}

function changeSort(value) {
    sortBy = value;
    displayProducts();
}

// 1️⃣2️⃣ تحميل المنتجات
async function loadProducts() {
    products = await loadProductsFromTelegram();
    displayProducts();
}

// 1️⃣3️⃣ عرض المنتجات
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => p.merchantId === currentUser.id);
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:80px;"><i class="fas fa-box-open" style="font-size:80px; color:var(--gold);"></i><h3>لا توجد منتجات</h3></div>`;
        return;
    }

    container.innerHTML = filtered.map(product => `
        <div class="product-card" onclick="viewProductDetails(${product.id})">
            <div class="product-time-badge"><i class="far fa-clock"></i> ${getTimeAgo(product.createdAt)}</div>
            <div class="product-gallery"><img src="${product.images?.[0] || 'https://via.placeholder.com/300'}"></div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">${product.price} <small>دج</small></div>
                <div class="product-actions" onclick="event.stopPropagation()">
                    <button class="add-to-cart" onclick="addToCart(${product.id})">➕ أضف للسلة</button>
                </div>
            </div>
        </div>
    `).join('');
}

// 1️⃣4️⃣ تصفية المنتجات
function filterProducts(category) {
    currentFilter = category;
    displayProducts();
    updateNavigation();
}

// 1️⃣5️⃣ البحث
function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

// 1️⃣6️⃣ إدارة السلة
function loadCart() {
    cart = JSON.parse(localStorage.getItem('nardoo_cart') || '[]');
    updateCartCounter();
}

function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCounter').textContent = count;
    document.getElementById('fixedCartCounter').textContent = count;
}

function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || product.stock <= 0) return;

    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ productId, name: product.name, price: product.price, quantity: 1 });
    }
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت الإضافة', 'success');
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    let total = 0;
    itemsDiv.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `<div class="cart-item">${item.name} x${item.quantity} = ${item.price * item.quantity} دج</div>`;
    }).join('');
    document.getElementById('cartTotal').textContent = `${total} دج`;
}

// 1️⃣7️⃣ إتمام الشراء
async function checkoutCart() {
    if (cart.length === 0) return;
    showNotification('✅ تم إرسال الطلب', 'success');
    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
}

// 1️⃣8️⃣ دوال التمرير
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function scrollToBottom() { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); }

// 1️⃣9️⃣ عرض تفاصيل المنتج
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    alert(`📦 ${product.name}\n💰 ${product.price} دج`);
}

// 2️⃣0️⃣ إدارة المستخدمين
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('loginModalContent').innerHTML = `
        <h2 style="color:var(--gold);">تسجيل الدخول</h2>
        <input type="email" id="loginEmail" placeholder="البريد" class="form-control">
        <input type="password" id="loginPassword" placeholder="كلمة المرور" class="form-control">
        <button class="btn-gold" onclick="handleLogin()">دخول</button>
    `;
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
        updateUIBasedOnRole();
        showNotification(`👋 مرحباً ${user.name}`, 'success');
    } else {
        showNotification('❌ بيانات غير صحيحة', 'error');
    }
}

// 2️⃣1️⃣ تحديث الواجهة حسب الدور
function updateUIBasedOnRole() {
    if (!currentUser) return;
    document.getElementById('userBtn').innerHTML = currentUser.role === 'admin' ? '<i class="fas fa-crown"></i>' : '<i class="fas fa-user"></i>';
    if (currentUser.role === 'admin') {
        document.getElementById('dashboardBtn').style.display = 'flex';
    }
    updateNavigation();
}

// 2️⃣2️⃣ تحديث القائمة
function updateNavigation() {
    const nav = document.getElementById('mainNav');
    nav.innerHTML = `
        <a class="nav-link" onclick="filterProducts('all')"><i class="fas fa-home"></i><span>الرئيسية</span></a>
        <a class="nav-link" onclick="filterProducts('promo')"><i class="fas fa-tags"></i><span>برومسيون</span></a>
        <a class="nav-link" onclick="filterProducts('spices')"><i class="fas fa-seedling"></i><span>توابل</span></a>
        <a class="nav-link" onclick="filterProducts('cosmetic')"><i class="fas fa-spa"></i><span>كوسمتيك</span></a>
    `;
    if (currentUser?.role === 'admin') {
        nav.innerHTML += `<a class="nav-link" onclick="showAddProductModal()"><i class="fas fa-plus-circle"></i><span>إضافة منتج</span></a>`;
    }
}

// 2️⃣3️⃣ إظهار نافذة إضافة منتج
function showAddProductModal() {
    if (!currentUser) { openLoginModal(); return; }
    document.getElementById('productModal').style.display = 'flex';
    document.getElementById('productModalContent').innerHTML = `
        <h2 style="color:var(--gold);">➕ إضافة منتج</h2>
        <input type="text" id="productName" placeholder="اسم المنتج" class="form-control">
        <select id="productCategory" class="form-control"><option value="promo">برومسيون</option><option value="spices">توابل</option><option value="cosmetic">كوسمتيك</option></select>
        <input type="number" id="productPrice" placeholder="السعر" class="form-control">
        <input type="number" id="productStock" placeholder="الكمية" class="form-control">
        <input type="file" id="productImages" class="form-control">
        <button class="btn-gold" onclick="saveProduct()">حفظ</button>
    `;
}

// 2️⃣4️⃣ لوحة التحكم
function openDashboard() {
    if (currentUser?.role === 'admin') {
        document.getElementById('dashboardSection').style.display = 'block';
        document.getElementById('dashboardContent').innerHTML = '<h3>لوحة المدير</h3>';
    }
}

// 2️⃣5️⃣ التهيئة
window.onload = async function() {
    products = await loadProductsFromTelegram();
    displayProducts();
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
    setTimeout(() => document.getElementById('loader').style.display = 'none', 1000);
};
