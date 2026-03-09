// ========== ناردو برو - تجربة التاجر ==========

// ========== 1. إعدادات تلجرام ==========
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689'  // المدير
};

// ========== 2. المتغيرات ==========
let users = JSON.parse(localStorage.getItem('nardoo_users')) || [
    { id: 1, name: 'azer', email: 'azer@admin.com', password: '123456', role: 'admin', telegram: '@admin' }
];
let currentUser = null;
let products = [];

// ========== 3. حفظ المستخدمين ==========
function saveUsers() {
    localStorage.setItem('nardoo_users', JSON.stringify(users));
}

// ========== 4. تسجيل تاجر جديد ==========
async function registerMerchant() {
    const name = prompt('👤 الاسم الكامل:');
    const email = prompt('📧 البريد الإلكتروني:');
    const password = prompt('🔑 كلمة المرور:');
    const phone = prompt('📱 رقم الهاتف:');
    const telegram = prompt('📱 معرف تليجرام (مثال: @username):');
    const storeName = prompt('🏪 اسم المتجر:');

    if (!name || !email || !password || !phone || !storeName) {
        alert('❌ جميع الحقول مطلوبة');
        return;
    }

    // إنشاء حساب التاجر (في انتظار الموافقة)
    const newMerchant = {
        id: users.length + 1,
        name,
        email,
        password,
        phone,
        telegram: telegram || '@' + name,
        storeName,
        role: 'merchant_pending',
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    users.push(newMerchant);
    saveUsers();
    
    alert('📋 تم التسجيل... جاري إرسال طلب للمدير');
    
    // إرسال طلب للمدير في تليجرام
    const message = `
🆕 **طلب تاجر جديد**
━━━━━━━━━━━━
👤 الاسم: ${name}
🏪 المتجر: ${storeName}
📧 البريد: ${email}
📱 الهاتف: ${phone}
📱 تليجرام: ${telegram}

✅ للموافقة: ادخل لوحة التحكم
    `;

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.adminId,
                text: message
            })
        });
        alert('✅ تم إرسال طلبك للمدير، انتظر الموافقة');
    } catch (error) {
        alert('⚠️ تم التسجيل ولكن فشل إرسال الإشعار');
    }
}

// ========== 5. المدير يوافق على التاجر ==========
function approveMerchant() {
    // عرض قائمة التجار المنتظرين
    const pending = users.filter(u => u.role === 'merchant_pending');
    
    if (pending.length === 0) {
        alert('لا يوجد تجار منتظرين');
        return;
    }
    
    let list = 'قائمة التجار المنتظرين:\n';
    pending.forEach((m, i) => {
        list += `${i+1}. ${m.storeName} - ${m.name} (${m.email})\n`;
    });
    
    alert(list);
    const num = prompt('أدخل رقم التاجر للموافقة:');
    const index = parseInt(num) - 1;
    
    if (index >= 0 && index < pending.length) {
        const merchant = pending[index];
        merchant.role = 'merchant_approved';
        merchant.status = 'approved';
        merchant.approvedAt = new Date().toISOString();
        
        saveUsers();
        alert(`✅ تمت الموافقة على ${merchant.storeName}`);
    }
}

// ========== 6. تسجيل دخول ==========
function login() {
    const email = prompt('📧 البريد الإلكتروني:');
    const password = prompt('🔑 كلمة المرور:');
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        alert(`👋 مرحباً ${user.name} - ${user.role === 'merchant_approved' ? 'تاجر معتمد' : user.role}`);
        
        if (user.role === 'merchant_approved') {
            showMerchantMenu();
        } else if (user.role === 'admin') {
            showAdminMenu();
        }
    } else {
        alert('❌ بيانات غير صحيحة');
    }
}

// ========== 7. قائمة التاجر ==========
function showMerchantMenu() {
    while (true) {
        const choice = prompt(`
👨‍💼 قائمة التاجر ${currentUser.storeName}
━━━━━━━━━━━━━━━━
1️⃣ إضافة منتج جديد
2️⃣ عرض منتجاتي
3️⃣ تسجيل خروج
        `);
        
        if (choice === '1') {
            addProduct();
        } else if (choice === '2') {
            showMyProducts();
        } else if (choice === '3') {
            currentUser = null;
            localStorage.removeItem('current_user');
            break;
        }
    }
}

