
// ========== ناردو برو - النظام المتكامل النهائي ==========
// ========== الإصدار 1.0 - 2026 ==========

// ========== 1. إعدادات تلجرام ==========
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689'
};

// ========== 2. المتغيرات العامة ==========
let products = [];
let merchants = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];
let lastUpdateId = 0;

// ========== 3. تحميل المستخدمين ==========
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { 
                id: 1, 
                name: 'مدير', 
                email: 'admin@nardoo.com', 
                password: '123456', 
                role: 'admin',
                phone: '0555000000',
                telegramId: TELEGRAM.adminId,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 4. نظام الإشعارات Toast ==========
const ToastSystem = {
    show: function(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('⚠️ عنصر toastContainer غير موجود');
            return null;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            loading: 'fa-spinner fa-spin'
        };
        
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        if (type !== 'loading') {
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, duration);
        }
        
        return toast;
    },
    
    hideAll: function() {
        const container = document.getElementById('toastContainer');
        if (container) container.innerHTML = '';
    }
};

// ========== 5. دوال مساعدة ==========
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
    return 'منذ وقت';
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

// ========== 6. دوال تلجرام الأساسية ==========
async function sendTelegramMessage(message, chatId = TELEGRAM.channelId) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error('❌ فشل إرسال الرسالة:', error);
        return false;
    }
}

async function sendTelegramPhoto(imageUrl, caption, chatId = TELEGRAM.channelId) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: imageUrl,
                caption: caption,
                parse_mode: 'Markdown'
            })
        });
        
        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error('❌ فشل إرسال الصورة:', error);
        return false;
    }
}

async function uploadImageToTelegram(imageFile) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('photo', imageFile);

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.ok && data.result.photo) {
            const fileId = data.result.photo[data.result.photo.length - 1].file_id;
            
            const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileResponse.json();
            
            if (fileData.ok) {
                const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                return imageUrl;
            }
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في رفع الصورة:', error);
        return null;
    }
}

async function getTelegramUpdates() {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates?offset=${lastUpdateId}`
        );
        
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                lastUpdateId = update.update_id + 1;
            }
            return data.result;
        }
        return [];
    } catch (error) {
        console.error('❌ فشل جلب التحديثات:', error);
        return [];
    }
}

// ========== 7. استخراج بيانات المنتج ==========
function extractProductData(lines) {
    let name = 'منتج';
    let price = 0;
    let category = 'other';
    let stock = 10;
    let merchant = 'المتجر';
    let merchantId = null;
    
    lines.forEach(line => {
        if (line.includes('المنتج:')) {
            name = line.replace('المنتج:', '').replace(/[🟣*]/g, '').trim();
        } else if (line.includes('السعر:')) {
            const match = line.match(/\d+/);
            if (match) price = parseInt(match[0]);
        } else if (line.includes('القسم:')) {
            const cat = line.replace('القسم:', '').replace(/[🟣*]/g, '').trim().toLowerCase();
            if (cat.includes('promo') || cat.includes('برموسيو')) category = 'promo';
            else if (cat.includes('spices') || cat.includes('توابل')) category = 'spices';
            else if (cat.includes('cosmetic') || cat.includes('كوسمتيك')) category = 'cosmetic';
            else category = 'other';
        } else if (line.includes('الكمية:')) {
            const match = line.match(/\d+/);
            if (match) stock = parseInt(match[0]);
        } else if (line.includes('التاجر:')) {
            merchant = line.replace('التاجر:', '').replace(/[🟣*]/g, '').trim();
        } else if (line.includes('معرف التاجر:')) {
            const match = line.match(/\|\|(\d+)\|\|/);
            if (match) merchantId = parseInt(match[1]);
        }
    });
    
    return { name, price, category, stock, merchantName: merchant, merchantId, rating: 4.5 };
}

// ========== 8. البحث عن المنتجات من تلجرام ==========
async function fetchProductsFromTelegram() {
    try {
        console.log('🔍 جاري البحث عن المنتجات في تلجرام...');
        
        const updates = await getTelegramUpdates();
        const foundProducts = [];
        
        for (const update of updates) {
            if (update.channel_post) {
                const post = update.channel_post;
                
                // منتج مع صورة
                if (post.photo && post.caption && post.caption.includes('🟣')) {
                    console.log('📸 وجدنا منتج مع صورة');
                    
                    const lines = post.caption.split('\n');
                    const productData = extractProductData(lines);
                    
                    const photo = post.photo[post.photo.length - 1];
                    const fileId = photo.file_id;
                    
                    const fileResponse = await fetch(
                        `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                    );
                    const fileData = await fileResponse.json();
                    
                    let imageUrl = "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
                    if (fileData.ok) {
                        imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                    }
                    
                    foundProducts.push({
                        id: post.message_id,
                        name: productData.name,
                        price: productData.price,
                        category: productData.category,
                        stock: productData.stock,
                        merchantName: productData.merchantName,
                        merchantId: productData.merchantId,
                        images: [imageUrl],
                        rating: 4.5,
                        createdAt: new Date(post.date * 1000).toISOString()
                    });
                }
                
                // منتج نصي فقط
                else if (post.text && post.text.includes('🟣')) {
                    console.log('📦 وجدنا منتج نصي');
                    
                    const lines = post.text.split('\n');
                    const productData = extractProductData(lines);
                    
                    foundProducts.push({
                        id: post.message_id,
                        name: productData.name,
                        price: productData.price,
                        category: productData.category,
                        stock: productData.stock,
                        merchantName: productData.merchantName,
                        merchantId: productData.merchantId,
                        images: ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
                        rating: 4.5,
                        createdAt: new Date(post.date * 1000).toISOString()
                    });
                }
            }
        }
        
        console.log(`✅ تم العثور على ${foundProducts.length} منتج في تلجرام`);
        return foundProducts;
        
    } catch (error) {
        console.error('❌ خطأ في البحث عن المنتجات:', error);
        return [];
    }
}

