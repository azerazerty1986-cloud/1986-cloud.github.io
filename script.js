// ========== ناردو - تجربة مصححة ==========

// 1. إعدادات تلجرام
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890'
};

// 2. المتغيرات
let products = [];

// 3. دالة إضافة منتج (مبسطة)
async function addTestProduct() {
    const message = `🟣 منتج جديد
📦 اسم: منتج تجريبي
💰 سعر: 999 دج
🏷️ قسم: promo
📊 كمية: 50
👤 تاجر: تاجر تجريبي`;

    try {
        // إرسال نص فقط (بدون صورة للتجربة)
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message
            })
        });
        
        const result = await response.json();
        console.log('✅ إرسال:', result);
        return result.ok;
    } catch (error) {
        console.error('❌ خطأ:', error);
        return false;
    }
}

// 4. دالة جلب المنتجات (مبسطة)
async function getProducts() {
    try {
        console.log('🔍 جلب من تلجرام...');
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        products = [];
        
        if (data.ok && data.result) {
            console.log(`📨 وجدنا ${data.result.length} تحديث`);
            
            for (const update of data.result) {
                const post = update.channel_post || update.message;
                if (!post) continue;
                
                const text = post.text || post.caption || '';
                
                // البحث عن رسائل المنتج (🟣)
                if (text.includes('🟣')) {
                    console.log('✅ وجدنا منتج:', text.substring(0, 50));
                    
                    // استخراج اسم المنتج
                    let name = 'منتج';
                    const nameMatch = text.match(/اسم:?\s*([^\n]+)/i) || 
                                     text.match(/منتج:?\s*([^\n]+)/i);
                    if (nameMatch) name = nameMatch[1].trim();
                    
                    // استخراج السعر
                    let price = 0;
                    const priceMatch = text.match(/سعر:?\s*(\d+)/i);
                    if (priceMatch) price = parseInt(priceMatch[1]);
                    
                    products.push({
                        id: post.message_id,
                        name: name,
                        price: price,
                        merchant: 'تاجر',
                        image: 'https://via.placeholder.com/300/d4af37/000000?text=منتج',
                        date: new Date(post.date * 1000)
                    });
                }
            }
        }
        
        console.log(`📦 تم جلب ${products.length} منتج`);
        return products;
        
    } catch (error) {
        console.error('❌ خطأ في الجلب:', error);
        return [];
    }
}

// 5. عرض المنتجات
function showProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <h3 style="color: #d4af37;">لا توجد منتجات</h3>
                <p style="color: white;">اضف منتج أولاً</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(p => `
        <div style="background: #1a2f28; border: 2px solid #d4af37; border-radius: 20px; overflow: hidden;">
            <img src="${p.image}" style="width: 100%; height: 200px; object-fit: cover;">
            <div style="padding: 20px;">
                <h3 style="color: #d4af37;">${p.name}</h3>
                <p style="color: white; font-size: 24px;">💰 ${p.price} دج</p>
                <p style="color: #f4e3b1;">👤 ${p.merchant}</p>
                <button style="background: #d4af37; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer;">
                    أضف للسلة
                </button>
            </div>
        </div>
    `).join('');
}

// 6. أزرار التحكم
function addControls() {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        gap: 10px;
        background: #0a1a15;
        padding: 10px;
        border-radius: 50px;
        border: 2px solid #d4af37;
    `;
    
    div.innerHTML = `
        <button onclick="testAdd()" style="background: #d4af37; color: black; padding: 15px 30px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer;">
            ➕ إضافة منتج
        </button>
        <button onclick="testRefresh()" style="background: #2c5e4f; color: white; padding: 15px 30px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer;">
            🔄 تحديث
        </button>
        <button onclick="testLog()" style="background: #3498db; color: white; padding: 15px 30px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer;">
            📋 عرض الـ Log
        </button>
    `;
    
    document.body.appendChild(div);
}

// 7. دوال الاختبار
async function testAdd() {
    console.log('🚀 إضافة منتج...');
    const success = await addTestProduct();
    if (success) {
        alert('✅ تم إرسال المنتج لتلجرام');
    } else {
        alert('❌ فشل الإرسال');
    }
}

async function testRefresh() {
    console.log('🔄 تحديث...');
    await getProducts();
    showProducts();
    alert(`✅ تم جلب ${products.length} منتج`);
}

async function testLog() {
    console.log('📋 جميع التحديثات:');
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
    const data = await response.json();
    console.log(data);
    alert('شاهد الـ Console (F12)');
}

// 8. تشغيل
window.onload = function() {
    addControls();
    setTimeout(async () => {
        await getProducts();
        showProducts();
    }, 1000);
};
