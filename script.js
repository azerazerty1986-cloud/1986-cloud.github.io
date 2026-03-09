// ========== تجربة ناردو - الفكرة 1 ==========
// إضافة منتج ← يرسل لتلجرام ← يرجع يظهر في المتجر

// 1. إعدادات تلجرام
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890'
};

// 2. المتغيرات
let products = [];

// 3. دالة إضافة منتج للتلجرام
async function testAddProduct() {
    const product = {
        name: 'منتج تجريبي',
        price: 999,
        category: 'promo',
        stock: 50,
        merchantName: 'تاجر تجريبي',
        imageUrl: 'https://via.placeholder.com/500/2c5e4f/ffffff?text=نكهة+وجمال'
    };

    const message = `
🟣 *منتج جديد*
📦 ${product.name}
💰 ${product.price} دج
🏷️ ${product.category}
📊 ${product.stock}
👤 ${product.merchantName}
    `;

    try {
        // إرسال الصورة
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                photo: product.imageUrl,
                caption: message.substring(0, 200)
            })
        });

        // إرسال التفاصيل
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message + '\n✅ تمت الإضافة'
            })
        });

        console.log('✅ تم الإرسال');
        return true;
    } catch (error) {
        console.error('❌ خطأ:', error);
        return false;
    }
}

// 4. دالة جلب المنتجات من تلجرام
async function testLoadProducts() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        products = [];
        
        for (const update of data.result) {
            const post = update.channel_post;
            if (!post) continue;
            
            // البحث عن الصور
            if (post.photo) {
                const fileId = post.photo[post.photo.length - 1].file_id;
                const file = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
                const fileData = await file.json();
                
                const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                
                // استخراج البيانات من النص
                const text = post.caption || '';
                if (text.includes('🟣')) {
                    products.push({
                        id: post.message_id,
                        name: 'منتج تجريبي',
                        price: 999,
                        image: imageUrl,
                        merchant: 'تاجر'
                    });
                }
            }
        }
        
        console.log(`✅ تم جلب ${products.length} منتج`);
        return products;
    } catch (error) {
        console.error('❌ خطأ في الجلب:', error);
        return [];
    }
}

// 5. دالة عرض المنتجات
function testDisplayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px;">لا توجد منتجات</div>';
        return;
    }
    
    container.innerHTML = products.map(p => `
        <div style="background: #1a2f28; border: 2px solid #d4af37; border-radius: 20px; padding: 15px; margin: 10px;">
            <img src="${p.image}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 15px;">
            <h3 style="color: #d4af37;">${p.name}</h3>
            <p style="color: white;">💰 ${p.price} دج</p>
            <p style="color: #f4e3b1;">👤 ${p.merchant}</p>
            <button style="background: #d4af37; border: none; padding: 10px; border-radius: 10px; cursor: pointer;">
                أضف للسلة
            </button>
        </div>
    `).join('');
}

// 6. أزرار التحكم
function addTestButtons() {
    const div = document.createElement('div');
    div.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; gap: 10px;';
    
    div.innerHTML = `
        <button onclick="runTest()" style="background: #d4af37; color: black; padding: 15px 30px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer;">
            🧪 إضافة منتج تجريبي
        </button>
        <button onclick="refreshTest()" style="background: #2c5e4f; color: white; padding: 15px 30px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer;">
            🔄 تحديث المنتجات
        </button>
    `;
    
    document.body.appendChild(div);
}

// 7. دوال التشغيل
async function runTest() {
    console.log('🚀 بدء تجربة إضافة منتج...');
    await testAddProduct();
    alert('✅ تم إرسال المنتج لتلجرام');
}

async function refreshTest() {
    console.log('🔄 جلب المنتجات من تلجرام...');
    await testLoadProducts();
    testDisplayProducts();
    alert(`✅ تم جلب ${products.length} منتج`);
}

// 8. تشغيل التجربة
window.onload = function() {
    // إضافة الأزرار
    addTestButtons();
    
    // جلب المنتجات أول مرة
    setTimeout(async () => {
        await testLoadProducts();
        testDisplayProducts();
    }, 1000);
};