// ========== 9. دمج المنتجات ==========
function mergeProducts(telegramProducts) {
    const localProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
    const allProducts = [...telegramProducts];
    
    localProducts.forEach(localProduct => {
        const exists = allProducts.find(p => p.id === localProduct.id);
        if (!exists) {
            allProducts.push(localProduct);
        }
    });
    
    localStorage.setItem('nardoo_products', JSON.stringify(allProducts));
    return allProducts;
}

// ========== 10. تحميل المنتجات ==========
async function loadProducts() {
    ToastSystem.show('🔄 جاري تحميل المنتجات من تلجرام...', 'loading', 0);
    
    const telegramProducts = await fetchProductsFromTelegram();
    products = mergeProducts(telegramProducts);
    
    ToastSystem.hideAll();
    ToastSystem.show(`✅ تم تحميل ${products.length} منتج`, 'success');
    
    displayProducts();
    return products;
}

// ========== 11. إضافة منتج إلى تليجرام ==========
async function addProductToTelegram(product) {
    try {
        ToastSystem.show('🔄 جاري النشر إلى تلجرام...', 'loading', 0);
        
        const categoryName = getCategoryName(product.category);
        const categoryIcon = {
            'promo': '🔥',
            'spices': '🧂',
            'cosmetic': '💄',
            'other': '📦'
        }[product.category] || '📦';
        
        const tableMessage = `
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
🟣         *منتج جديد في المتجر*         
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

┌──────────────────┬────────────────────┐
│ 📦 *المنتج*      │ ${product.name.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 💰 *السعر*       │ ${product.price.toString().padEnd(18)} دج │
├──────────────────┼────────────────────┤
│ ${categoryIcon} *القسم*       │ ${categoryName.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 📊 *الكمية*      │ ${product.stock.toString().padEnd(18)} قطعة │
├──────────────────┼────────────────────┤
│ 👤 *التاجر*      │ ${product.merchantName.padEnd(18)} │
└──────────────────┴────────────────────┘

⏰ *تاريخ الإضافة:* ${new Date().toLocaleString('ar-DZ')}
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
        `;

        if (product.images && product.images.length > 0 && !product.images[0].startsWith('data:')) {
            const success = await sendTelegramPhoto(product.images[0], tableMessage);
            if (success) {
                ToastSystem.hideAll();
                ToastSystem.show('✅ تم نشر المنتج مع الصورة', 'success');
                return true;
            }
        }
        
        const success = await sendTelegramMessage(tableMessage);
        
        if (success) {
            ToastSystem.hideAll();
            ToastSystem.show('✅ تم نشر المنتج', 'success');
            return true;
        }
        
        ToastSystem.hideAll();
        ToastSystem.show('❌ فشل النشر', 'error');
        return false;
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        ToastSystem.hideAll();
        ToastSystem.show('❌ خطأ في الاتصال', 'error');
        return false;
    }
}

