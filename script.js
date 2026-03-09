// ========== ناردو - تجربة رفع الصور من الهاتف (نسخة مبسطة) ==========

// 1. إعدادات تلجرام
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890'
};

// 2. المتغيرات
let products = [];

// 3. رفع الصورة للقناة
async function uploadImage(imageFile) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('photo', imageFile);
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('رد التلجرام:', data);
        
        if (data.ok) {
            const fileId = data.result.photo.pop().file_id;
            const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            
            const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
            alert('✅ تم رفع الصورة بنجاح');
            return imageUrl;
        } else {
            alert('❌ خطأ: ' + data.description);
            return null;
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('❌ فشل الاتصال بتلجرام');
        return null;
    }
}

// 4. إضافة منتج (بدون حقول)
async function addProduct() {
    const imageFile = document.getElementById('fileInput')?.files[0];
    
    if (!imageFile) {
        alert('الرجاء اختيار صورة أولاً');
        return;
    }
    
    alert('جاري رفع الصورة...');
    const imageUrl = await uploadImage(imageFile);
    
    if (imageUrl) {
        // إرسال رسالة المنتج
        const message = `منتج جديد من الهاتف`;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message
            })
        });
        
        alert('✅ تم إضافة المنتج بنجاح');
        
        // تفريغ اختيار الصورة
        document.getElementById('fileInput').value = '';
    }
}

// 5. جلب المنتجات من القناة
async function loadProducts() {
    alert('جاري تحميل المنتجات...');
    
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
    const data = await res.json();
    
    products = [];
    
    for (const update of data.result || []) {
        if (update.channel_post?.photo) {
            const fileId = update.channel_post.photo.pop().file_id;
            const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            
            products.push({
                id: update.channel_post.message_id,
                image: `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`,
                date: new Date(update.channel_post.date * 1000).toLocaleString()
            });
        }
    }
    
    displayProducts();
    alert(`✅ تم تحميل ${products.length} منتج`);
}

// 6. عرض المنتجات
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px; color:white;">لا توجد منتجات</div>';
        return;
    }
    
    container.innerHTML = products.map(p => `
        <div style="background:#1a2f28; border:2px solid #d4af37; border-radius:20px; overflow:hidden; margin:10px;">
            <img src="${p.image}" style="width:100%; height:200px; object-fit:cover;">
            <div style="padding:10px; text-align:center; color:#d4af37;">
                <small>${p.date}</small>
            </div>
        </div>
    `).join('');
}

// 7. أزرار التحكم
function addControls() {
    // حاوية الأزرار
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; gap:10px; background:#0a1a15; padding:15px; border-radius:60px; border:2px solid #d4af37;';
    
    div.innerHTML = `
        <button onclick="document.getElementById('fileInput').click()" style="background:#d4af37; color:black; padding:15px 25px; border:none; border-radius:50px; font-weight:bold; cursor:pointer;">
            📸 اختيار صورة
        </button>
        <button onclick="addProduct()" style="background:#2c5e4f; color:white; padding:15px 25px; border:none; border-radius:50px; font-weight:bold; cursor:pointer;">
            💾 رفع الصورة
        </button>
        <button onclick="loadProducts()" style="background:#3498db; color:white; padding:15px 25px; border:none; border-radius:50px; font-weight:bold; cursor:pointer;">
            🔄 تحديث
        </button>
    `;
    
    document.body.appendChild(div);
    
    // حقل اختيار الصورة
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'fileInput';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = (e) => {
        if (e.target.files[0]) {
            alert('✅ تم اختيار: ' + e.target.files[0].name);
        }
    };
    document.body.appendChild(input);
}

// 8. تشغيل
window.onload = () => {
    addControls();
    loadProducts();
};
