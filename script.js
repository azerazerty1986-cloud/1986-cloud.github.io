// ========== ناردو برو - النظام الكامل ==========

// إعدادات تلجرام
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890'
};

// المتغيرات العامة
let products = [];
let users = [
    { id: 1, name: 'مدير', email: 'admin@nardoo.com', password: 'admin123', role: 'admin' }
];
let currentUser = null;
let cart = [];

// تحميل المنتجات من تلجرام
async function loadProducts() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        products = [];

        for (const update of data.result || []) {
            const post = update.channel_post;
            if (!post || !post.photo) continue;

            const fileId = post.photo[post.photo.length - 1].file_id;
            const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            
            const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
            const text = post.caption || '';

            if (text.includes('منتج')) {
                let name = 'منتج', price = 0, category = 'promo', stock = 0, merchant = 'تاجر';
                text.split('\n').forEach(line => {
                    if (line.includes('الاسم:')) name = line.replace('الاسم:', '').trim();
                    if (line.includes('السعر:')) price = parseInt(line.match(/\d+/)?.[0] || 0);
                    if (line.includes('القسم:')) category = line.replace('القسم:', '').trim();
                    if (line.includes('الكمية:')) stock = parseInt(line.match(/\d+/)?.[0] || 0);
                    if (line.includes('التاجر:')) merchant = line.replace('التاجر:', '').trim();
                });

                products.push({
                    id: post.message_id,
                    name, price, category, stock, merchant,
                    image: imageUrl,
                    rating: 4.5
                });
            }
        }
        displayProducts();
    } catch (error) {
        console.error('خطأ:', error);
    }
}

// عرض المنتجات
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px;">لا توجد منتجات</div>';
        return;
    }

    container.innerHTML = products.map(p => `
        <div style="background:#1a2f28; border:2px solid #d4af37; border-radius:25px; overflow:hidden;">
            <img src="${p.image}" style="width:100%; height:250px; object-fit:cover;">
            <div style="padding:20px;">
                <span style="background:#d4af37; color:#0a1a15; padding:5px 15px; border-radius:25px;">${p.category}</span>
                <h3 style="color:#d4af37; margin:15px 0;">${p.name}</h3>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <i class="fas fa-store" style="color:#d4af37;"></i>
                    <span>${p.merchant}</span>
                </div>
                <div style="font-size:24px; color:#d4af37; margin:15px 0;">${p.price} دج</div>
                <div style="color:#4ade80; margin-bottom:15px;">متوفر: ${p.stock}</div>
                <button onclick="addToCart(${p.id})" style="background:#d4af37; border:none; padding:10px 20px; border-radius:30px; font-weight:bold; cursor:pointer;">
                    أضف للسلة
                </button>
            </div>
        </div>
    `).join('');
}

// إضافة منتج جديد
async function saveProduct() {
    if (!currentUser || (currentUser.role !== 'merchant' && currentUser.role !== 'admin')) {
        alert('غير مصرح لك بإضافة منتجات');
        return;
    }

    const product = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseInt(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        merchant: currentUser.storeName || currentUser.name,
        image: document.getElementById('productImage').value || 'https://images.unsplash.com/photo-1542838132-92c53300491e'
    };

    const message = `منتج جديد
الاسم: ${product.name}
السعر: ${product.price} دج
القسم: ${product.category}
الكمية: ${product.stock}
التاجر: ${product.merchant}`;

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                photo: product.image,
                caption: message
            })
        });
        alert('✅ تم إضافة المنتج');
        document.getElementById('productModal').style.display = 'none';
        setTimeout(loadProducts, 2000);
    } catch (error) {
        alert('❌ فشل الإضافة');
    }
}

// نظام المستخدمين
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function switchAuthTab(tab) {
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function toggleMerchantFields() {
    document.getElementById('merchantFields').style.display = 
        document.getElementById('isMerchant').checked ? 'block' : 'none';
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = user;
        closeModal('loginModal');
        updateUI();
        alert(`مرحباً ${user.name}`);
    } else {
        alert('بيانات غير صحيحة');
    }
}

function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const isMerchant = document.getElementById('isMerchant').checked;

    const newUser = {
        id: users.length + 1,
        name, email, password,
        role: isMerchant ? 'merchant_pending' : 'customer',
        storeName: document.getElementById('storeName')?.value || name
    };

    users.push(newUser);
    alert('تم التسجيل بنجاح');
    switchAuthTab('login');
}

function updateUI() {
    const userBtn = document.getElementById('userBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    
    if (currentUser) {
        userBtn.innerHTML = currentUser.role === 'admin' ? '<i class="fas fa-crown"></i>' : 
                           currentUser.role.includes('merchant') ? '<i class="fas fa-store"></i>' : 
                           '<i class="fas fa-user"></i>';
        
        if (currentUser.role === 'admin') {
            dashboardBtn.style.display = 'flex';
        }
        
        if (currentUser.role === 'merchant_approved') {
            showMerchantPanel();
        }
    }
}

function showMerchantPanel() {
    const merchantProducts = products.filter(p => p.merchant === currentUser.storeName);
    document.getElementById('merchantPanel').innerHTML = `
        <div style="background:#9b59b6; border-radius:30px; padding:30px; margin:20px 0;">
            <h3 style="color:white;">لوحة التاجر - ${currentUser.storeName}</h3>
            <div style="display:flex; gap:20px; margin:20px 0;">
                <div><span style="font-size:32px; color:#d4af37;">${merchantProducts.length}</span><br>منتجاتي</div>
                <div><span style="font-size:32px; color:#d4af37;">${merchantProducts.filter(p => p.stock > 0).length}</span><br>متاح</div>
            </div>
            <button class="btn-gold" onclick="showAddProductModal()">إضافة منتج</button>
        </div>
    `;
    document.getElementById('merchantPanel').style.display = 'block';
}

function showAddProductModal() {
    if (!currentUser) {
        alert('سجل دخول أولاً');
        openLoginModal();
        return;
    }
    document.getElementById('productModal').style.display = 'flex';
}

function openDashboard() {
    if (currentUser?.role !== 'admin') return;
    const section = document.getElementById('dashboardSection');
    section.style.display = 'block';
    section.innerHTML = `
        <h2 style="color:#d4af37;">لوحة التحكم</h2>
        <div style="background:#1a2f28; border-radius:30px; padding:30px; margin-top:20px;">
            <p>إجمالي المنتجات: ${products.length}</p>
            <p>إجمالي المستخدمين: ${users.length}</p>
            <p>التجار المعلقين: ${users.filter(u => u.role === 'merchant_pending').length}</p>
        </div>
    `;
}

// دوال مساعدة
function filterProducts(cat) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');
    // التصفية حسب القسم
    loadProducts();
}

function searchProducts() {
    // البحث
    loadProducts();
}

function toggleCart() {
    alert('السلة: ' + cart.length + ' منتجات');
}

function addToCart(id) {
    cart.push(id);
    document.getElementById('cartCounter').textContent = cart.length;
    alert('✅ أضيف للسلة');
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
}

// تشغيل النظام
window.onload = function() {
    loadProducts();
    setInterval(loadProducts, 30000); // تحديث كل 30 ثانية
};