// ========== 12. معالج رفع الصور ==========
async function handleImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    const uploadStatus = document.getElementById('uploadStatus');
    const imagesData = [];

    if (!preview) return;
    preview.innerHTML = '';
    
    if (uploadStatus) {
        uploadStatus.innerHTML = '🔄 جاري رفع الصور...';
        uploadStatus.style.display = 'block';
        uploadStatus.className = 'upload-status info';
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // معاينة محلية
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML += `
                <div class="image-upload-item">
                    <img src="${e.target.result}" class="preview-image" alt="معاينة">
                    <div class="upload-progress">جاري الرفع...</div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
        
        // رفع إلى تلجرام
        const imageUrl = await uploadImageToTelegram(file);
        if (imageUrl) {
            imagesData.push(imageUrl);
            
            // تحديث شريط التقدم
            const progressDivs = preview.querySelectorAll('.upload-progress');
            if (progressDivs[i]) {
                progressDivs[i].textContent = '✅ تم الرفع';
                progressDivs[i].style.background = '#4ade80';
                progressDivs[i].style.color = '#000';
            }
        } else {
            const progressDivs = preview.querySelectorAll('.upload-progress');
            if (progressDivs[i]) {
                progressDivs[i].textContent = '❌ فشل';
                progressDivs[i].style.background = '#f87171';
            }
        }
    }

    document.getElementById('productImagesData').value = JSON.stringify(imagesData);
    
    if (uploadStatus) {
        uploadStatus.innerHTML = `✅ تم رفع ${imagesData.length} من ${files.length} صور`;
        uploadStatus.className = 'upload-status success';
        setTimeout(() => {
            uploadStatus.style.display = 'none';
        }, 3000);
    }
}

// ========== 13. عرض المنتجات في المتجر ==========
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary);">أول منتج يضاف في تلجرام سيظهر هنا</p>
                ${currentUser?.role === 'merchant_approved' || currentUser?.role === 'admin' ? `
                    <button class="btn-gold" onclick="showAddProductModal()" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> إضافة منتج جديد
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter !== 'all' && currentFilter !== 'my_products') {
        filtered = filtered.filter(p => p.category === currentFilter);
    } else if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => 
            p.merchantName === currentUser.storeName || 
            p.merchantName === currentUser.name ||
            p.merchantId == currentUser.id
        );
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-search" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px;">لا توجد نتائج</h3>
                <p style="color: var(--text-secondary);">لا توجد منتجات تطابق بحثك</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(product => {
        const images = product.images && product.images.length > 0 
            ? product.images 
            : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"];
        
        let categoryIcon = 'fas fa-tag';
        if (product.category === 'promo') categoryIcon = 'fas fa-fire';
        else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
        else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';

        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;
        const timeAgo = getSimpleTimeAgo(product.createdAt);

        return `
            <div class="product-card" onclick="viewProductDetails(${product.id})">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                <div class="product-gallery">
                    <img src="${images[0]}" alt="${product.name}" 
                         onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال'">
                </div>
                <div class="product-info">
                    <div class="product-category">
                        <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                    </div>
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-merchant-info">
                        <i class="fas fa-store"></i> ${product.merchantName}
                    </div>
                    <div class="product-rating">
                        <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                        <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                    </div>
                    <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    <div class="product-actions">
                        <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== 14. عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال'">
    `).join('') || '<div style="height: 300px; background: var(--nardoo); display: flex; align-items: center; justify-content: center; border-radius: 20px;"><i class="fas fa-image" style="font-size: 80px; color: var(--gold);"></i></div>';

    let categoryIcon = 'fas fa-tag';
    if (product.category === 'promo') categoryIcon = 'fas fa-fire';
    else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
    else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';

    const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
    const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;

    content.innerHTML = `
        <div style="position: relative;">
            <span style="position: absolute; top: 10px; right: 10px; background: var(--gold); color: #000; padding: 5px 15px; border-radius: 20px; font-size: 14px;">
                <i class="far fa-clock"></i> ${getSimpleTimeAgo(product.createdAt)}
            </span>
            <h2 style="text-align: center; margin-bottom: 30px; color: var(--gold);">${product.name}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <div style="display: grid; gap: 10px;">
                        ${images}
                    </div>
                </div>
                <div>
                    <div style="margin-bottom: 20px;">
                        <span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: #000; font-weight: 700;">
                            <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                        </span>
                    </div>
                    
                    <p style="margin-bottom: 20px;">منتج من ${product.merchantName}</p>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                        <i class="fas fa-store" style="color: var(--gold);"></i>
                        <span>${product.merchantName}</span>
                    </div>
                    
                    <div class="product-rating" style="margin-bottom: 20px;">
                        <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                        <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <span style="font-size: 32px; font-weight: 800; color: var(--gold);">${product.price.toLocaleString()} دج</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <span class="product-stock ${stockClass}">${stockText}</span>
                    </div>
                    
                    <div style="display: flex; gap: 15px;">
                        <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                        <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">
                            <i class="fas fa-times"></i> إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== 15. فلترة المنتجات ==========
function filterProducts(category) {
    currentFilter = category;
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    displayProducts();
}

// ========== 16. البحث عن المنتجات ==========
function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

// ========== 17. إدارة السلة ==========
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
    const fixedCounter = document.getElementById('fixedCartCounter');
    
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || product.stock <= 0) {
        ToastSystem.show('المنتج غير متوفر', 'error');
        return;
    }

    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            ToastSystem.show('الكمية غير كافية', 'warning');
            return;
        }
    } else {
        cart.push({
            productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            merchantName: product.merchantName
        });
    }

    saveCart();
    updateCartCounter();
    updateCartDisplay();
    ToastSystem.show('تمت الإضافة', 'success');
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');

    if (!itemsDiv || !totalSpan) return;

    if (cart.length === 0) {
        itemsDiv.innerHTML = '<div style="text-align: center; padding: 40px;">السلة فارغة</div>';
        totalSpan.textContent = '0 دج';
        return;
    }

    let total = 0;
    itemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-image"><i class="fas fa-box"></i></div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price} دج</div>
                    <div class="cart-item-merchant">${item.merchantName || 'المتجر'}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity + 1})">+</button>
                        <button class="quantity-btn" onclick="removeFromCart(${item.productId})" style="background: #f87171;">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    totalSpan.textContent = `${total} دج`;
}

function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId == productId);
    const product = products.find(p => p.id == productId);

    if (!item || !product) return;

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > product.stock) {
        ToastSystem.show('الكمية غير متوفرة', 'warning');
        return;
    }

    item.quantity = newQuantity;
    saveCart();
    updateCartCounter();
    updateCartDisplay();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    ToastSystem.show('تمت الإزالة', 'info');
}

// ========== 18. إرسال طلب شراء مع جدول السلة ==========
async function sendOrderToTelegram(order) {
    try {
        let productsTable = `┌────┬────────────────────┬──────┬─────────┐\n`;
        productsTable += `│ #  │ المنتج             │ الكم │ السعر   │\n`;
        productsTable += `├────┼────────────────────┼──────┼─────────┤\n`;
        
        order.items.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            const productName = item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name;
            productsTable += `│ ${(index + 1).toString().padEnd(2)} │ ${productName.padEnd(18)} │ ${item.quantity.toString().padEnd(4)} │ ${itemTotal.toString().padEnd(7)} دج │\n`;
        });
        
        productsTable += `└────┴────────────────────┴──────┴─────────┘`;

        const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 800;
        const total = subtotal + shipping;

        const message = `
🟢 *طلب شراء جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}

📦 *المنتجات:*
${productsTable}

💰 *المجموع الفرعي:* ${subtotal} دج
🚚 *الشحن:* ${shipping} دج
💵 *الإجمالي:* ${total} دج
🔔 *رقم الطلب:* #${order.orderId}
⏰ ${new Date().toLocaleString('ar-DZ')}
        `;

        await sendTelegramMessage(message);
        await sendTelegramMessage(message, TELEGRAM.adminId);

        const merchantGroups = {};
        order.items.forEach(item => {
            const merchantName = item.merchantName || 'المتجر';
            if (!merchantGroups[merchantName]) merchantGroups[merchantName] = [];
            merchantGroups[merchantName].push(item);
        });

        for (const [merchantName, items] of Object.entries(merchantGroups)) {
            const merchant = users.find(u => u.storeName === merchantName || u.name === merchantName);
            
            if (merchant?.telegramId) {
                let merchantTable = `┌────┬────────────────────┬──────┬─────────┐\n`;
                merchantTable += `│ #  │ المنتج             │ الكم │ السعر   │\n`;
                merchantTable += `├────┼────────────────────┼──────┼─────────┤\n`;
                
                items.forEach((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const productName = item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name;
                    merchantTable += `│ ${(index + 1).toString().padEnd(2)} │ ${productName.padEnd(18)} │ ${item.quantity.toString().padEnd(4)} │ ${itemTotal.toString().padEnd(7)} دج │\n`;
                });
                
                merchantTable += `└────┴────────────────────┴──────┴─────────┘`;

                const merchantMessage = `
🟢 *طلب جديد - ${merchantName}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}

📦 *منتجاتك:*
${merchantTable}

💰 *الإجمالي:* ${items.reduce((s, i) => s + (i.price * i.quantity), 0)} دج
🔔 *رقم الطلب:* #${order.orderId}
                `;

                await sendTelegramMessage(merchantMessage, merchant.telegramId);
            }
        }

        return true;

    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
        return false;
    }
}

