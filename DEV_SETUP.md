# 🔧 Hướng dẫn Chạy Bot Local Dev + Railway Production

Hướng dẫn để chạy bot trên Railway (production) và local (dev) cùng lúc mà không bị conflict.

---

## 🎯 Vấn đề

Khi cả Railway và local đều dùng **polling**, cả 2 sẽ cùng nhận 1 message → Bot trả lời **2 lần** (duplicate).

**Giải pháp:**
- **Railway**: Dùng **webhook** (production)
- **Local**: Dùng **polling** (dev)

---

## 📋 Setup Local Dev (Polling Mode)

### 1. Cấu hình `.env` cho local

Đảm bảo `.env` **KHÔNG** có `USE_WEBHOOK=true`:

```env
TELEGRAM_TOKEN=your_token
OPENAI_API_KEY=your_key
CHANNEL_ID=@your_channel
ADMIN_USER_IDS=your_user_id
OPENAI_NEWS_MODEL=gpt-4.1-mini

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key

# KHÔNG set USE_WEBHOOK hoặc set = false
# USE_WEBHOOK=false
```

### 2. Chạy bot local

```bash
# Option 1: Dùng main.js (polling mode)
npm run dev

# Hoặc chạy trực tiếp
node main.js
```

Bot sẽ tự động dùng **polling mode** vì không có `USE_WEBHOOK=true`.

---

## 🚂 Setup Railway (Webhook Mode)

### 1. Tạo file `server.js` (đã có sẵn)

File `server.js` sẽ:
- Tạo Express server để nhận webhook
- Tự động setup webhook khi start
- Có health check endpoint

### 2. Cấu hình Railway Variables

Vào Railway Dashboard → **Variables**, thêm:

```env
USE_WEBHOOK=true
WEBHOOK_URL=https://your-app.railway.app/webhook
PORT=3000
```

**Lưu ý:**
- Railway tự động tạo public domain: `your-app.up.railway.app`
- Hoặc bạn có thể dùng custom domain
- `WEBHOOK_URL` phải là HTTPS (Railway tự động có HTTPS)

### 3. Cập nhật Railway Start Command

Vào Railway Dashboard → **Settings** → **Deploy**:

- **Start Command**: `node server.js` (thay vì `node index.js`)

Hoặc cập nhật `package.json` để Railway tự detect:

```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### 4. Deploy

Railway sẽ:
1. Build và deploy
2. Start Express server trên port 3000
3. Tự động set webhook khi server start
4. Bot nhận updates qua webhook endpoint

---

## 🔄 Workflow Development

### Khi develop local:

1. **Đảm bảo Railway đang chạy webhook** (không cần làm gì, Railway tự động)
2. **Chạy local với polling:**
   ```bash
   npm run dev
   ```
3. **Test commands trên Telegram** → Chỉ local bot sẽ phản hồi (vì Railway đang dùng webhook, không polling)

### Khi muốn test trên Railway:

1. **Tắt local bot** (Ctrl+C)
2. **Gửi message trên Telegram** → Railway bot sẽ phản hồi
3. **Xem logs trên Railway Dashboard** để debug

---

## 🐛 Troubleshooting

### Bot trả lời 2 lần

**Nguyên nhân:** Cả Railway và local đều đang polling

**Giải pháp:**
1. Kiểm tra Railway có set `USE_WEBHOOK=true` chưa
2. Kiểm tra Railway có chạy `server.js` chưa (không phải `main.js`)
3. Kiểm tra local `.env` không có `USE_WEBHOOK=true`

### Railway không nhận được updates

**Nguyên nhân:** Webhook chưa được set hoặc URL sai

**Giải pháp:**
1. Kiểm tra Railway logs → Xem có "Webhook configured" không
2. Kiểm tra `WEBHOOK_URL` đúng chưa
3. Test webhook endpoint: `curl https://your-app.railway.app/health`
4. Manual set webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.railway.app/webhook"
   ```

### Local không nhận được updates

**Nguyên nhân:** Railway đang dùng webhook, local không polling được

**Giải pháp:**
1. Đảm bảo Railway đã set webhook (check logs)
2. Local sẽ tự động dùng polling nếu không có `USE_WEBHOOK=true`
3. Nếu vẫn không được, xóa webhook tạm thời:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
   ```

### Muốn chạy cả 2 cùng lúc (không khuyến nghị)

Nếu bạn **thực sự** muốn chạy cả 2 cùng lúc để test:

1. **Tạo bot mới** trên Telegram (BotFather)
2. Dùng token khác cho local dev
3. Test trên 2 bot khác nhau

**Không khuyến nghị** vì sẽ confuse và tốn tài nguyên.

---

## 📝 Environment Variables Summary

### Local Dev (`.env`)
```env
# Không có USE_WEBHOOK hoặc USE_WEBHOOK=false
TELEGRAM_TOKEN=...
OPENAI_API_KEY=...
# ... các biến khác
```

### Railway (Variables)
```env
USE_WEBHOOK=true
WEBHOOK_URL=https://your-app.railway.app/webhook
PORT=3000
TELEGRAM_TOKEN=...
OPENAI_API_KEY=...
# ... các biến khác
```

---

## ✅ Checklist

### Local Dev
- [ ] `.env` không có `USE_WEBHOOK=true`
- [ ] Chạy `npm run dev` hoặc `node main.js`
- [ ] Bot phản hồi khi gửi message

### Railway Production
- [ ] Railway Variables có `USE_WEBHOOK=true`
- [ ] Railway Variables có `WEBHOOK_URL` đúng
- [ ] Railway Start Command là `node server.js`
- [ ] Railway logs hiển thị "Webhook configured"
- [ ] Test `/health` endpoint trả về `{"status":"ok"}`
- [ ] Bot phản hồi khi gửi message (sau khi tắt local)

---

## 🎯 Best Practices

1. **Luôn dùng webhook cho production** (Railway)
2. **Luôn dùng polling cho dev** (local)
3. **Không chạy cả 2 cùng lúc** với cùng 1 bot token
4. **Test trên Railway** trước khi merge code
5. **Xem logs** khi có vấn đề

---

**Chúc bạn develop mượt mà! 🚀**