// ========== 8. إضافة منتج ==========
async function addProduct() {
    const name = prompt('📦 اسم المنتج:');
    const price = parseInt(prompt('💰 السعر (دج):'));
    const stock = parseInt(prompt('📊 الكمية:'));
    const category = prompt('🏷️ القسم (promo/spices/cosmetic/other):', 'spices');
    
    if (!name || !price || !stock) {
        alert('❌ بيانات ناقصة');
        return;
    }
    
    alert('⚠️ في التطبيق الحقيقي، سيتم رفع صورة هنا');
    
    // تجربة - استخدام رابط صورة افتراضي
    const product = {
        id: Date.now(),
        name,
        price,
        stock,
        category,
        merchantName: currentUser.storeName,
        merchantTelegram: currentUser.telegram,
        images: ['https://via.placeholder.com/300'],
        createdAt: new Date().toISOString()
    };
    
    products.push(product);
    localStorage.setItem('nardoo_products', JSON.stringify(products));
    
    // محاكاة إرسال إلى تليجرام
    alert(`📤 جاري إرسال المنتج إلى تليجرام...`);
    
    setTimeout(() => {
        alert(`✅ تم نشر المنتج في قناة تليجرام`);
    }, 2000);
}

// ========== 9. عرض منتجات التاجر ==========
function showMyProducts() {
    const myProducts = products.filter(p => p.merchantName === currentUser.storeName);
    
    if (myProducts.length === 0) {
        alert('📭 لا توجد منتجات');
        return;
    }
    
    let list = '📦 منتجاتي:\n━━━━━━━━━━\n';
    myProducts.forEach((p, i) => {
        list += `${i+1}. ${p.name} - ${p.price} دج - الكمية: ${p.stock}\n`;
    });
    
    alert(list);
}

// ========== 10. قائمة المدير ==========
function showAdminMenu() {
    while (true) {
        const choice = prompt(`
👑 قائمة المدير
━━━━━━━━━━━━
1️⃣ الموافقة على تجار
2️⃣ عرض كل المنتجات
3️⃣ تسجيل خروج
        `);
        
        if (choice === '1') {
            approveMerchant();
        } else if (choice === '2') {
            showAllProducts();
        } else if (choice === '3') {
            break;
        }
    }
}

// ========== 11. عرض كل المنتجات ==========
function showAllProducts() {
    if (products.length === 0) {
        alert('📭 لا توجد منتجات');
        return;
    }
    
    let list = '📦 جميع المنتجات:\n━━━━━━━━━━\n';
    products.forEach((p, i) => {
        list += `${i+1}. ${p.name} - ${p.price} دج - ${p.merchantName}\n`;
    });
    
    alert(list);
}

// ========== 12. القائمة الرئيسية ==========
function mainMenu() {
    while (true) {
        const choice = prompt(`
🛍️ ناردو برو - القائمة الرئيسية
━━━━━━━━━━━━━━━━━━
1️⃣ تسجيل الدخول
2️⃣ تسجيل كتاجر جديد
3️⃣ تصفح المنتجات
4️⃣ خروج
        `);
        
        if (choice === '1') {
            login();
        } else if (choice === '2') {
            registerMerchant();
        } else if (choice === '3') {
            browseProducts();
        } else if (choice === '4') {
            break;
        }
    }
}

// ========== 13. تصفح المنتجات ==========
function browseProducts() {
    if (products.length === 0) {
        alert('📭 لا توجد منتجات');
        return;
    }
    
    let list = '🛍️ المنتجات المتاحة:\n━━━━━━━━━━━━\n';
    products.forEach((p, i) => {
        list += `${i+1}. ${p.name} - ${p.price} دج - ${p.merchantName}\n`;
    });
    
    alert(list);
}

// ========== 14. بدء التشغيل ==========
window.onload = function() {
    // تحميل المنتجات
    const savedProducts = localStorage.getItem('nardoo_products');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
    }
    
    // تحميل المستخدم الحالي
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    console.log('✅ نظام تجربة التاجر جاهز');
    mainMenu();
};