// ========== 19. إتمام الشراء ==========
async function checkoutCart() {
    if (cart.length === 0) {
        ToastSystem.show('السلة فارغة', 'warning');
        return;
    }

    if (!currentUser) {
        ToastSystem.show('سجل دخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    const customerPhone = prompt('رقم الهاتف:', currentUser.phone || '');
    if (!customerPhone) return;
    
    const customerAddress = prompt('العنوان:', '');
    if (!customerAddress) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 800;
    const total = subtotal + shipping;

    const order = {
        customerName: currentUser.name,
        customerPhone,
        customerAddress,
        items: cart.map(item => ({...item})),
        subtotal,
        shipping,
        total,
        orderId: `ORD${Date.now()}`
    };

    ToastSystem.show('🔄 جاري إرسال الطلب...', 'loading', 0);
    
    await sendOrderToTelegram(order);

    // واتساب للتجار
    const merchantPhones = {};
    cart.forEach(item => {
        const merchant = users.find(u => u.storeName === item.merchantName || u.name === item.merchantName);
        if (merchant?.phone) {
            if (!merchantPhones[merchant.phone]) merchantPhones[merchant.phone] = [];
            merchantPhones[merchant.phone].push(item);
        }
    });

    Object.entries(merchantPhones).forEach(([phone, items]) => {
        const msg = `طلب جديد:\n${items.map(i => `${i.name} - ${i.quantity} قطعة`).join('\n')}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    });

    // واتساب للمتجر
    const storeMsg = `طلب جديد من ${currentUser.name}:\n${cart.map(i => `${i.name} - ${i.quantity} قطعة`).join('\n')}\nالإجمالي: ${total} دج`;
    window.open(`https://wa.me/213562243648?text=${encodeURIComponent(storeMsg)}`, '_blank');

    // تحديث المخزون
    cart.forEach(item => {
        const product = products.find(p => p.id == item.productId);
        if (product) product.stock -= item.quantity;
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    
    ToastSystem.hideAll();
    ToastSystem.show('✅ تم إرسال الطلب', 'success');
}

// ========== 20. نظام إدارة الطلبات ==========
class OrderManagementSystem {
    constructor() {
        this.orders = this.loadOrders();
        this.orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    }

    loadOrders() {
        const saved = localStorage.getItem('nardoo_orders_management');
        return saved ? JSON.parse(saved) : [];
    }

    saveOrders() {
        localStorage.setItem('nardoo_orders_management', JSON.stringify(this.orders));
    }

    generateOrderId() {
        return `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    createOrder(orderData) {
        const order = {
            id: this.generateOrderId(),
            customerId: currentUser?.id || null,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            items: orderData.items || [],
            subtotal: orderData.subtotal,
            shipping: orderData.shipping,
            total: orderData.total,
            status: 'pending',
            createdAt: new Date().toISOString(),
            timeline: [{
                status: 'pending',
                timestamp: new Date().toISOString(),
                message: 'تم إنشاء الطلب'
            }]
        };

        this.orders.push(order);
        this.saveOrders();
        return order;
    }

    getOrder(orderId) {
        return this.orders.find(o => o.id === orderId);
    }

    updateOrderStatus(orderId, newStatus) {
        const order = this.getOrder(orderId);
        if (!order) return false;

        order.status = newStatus;
        order.updatedAt = new Date().toISOString();
        order.timeline.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            message: this.getStatusMessage(newStatus)
        });

        this.saveOrders();
        return true;
    }

    getStatusMessage(status) {
        const messages = {
            'pending': 'في انتظار التأكيد',
            'confirmed': 'تم التأكيد',
            'processing': 'جاري التجهيز',
            'shipped': 'تم الشحن',
            'delivered': 'تم التسليم',
            'cancelled': 'ملغي'
        };
        return messages[status] || status;
    }

    getOrderStatistics() {
        const stats = {
            totalOrders: this.orders.length,
            totalRevenue: 0,
            ordersByStatus: {},
            recentOrders: []
        };

        this.orderStatuses.forEach(s => stats.ordersByStatus[s] = 0);

        this.orders.forEach(order => {
            stats.totalRevenue += order.total;
            stats.ordersByStatus[order.status]++;
        });

        stats.recentOrders = [...this.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

        return stats;
    }
}

// ========== 21. نظام الواتساب ==========
class WhatsAppIntegration {
    constructor() {
        this.storePhone = '213562243648';
        this.orderHistory = this.loadOrderHistory();
    }

    loadOrderHistory() {
        const saved = localStorage.getItem('nardoo_order_history');
        return saved ? JSON.parse(saved) : [];
    }

    saveOrderHistory() {
        localStorage.setItem('nardoo_order_history', JSON.stringify(this.orderHistory));
    }
}

// ========== 22. نظام التحليلات ==========
class AnalyticsSystem {
    constructor() {
        this.events = this.loadEvents();
        this.pageViews = this.loadPageViews();
    }

    loadEvents() {
        const saved = localStorage.getItem('nardoo_analytics_events');
        return saved ? JSON.parse(saved) : [];
    }

    loadPageViews() {
        const saved = localStorage.getItem('nardoo_page_views');
        return saved ? JSON.parse(saved) : [];
    }

    saveEvents() {
        localStorage.setItem('nardoo_analytics_events', JSON.stringify(this.events));
    }

    savePageViews() {
        localStorage.setItem('nardoo_page_views', JSON.stringify(this.pageViews));
    }

    trackEvent(eventType, eventData = {}) {
        const event = {
            id: `EVT${Date.now()}`,
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString()
        };
        this.events.push(event);
        this.saveEvents();
    }

    trackPageView(pageName) {
        this.pageViews.push({
            id: `PV${Date.now()}`,
            pageName,
            timestamp: new Date().toISOString()
        });
        this.savePageViews();
    }

    getVisitStatistics() {
        return {
            totalPageViews: this.pageViews.length,
            totalEvents: this.events.length
        };
    }

    getConversionRate() {
        const cartEvents = this.events.filter(e => e.type === 'addToCart').length;
        const purchaseEvents = this.events.filter(e => e.type === 'purchase').length;
        return cartEvents > 0 ? ((purchaseEvents / cartEvents) * 100).toFixed(2) : 0;
    }
}

// ========== 23. إنشاء الكائنات ==========
const orderManager = new OrderManagementSystem();
const whatsappManager = new WhatsAppIntegration();
const analyticsManager = new AnalyticsSystem();

// ========== 24. إدارة المستخدمين ==========
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm && registerForm) {
        loginForm.style.display = tab === 'login' ? 'block' : 'none';
        registerForm.style.display = tab === 'register' ? 'block' : 'none';
    }
}

function toggleMerchantFields() {
    const isMerchant = document.getElementById('isMerchant')?.checked || false;
    const merchantFields = document.getElementById('merchantFields');
    if (merchantFields) {
        merchantFields.style.display = isMerchant ? 'block' : 'none';
    }
}

function handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
        ToastSystem.show('أدخل البريد وكلمة المرور', 'warning');
        return;
    }

    const user = users.find(u => (u.email === email || u.name === email) && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        updateUIBasedOnRole();
        ToastSystem.show(`مرحباً ${user.name}`, 'success');
        analyticsManager.trackEvent('login', { userId: user.id });
    } else {
        ToastSystem.show('بيانات غير صحيحة', 'error');
    }
}

function handleRegister() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant')?.checked || false;

    if (!name || !email || !password) {
        ToastSystem.show('املأ جميع الحقول', 'error');
        return;
    }

    if (users.find(u => u.email === email)) {
        ToastSystem.show('البريد مستخدم', 'error');
        return;
    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
        password,
        phone,
        role: isMerchant ? 'merchant_pending' : 'customer',
        status: isMerchant ? 'pending' : 'active',
        createdAt: new Date().toISOString()
    };

    if (isMerchant) {
        newUser.merchantLevel = document.getElementById('merchantLevel')?.value || '1';
        newUser.merchantDesc = document.getElementById('merchantDesc')?.value || '';
        newUser.storeName = document.getElementById('storeName')?.value || `متجر ${name}`;
        sendMerchantRequestToTelegram(newUser);
        ToastSystem.show('📋 تم إرسال الطلب', 'info');
    } else {
        ToastSystem.show('✅ تم التسجيل', 'success');
    }

    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    switchAuthTab('login');
}

// ========== 25. إرسال طلب انضمام تاجر ==========
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
🔵      *طلب انضمام تاجر جديد*      
🔵 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

┌──────────────────┬────────────────────┐
│ 🏪 *المتجر*      │ ${merchant.storeName.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 👤 *التاجر*      │ ${merchant.name.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 📧 *البريد*      │ ${merchant.email.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 📞 *الهاتف*      │ ${(merchant.phone || 'غير متوفر').padEnd(18)} │
├──────────────────┼────────────────────┤
│ 📊 *المستوى*     │ ${(merchant.merchantLevel || '1').padEnd(18)} │
└──────────────────┴────────────────────┘

📝 *الوصف:* ${merchant.merchantDesc || 'تاجر جديد'}
🔵 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

⬇️ *للإجراء*
✅ للموافقة: /approve_${merchant.id}
❌ للرفض: /reject_${merchant.id}
    `;

    await sendTelegramMessage(message);
    console.log('✅ تم إرسال طلب التاجر إلى تلجرام');
}

// ========== 26. تحديث الواجهة حسب الدور ==========
function updateUIBasedOnRole() {
    if (!currentUser) return;

    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    
    const merchantPanel = document.getElementById('merchantPanelContainer');
    if (merchantPanel) merchantPanel.style.display = 'none';
    
    const myProductsBtn = document.getElementById('myProductsBtn');
    if (myProductsBtn) myProductsBtn.remove();

    const userBtn = document.getElementById('userBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');

    if (currentUser.role === 'admin') {
        if (dashboardBtn) dashboardBtn.style.display = 'flex';
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-crown"></i>';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        ToastSystem.show('مرحباً أيها المدير', 'success');
    } else if (currentUser.role === 'merchant_approved') {
        if (dashboardBtn) dashboardBtn.style.display = 'none';
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-store"></i>';
        addMerchantMenuButton();
        showMerchantPanel();
        ToastSystem.show('مرحباً أيها التاجر', 'info');
    } else {
        if (dashboardBtn) dashboardBtn.style.display = 'none';
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-user"></i>';
    }
}

function addMerchantMenuButton() {
    const navMenu = document.getElementById('mainNav');
    if (navMenu && !document.getElementById('myProductsBtn')) {
        const btn = document.createElement('a');
        btn.className = 'nav-link';
        btn.id = 'myProductsBtn';
        btn.setAttribute('onclick', 'viewMyProducts()');
        btn.innerHTML = '<i class="fas fa-box"></i><span>منتجاتي</span>';
        navMenu.appendChild(btn);
    }
}

function viewMyProducts() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    currentFilter = 'my_products';
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const btn = document.getElementById('myProductsBtn');
    if (btn) btn.classList.add('active');
    displayProducts();
}

function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantName === currentUser.storeName || p.merchantName === currentUser.name || p.merchantId == currentUser.id);
    
    const panel = document.getElementById('merchantPanelContainer');
    if (!panel) return;
    
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="merchant-panel">
            <h3><i class="fas fa-store"></i> ${currentUser.storeName || currentUser.name}</h3>
            <div class="stats">
                <div class="stat-item"><div class="number">${merchantProducts.length}</div><div>منتجاتك</div></div>
                <div class="stat-item"><div class="number">${merchantProducts.filter(p => p.stock > 0).length}</div><div>متاح</div></div>
            </div>
            <button class="btn-gold" onclick="showAddProductModal()">➕ إضافة منتج</button>
        </div>
    `;
}

// ========== 27. إضافة منتج ==========
function showAddProductModal() {
    if (!currentUser) {
        ToastSystem.show('سجل دخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role !== 'merchant_approved' && currentUser.role !== 'admin') {
        ToastSystem.show('غير مصرح', 'error');
        return;
    }

    const nameInput = document.getElementById('productName');
    const categorySelect = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const preview = document.getElementById('imagePreview');
    const imagesData = document.getElementById('productImagesData');
    const modal = document.getElementById('productModal');

    if (nameInput) nameInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (priceInput) priceInput.value = '';
    if (stockInput) stockInput.value = '';
    if (preview) preview.innerHTML = '';
    if (imagesData) imagesData.value = '';
    if (modal) modal.style.display = 'flex';
}

// ========== 28. حفظ المنتج ==========
async function saveProduct() {
    if (!currentUser) {
        ToastSystem.show('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    if (currentUser.role !== 'merchant_approved' && currentUser.role !== 'admin') {
        ToastSystem.show('فقط التجار والمدير يمكنهم إضافة منتجات', 'error');
        return;
    }

    const name = document.getElementById('productName')?.value;
    const category = document.getElementById('productCategory')?.value;
    const price = parseInt(document.getElementById('productPrice')?.value);
    const stock = parseInt(document.getElementById('productStock')?.value);
    const imagesData = document.getElementById('productImagesData')?.value;
    const images = imagesData ? JSON.parse(imagesData) : [];

    if (!name || !category || !price || !stock) {
        ToastSystem.show('املأ جميع الحقول', 'error');
        return;
    }

    const product = {
        id: Date.now(),
        name,
        price,
        category,
        stock,
        merchantName: currentUser.storeName || currentUser.name,
        merchantId: currentUser.id,
        images: images.length ? images : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
        rating: 4.5,
        createdAt: new Date().toISOString()
    };

    // حفظ محلياً
    const existingProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
    existingProducts.push(product);
    localStorage.setItem('nardoo_products', JSON.stringify(existingProducts));
    products = existingProducts;

    // إرسال إلى تلجرام
    const sent = await addProductToTelegram(product);
    
    if (!sent) {
        ToastSystem.show('⚠️ تم الحفظ محلياً فقط', 'warning');
    }

    closeModal('productModal');
    displayProducts();
    
    if (currentUser.role === 'merchant_approved') {
        showMerchantPanel();
    }
}

// ========== 29. الموافقة على تاجر ==========
async function approveMerchant(merchantId) {
    console.log('🔄 محاولة الموافقة على التاجر:', merchantId);
    
    const merchantIndex = users.findIndex(u => u.id == merchantId);
    
    if (merchantIndex === -1) {
        console.error('❌ التاجر غير موجود');
        ToastSystem.show('التاجر غير موجود', 'error');
        return;
    }
    
    const merchant = users[merchantIndex];
    
    merchant.role = 'merchant_approved';
    merchant.status = 'approved';
    
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    console.log('✅ تمت الموافقة على التاجر:', merchant.name);
    
    const message = `
✅ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
✅      *تمت الموافقة على تاجر*      
✅ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

┌──────────────────┬────────────────────┐
│ 🏪 *المتجر*      │ ${merchant.storeName.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 👤 *التاجر*      │ ${merchant.name.padEnd(18)} │
└──────────────────┴────────────────────┘

🎉 *مبروك! يمكنك الآن إضافة منتجاتك*
✅ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
    `;
    
    await sendTelegramMessage(message);
    
    if (merchant.telegramId) {
        await sendTelegramMessage(message, merchant.telegramId);
    }
    
    ToastSystem.show(`✅ تمت الموافقة على التاجر: ${merchant.name}`, 'success');
    
    if (currentUser && currentUser.id === merchant.id) {
        currentUser = merchant;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        updateUIBasedOnRole();
    }
}

// ========== 30. رفض تاجر ==========
async function rejectMerchant(merchantId) {
    console.log('🔄 محاولة رفض التاجر:', merchantId);
    
    const merchantIndex = users.findIndex(u => u.id == merchantId);
    
    if (merchantIndex === -1) {
        console.error('❌ التاجر غير موجود');
        ToastSystem.show('التاجر غير موجود', 'error');
        return;
    }
    
    const merchant = users[merchantIndex];
    
    merchant.role = 'customer';
    merchant.status = 'rejected';
    
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    console.log('❌ تم رفض التاجر:', merchant.name);
    
    const message = `
❌ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
❌        *تم رفض طلب تاجر*         
❌ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

┌──────────────────┬────────────────────┐
│ 🏪 *المتجر*      │ ${merchant.storeName.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 👤 *التاجر*      │ ${merchant.name.padEnd(18)} │
└──────────────────┴────────────────────┘

😞 *نأسف، لم تتم الموافقة على طلبك*
❌ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
    `;
    
    await sendTelegramMessage(message);
    
    if (merchant.telegramId) {
        await sendTelegramMessage(message, merchant.telegramId);
    }
    
    ToastSystem.show(`❌ تم رفض التاجر: ${merchant.name}`, 'error');
}

// ========== 31. جلب التجار من تليجرام والاستماع للأوامر ==========
async function loadMerchantsFromTelegram() {
    try {
        const updates = await getTelegramUpdates();
        
        for (const update of updates) {
            // معالجة الرسائل الخاصة
            if (update.message && update.message.text) {
                const msg = update.message;
                const text = msg.text;
                
                if (text.startsWith('/approve_')) {
                    const match = text.match(/\/approve_(\d+)/);
                    if (match) {
                        const merchantId = parseInt(match[1]);
                        await approveMerchant(merchantId);
                    }
                }
                
                if (text.startsWith('/reject_')) {
                    const match = text.match(/\/reject_(\d+)/);
                    if (match) {
                        const merchantId = parseInt(match[1]);
                        await rejectMerchant(merchantId);
                    }
                }
            }
        }
        
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
    } catch (error) {
        console.error('❌ خطأ في جلب التجار:', error);
    }
}

// ========== 32. لوحة التحكم ==========
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        ToastSystem.show('غير مصرح', 'error');
        return;
    }

    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('dashboardSection').scrollIntoView({ behavior: 'smooth' });
    switchDashboardTab('overview');
}

function switchDashboardTab(tab) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    if (tab === 'overview') showDashboardOverview(content);
    else if (tab === 'orders') showDashboardOrders(content);
    else if (tab === 'products') showDashboardProducts(content);
    else if (tab === 'merchants') showDashboardMerchants(content);
}

function showDashboardOverview(container) {
    const orderStats = orderManager.getOrderStatistics();
    const analytics = analyticsManager.getVisitStatistics();

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">نظرة عامة</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-shopping-cart" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 32px;">${orderStats.totalOrders}</div>
                <div>إجمالي الطلبات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-coins" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 32px;">${orderStats.totalRevenue.toLocaleString()} دج</div>
                <div>الإيرادات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-eye" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 32px;">${analytics.totalPageViews}</div>
                <div>مشاهدات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-percent" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 32px;">${analyticsManager.getConversionRate()}%</div>
                <div>تحويل</div>
            </div>
        </div>
        
        <h4 style="margin: 30px 0 20px;">آخر الطلبات</h4>
        <table>
            <thead><tr><th>#</th><th>العميل</th><th>المجموع</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>
                ${orderStats.recentOrders.map(order => `
                    <tr>
                        <td>${order.id}</td>
                        <td>${order.customerName}</td>
                        <td>${order.total} دج</td>
                        <td><span class="status-badge status-${order.status}">${orderManager.getStatusMessage(order.status)}</span></td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showDashboardOrders(container) {
    const orders = orderManager.orders;
    container.innerHTML = `
        <h3 style="margin-bottom: 20px;">جميع الطلبات</h3>
        <table>
            <thead><tr><th>رقم</th><th>العميل</th><th>المجموع</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${order.id}</td>
                        <td>${order.customerName}</td>
                        <td>${order.total} دج</td>
                        <td>
                            <select onchange="orderManager.updateOrderStatus('${order.id}', this.value)" style="background: var(--glass); color: var(--text-primary); border: 1px solid var(--gold); border-radius: 10px; padding: 5px;">
                                ${orderManager.orderStatuses.map(s => 
                                    `<option value="${s}" ${order.status === s ? 'selected' : ''}>${orderManager.getStatusMessage(s)}</option>`
                                ).join('')}
                            </select>
                        </td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showDashboardProducts(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <h3>المنتجات (${products.length})</h3>
            <button class="btn-gold" onclick="showAddProductModal()">➕ إضافة</button>
        </div>
        <table>
            <thead><tr><th>#</th><th>الصورة</th><th>المنتج</th><th>السعر</th><th>الكمية</th><th>التاجر</th></tr></thead>
            <tbody>
                ${products.map((p, i) => `
                    <tr>
                        <td>${i+1}</td>
                        <td><img src="${p.images[0]}" style="width:50px;height:50px;object-fit:cover;border-radius:5px;"></td>
                        <td>${p.name}</td>
                        <td>${p.price} دج</td>
                        <td>${p.stock}</td>
                        <td>${p.merchantName}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showDashboardMerchants(container) {
    const pending = users.filter(u => u.role === 'merchant_pending');
    const approved = users.filter(u => u.role === 'merchant_approved');

    container.innerHTML = `
        <h3 style="margin-bottom: 20px;">طلبات التجار (${pending.length})</h3>
        ${pending.map(m => `
            <div class="merchant-card" style="border-right: 5px solid #fbbf24; margin-bottom: 15px; padding: 15px;">
                <h4>${m.storeName || m.name}</h4>
                <p>👤 ${m.name} | 📧 ${m.email} | 📞 ${m.phone || '—'}</p>
                <p>📊 المستوى ${m.merchantLevel || '1'}</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn-gold" onclick="approveMerchant(${m.id})" style="padding: 8px 20px;">✅ موافقة</button>
                    <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})" style="padding: 8px 20px;">❌ رفض</button>
                </div>
            </div>
        `).join('') || '<p>لا توجد طلبات</p>'

        }

        <h3 style="margin: 40px 0 20px;">التجار المعتمدون (${approved.length})</h3>
        <table>
            <thead><tr><th>#</th><th>المتجر</th><th>التاجر</th><th>المستوى</th><th>المنتجات</th></tr></thead>
            <tbody>
                ${approved.map((m, i) => {
                    const count = products.filter(p => p.merchantId == m.id || p.merchantName === m.storeName).length;
                    return `<tr><td>${i+1}</td><td>${m.storeName}</td><td>${m.name}</td><td>${m.merchantLevel || '1'}</td><td>${count}</td></tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

// ========== 33. دوال التمرير ==========
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

function toggleQuickTopButton() {
    const btn = document.getElementById('quickTopBtn');
    if (btn) btn.classList.toggle('show', window.scrollY > 300);
}

// ========== 34. عداد تنازلي ==========
function updateCountdown() {
    const hours = document.getElementById('marqueeHours');
    const minutes = document.getElementById('marqueeMinutes');
    const seconds = document.getElementById('marqueeSeconds');
    if (!hours || !minutes || !seconds) return;
    
    let h = 12, m = 30, s = 45;
    setInterval(() => {
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 12; m = 30; s = 45; }
        
        hours.textContent = h.toString().padStart(2, '0');
        minutes.textContent = m.toString().padStart(2, '0');
        seconds.textContent = s.toString().padStart(2, '0');
    }, 1000);
}

// ========== 35. تأثير الكتابة ==========
class TypingAnimation {
    constructor(element, texts, speed = 100) {
        this.element = element;
        this.texts = texts;
        this.speed = speed;
        this.index = 0;
        this.text = '';
        this.isDeleting = false;
        this.type();
    }
    
    type() {
        if (!this.element) return;
        
        const current = this.texts[this.index];
        this.text = this.isDeleting 
            ? current.substring(0, this.text.length - 1)
            : current.substring(0, this.text.length + 1);
            
        this.element.innerHTML = this.text + '<span class="typing-cursor">|</span>';
        
        let speed = this.speed;
        if (this.isDeleting) speed /= 2;
        
        if (!this.isDeleting && this.text === current) {
            speed = 2000;
            this.isDeleting = true;
        } else if (this.isDeleting && this.text === '') {
            this.isDeleting = false;
            this.index = (this.index + 1) % this.texts.length;
        }
        
        setTimeout(() => this.type(), speed);
    }
}

// ========== 36. جسيمات متحركة ==========
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 10 + 's';
        p.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(p);
    }
}

// ========== 37. تأثير الماوس ==========
function createMouseEffect() {
    const cursor = document.getElementById('mouseEffect');
    const dot = document.getElementById('mouseEffectDot');
    
    if (!cursor || !dot) return;
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
        dot.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`;
    });
    
    document.querySelectorAll('a, button, .product-card, .nav-link, .action-btn').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

// ========== 38. شريط تقدم التمرير ==========
function updateScrollProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById('scrollProgress');
    if (progressBar) progressBar.style.width = scrolled + '%';
}

// ========== 39. تبديل الثيم ==========
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.innerHTML = isDarkMode ? 
            '<i class="fas fa-moon"></i><span>ليلي</span>' : 
            '<i class="fas fa-sun"></i><span>نهاري</span>';
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ========== 40. التهيئة النهائية ==========
window.onload = async function() {
    console.log('🚀 بدء تشغيل نظام ناردو برو...');
    
    const loader = document.getElementById('loader');
    
    // إنشاء التأثيرات
    createParticles();
    createMouseEffect();
    
    // تحميل المنتجات من تلجرام
    await loadProducts();
    
    // تحميل التجار والاستماع للأوامر
    await loadMerchantsFromTelegram();
    
    // تحميل السلة
    loadCart();

    // استعادة المستخدم
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUIBasedOnRole();
        } catch (e) {
            console.error('خطأ في قراءة المستخدم:', e);
        }
    }

    // استعادة الثيم
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.innerHTML = isDarkMode ? 
                '<i class="fas fa-moon"></i><span>ليلي</span>' : 
                '<i class="fas fa-sun"></i><span>نهاري</span>';
        }
    }

    // إخفاء شاشة التحميل
    setTimeout(() => {
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }, 1000);

    // إعدادات إضافية
    window.addEventListener('scroll', toggleQuickTopButton);
    window.addEventListener('scroll', updateScrollProgress);
    updateCountdown();
    
    const typing = document.getElementById('typing-text');
    if (typing) {
        new TypingAnimation(typing, ['نكهة وجمال', 'تسوق آمن', 'جودة عالية', 'توصيل سريع']);
    }
    
    // تحديث دوري
    setInterval(loadMerchantsFromTelegram, 10000); // كل 10 ثوان
    setInterval(loadProducts, 30000); // كل 30 ثانية
    
    if (!currentUser) {
        setTimeout(() => {
            ToastSystem.show('👋 مرحباً بك في نكهة وجمال', 'info', 5000);
        }, 1500);
    }
    
    console.log('✅ نظام ناردو برو جاهز للعمل');
};

// ========== 41. إغلاق النوافذ ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
