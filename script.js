// ========== ناردو - تجربة رفع الصور من الهاتف ==========

// 1. إعدادات تلجرام
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890'
};

// 2. المتغيرات
let products = [];
let currentUser = { name: 'azer', role: 'admin' }; // دخول تلقائي

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
        
        if (data.ok) {
            const fileId = data.result.photo.pop().file_id;
            const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            
            return `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
        }
        return null;
    } catch (error) {
        console.error('خطأ:', error);
        return null;
    }
}

// 4. إضافة منتج
async function addProduct() {
    const name = document.getElementById('productName')?.value || 'منتج';
    const price = document.getElementById('productPrice')?.value || 100;
    const imageFile = document.getElementById('productImages')?.files[0];
    
    if (!imageFile) {
        alert('الرجاء اختيار صورة');
        return;
    }
    
    alert('جاري رفع الصورة...');
    const imageUrl = await uploadImage(imageFile);
    
    if (imageUrl) {
        alert('✅ تم رفع الصورة بنجاح!\n' + imageUrl);
        console.log('رابط الصورة:', imageUrl);
        
        // إرسال رسالة المنتج
        const message = `منتج جديد\nالاسم: ${name}\nالسعر: ${price} دج\nالتاجر: azer`;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message
            })
        });
        
        alert('✅ تم إضافة المنتج');
    } else {
        alert('❌ فشل رفع الصورة');
    }
}

// 5. جلب المنتجات من القناة
async function loadProducts() {
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
                text: update.channel_post.caption || 'منتج'
            });
        }
    }
    
    displayProducts();
}

// 6. عرض المنتجات
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px;">لا توجد منتجات</div>';
        return;
    }
    
    container.innerHTML = products.map(p => `
        <div style="background:#1a2f28; border:2px solid #d4af37; border-radius:20px; overflow:hidden; margin:10px;">
            <img src="${p.image}" style="width:100%; height:200px; object-fit:cover;">
            <div style="padding:15px;">
                <h3 style="color:#d4af37;">${p.text.substring(0, 30)}</h3>
            </div>
        </div>
    `).join('');
}

// 7. أزرار التحكم
function addControls() {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; gap:10px; background:#0a1a15; padding:10px; border-radius:50px; border:2px solid #d4af37;';
    
    div.innerHTML = `
        <button onclick="document.getElementById('fileInput').click()" style="background:#d4af37; color:black; padding:15px 30px; border:none; border-radius:50px;">📸 اختر صورة</button>
        <button onclick="addProduct()" style="background:#2c5e4f; color:white; padding:15px 30px; border:none; border-radius:50px;">💾 حفظ المنتج</button>
        <button onclick="loadProducts()" style="background:#3498db; color:white; padding:15px 30px; border:none; border-radius:50px;">🔄 تحديث</button>
    `;
    
    document.body.appendChild(div);
    
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'fileInput';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = (e) => alert('✅ تم اختيار: ' + e.target.files[0].name);
    document.body.appendChild(input);
}

// 8. تشغيل
window.onload = () => {
    addControls();
    loadProducts();
};
