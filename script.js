// ========== ناردو - الإصدار النهائي الكامل ==========

// 1. إعدادات تلجرام
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890'
};

// 2. المتغيرات
let products = [];
let currentUser = null;

// 3. دالة إضافة منتج مع صورة (بنفس تنسيق صورتك)
async function addTestProduct() {
    // صورة منتج حقيقية
    const imageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500';
    
    // نفس التنسيق اللي ظهر في صورتك
    const message = `منتج جديد
الاسم: منتج تجريبي
السعر: 999 دج
القسم: promo
الكمية: 50
التاجر: تاجر تجريبي`;

    try {
        // إرسال الصورة مع النص
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                photo: imageUrl,
                caption: message
            })
        });
        
        const result = await response.json();
        console.log('✅ تم الإرسال:', result);
        return result.ok;
    } catch (error) {
        console.error('❌ خطأ:', error);
        return false;
    }
}

// 4. دالة جلب المنتجات مع الصور (مطورة)
async function getProducts() {
    try {
        console.log('🔍 جلب المنتجات من تلجرام...');
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        products = [];
        
        if (data.ok && data.result) {
            console.log(`📨 وجدنا ${data.result.length} تحديث`);
            
            for (const update of data.result) {
                const post = update.channel_post;
                if (!post) continue;
                
                // البحث عن الصور
                if (post.photo && post.photo.length > 0) {
                    const text = post.caption || '';
                    
                    // أي رسالة تحتوي على "منتج" نعتبرها منتج
                    if (text.includes('منتج') || text.includes('السعر')) {
                        console.log('✅ وجدنا منتج مع صورة');
                        
                        // جلب رابط الصورة
                        const fileId = post.photo[post.photo.length - 1].file_id;
                        const fileResponse = await fetch(
                            `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                        );
                        const fileData = await fileResponse.json();
                        
                        if (fileData.ok) {
                            const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                            
                            // استخراج البيانات (بنفس تنسيق صورتك)
                            let name = 'منتج';
                            let price = 0;
                            let category = 'promo';
                            let stock = 0;
                            let merchant = 'تاجر';
                            
                            const lines = text.split('\n');
                            lines.forEach(line => {
                                if (line.includes('الاسم:') || line.includes('اسم:')) {
                                    name = line.replace(/.*(الاسم:|اسم:)/, '').trim();
                                }
                                if (line.includes('السعر:')) {
                                    const match = line.match(/\d+/);
                                    if (match) price = parseInt(match[0]);
                                }
                                if (line.includes('القسم:')) {
                                    category = line.replace('القسم:', '').trim();
                                }
                                if (line.includes('الكمية:')) {
                                    const match = line.match(/\d+/);
                                    if (match) stock = parseInt(match[0]);
                                }
                                if (line.includes('التاجر:')) {
                                    merchant = line.replace('التاجر:', '').trim();
                                }
                                if (line.includes('التاريخ:')) {
                                    // تجاهل حقل التاريخ
                                }
                            });
                            
                            products.push({
                                id: post.message_id,
                                name: name,
                                price: price,
                                category: category,
                                stock: stock,
                                merchant: merchant,
                                image: imageUrl,
                                rating: 4.5,
                                date: new Date(post.date * 1000)
                            });
                        }
                    }
                }
            }
        }
        
        console.log(`📦 تم جلب ${products.length} منتج مع صور`);
        return products;
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        return [];
    }
}

// 5. عرض المنتجات بشكل احترافي
function showProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: #d4af37; margin-bottom: 20px;"></i>
                <h3 style="color: #d4af37; font-size: 28px;">لا توجد منتجات</h3>
                <p style="color: white; font-size: 18px;">اضغط على "إضافة منتج" للبدء</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(p => `
        <div class="product-card" style="background: #1a2f28; border: 2px solid #d4af37; border-radius: 25px; overflow: hidden; transition: all 0.3s;">
            <div style="position: relative; height: 250px;">
                <img src="${p.image}" style="width: 100%; height: 100%; object-fit: cover;" 
                     onerror="this.src='https://via.placeholder.com/300/d4af37/000000?text=نكهة+وجمال'">
                <span style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.8); color: #d4af37; padding: 5px 15px; border-radius: 25px; font-size: 12px;">
                    <i class="far fa-clock"></i> الآن
                </span>
            </div>
            <div style="padding: 20px;">
                <span style="background: #d4af37; color: #0a1a15; padding: 5px 15px; border-radius: 25px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 10px;">
                    ${p.category || 'برموسيو'}
                </span>
                <h3 style="color: #d4af37; font-size: 20px; margin: 10px 0;">${p.name}</h3>
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                    <i class="fas fa-store" style="color: #d4af37;"></i>
                    <span style="color: white;">${p.merchant}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 15px;">
                    ${'<i class="fas fa-star" style="color: #d4af37;"></i>'.repeat(Math.floor(p.rating))}
                    ${'<i class="far fa-star" style="color: #d4af37;"></i>'.repeat(5 - Math.floor(p.rating))}
                    <span style="color: #d4af37;">${p.rating}</span>
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #d4af37; margin-bottom: 15px;">
                    ${p.price} <small style="font-size: 14px;">دج</small>
                </div>
                <div style="background: rgba(74,222,128,0.2); color: #4ade80; padding: 5px 15px; border-radius: 25px; display: inline-block; margin-bottom: 15px;">
                    <i class="fas fa-check-circle"></i> متوفر (${p.stock})
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="addToCart(${p.id})" style="flex: 2; background: linear-gradient(135deg, #d4af37, #b38f2c); border: none; padding: 12px; border-radius: 30px; color: #0a1a15; font-weight: bold; cursor: pointer;">
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                    <button onclick="viewDetails(${p.id})" style="width: 50px; height: 50px; border-radius: 50%; background: transparent; border: 2px solid #d4af37; color: #d4af37; cursor: pointer;">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 6. دوال مساعدة
function addToCart(id) {
    alert('✅ تمت الإضافة للسلة');
}

function viewDetails(id) {
    alert('🔍 تفاصيل المنتج');
}

// 7. أزرار التحكم
function addControls() {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        gap: 15px;
        background: #0a1a15;
        padding: 15px;
        border-radius: 60px;
        border: 2px solid #d4af37;
        box-shadow: 0 10px 40px rgba(212,175,55,0.3);
    `;
    
    div.innerHTML = `
        <button onclick="addNewProduct()" style="background: #d4af37; color: #0a1a15; padding: 15px 35px; border: none; border-radius: 50px; font-weight: bold; font-size: 16px; cursor: pointer; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-plus-circle"></i> إضافة منتج
        </button>
        <button onclick="refreshProducts()" style="background: #2c5e4f; color: white; padding: 15px 35px; border: none; border-radius: 50px; font-weight: bold; font-size: 16px; cursor: pointer; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-sync-alt"></i> تحديث
        </button>
    `;
    
    document.body.appendChild(div);
}

// 8. دوال التشغيل
async function addNewProduct() {
    console.log('🚀 إضافة منتج جديد...');
    const success = await addTestProduct();
    if (success) {
        alert('✅ تم إرسال المنتج مع الصورة إلى تلجرام');
    } else {
        alert('❌ فشل الإرسال');
    }
}

async function refreshProducts() {
    console.log('🔄 تحديث المنتجات...');
    await getProducts();
    showProducts();
    alert(`✅ تم جلب ${products.length} منتج مع صور`);
}

// 9. تشغيل النظام
window.onload = function() {
    // إضافة الأزرار
    addControls();
    
    // جلب المنتجات أول مرة
    setTimeout(async () => {
        await getProducts();
        showProducts();
    }, 1000);
    
    // رسالة ترحيب
    console.log('🎉 نظام ناردو جاهز للعمل');
};
