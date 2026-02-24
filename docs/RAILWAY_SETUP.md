# 🚂 Hướng dẫn Setup Bot trên Railway

Railway là nền tảng hosting miễn phí (có giới hạn) cho Node.js apps, rất phù hợp cho Telegram bot vì:
- ✅ Hỗ trợ process chạy liên tục (cron jobs)
- ✅ Không giới hạn timeout
- ✅ Dễ deploy từ GitHub
- ✅ Có free tier ($5 credit/tháng)

---

## 📋 Bước 1: Chuẩn bị

### 1.1. Tạo tài khoản Railway
- Truy cập: https://railway.app
- Đăng ký bằng GitHub (khuyến nghị) hoặc email

### 1.2. Đảm bảo code đã commit lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

---

## 🚀 Bước 2: Deploy trên Railway

### 2.1. Tạo Project mới
1. Vào Railway Dashboard → **New Project**
2. Chọn **Deploy from GitHub repo**
3. Chọn repository của bạn
4. Railway sẽ tự detect Node.js và bắt đầu build

### 2.2. Cấu hình Environment Variables
Vào tab **Variables** trong project, thêm các biến sau:

```
TELEGRAM_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key
CHANNEL_ID=@your_channel_username
ADMIN_USER_IDS=your_telegram_user_id
OPENAI_NEWS_MODEL=gpt-4.1-mini
ALLOWED_USER_IDS= (optional, để trống nếu cho phép tất cả)
```

**Lưu ý:**
- `CHANNEL_ID`: Có thể dùng `@username` hoặc `-1001234567890` (chat ID số)
- `ADMIN_USER_IDS`: Lấy từ bot @userinfobot trên Telegram
- Railway sẽ tự restart khi bạn thay đổi variables

---

## ⚙️ Bước 3: Cấu hình Build & Start

### 3.1. Railway tự động detect
Railway sẽ tự động:
- Detect `package.json`
- Chạy `npm install`
- Chạy `npm start` (theo script trong package.json)

### 3.2. Kiểm tra logs
- Vào tab **Deployments** → Click vào deployment mới nhất
- Xem **Logs** để đảm bảo bot chạy OK
- Bạn sẽ thấy: `Bot is running (polling)...`

---

## 🔧 Bước 4: Cấu hình Nixpacks (nếu cần)

Nếu Railway không tự detect đúng, tạo file `nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm install"]

[start]
cmd = "node index.js"
```

Hoặc đơn giản hơn, đảm bảo `package.json` có:
```json
{
  "scripts": {
    "start": "node index.js"
  }
}
```

---

## 📁 Bước 5: Quản lý Database (SQLite)

### 5.1. Persistent Storage
Railway có **ephemeral storage** - data sẽ mất khi redeploy. Để giữ database:

**Option 1: Dùng Railway Volume (khuyến nghị)**
1. Vào **Settings** → **New Volume**
2. Mount path: `/app/data`
3. Database sẽ được lưu tại: `/app/data/posts.db`

**Option 2: Dùng Railway PostgreSQL (nếu muốn scale)**
- Tạo PostgreSQL service trong Railway
- Cập nhật code để dùng PostgreSQL thay vì SQLite

### 5.2. Kiểm tra Database
Database file sẽ được tạo tự động tại `data/posts.db` khi bot chạy lần đầu.

---

## 🔍 Bước 6: Kiểm tra Bot hoạt động

### 6.1. Test commands
1. Mở Telegram, tìm bot của bạn
2. Gửi `/help` → Kiểm tra bot phản hồi
3. Gửi `/post` (nếu là admin) → Kiểm tra post lên channel

### 6.2. Kiểm tra Cron Job
- Bot sẽ tự động post tin lúc **8:00 sáng** mỗi ngày (theo timezone của server)
- Railway server thường ở UTC, nên có thể cần điều chỉnh cron expression

**Để đổi timezone:**
Sửa `utils/scheduler.js`:
```javascript
// Ví dụ: 8:00 sáng giờ Việt Nam (UTC+7) = 1:00 UTC
cron.schedule("0 1 * * *", async () => {
  // ...
});
```

---

## 🛠️ Bước 7: Monitoring & Debugging

### 7.1. Xem Logs
- Railway Dashboard → **Deployments** → **Logs**
- Logs real-time, có thể filter/search

### 7.2. Metrics
- Railway Dashboard → **Metrics**
- Xem CPU, Memory, Network usage

### 7.3. Restart Bot
- **Settings** → **Restart** (nếu bot bị lỗi)

---

## 🔐 Bước 8: Bảo mật

### 8.1. Không commit `.env`
Đảm bảo `.env` đã có trong `.gitignore`:
```
.env
data/
node_modules/
```

### 8.2. Railway Variables
- Tất cả secrets nên lưu trong Railway Variables (không hardcode trong code)
- Railway tự động inject vào `process.env`

---

## 💰 Pricing & Limits

### Free Tier
- **$5 credit/tháng** (đủ cho bot nhỏ)
- **500 hours runtime/tháng**
- **100GB bandwidth/tháng**

### Nếu hết free tier
- Upgrade lên **Hobby** ($5/tháng) hoặc **Pro** ($20/tháng)
- Hoặc chuyển sang Render.com (free tier tốt hơn)

---

## 🐛 Troubleshooting

### Bot không chạy
1. Kiểm tra logs trong Railway Dashboard
2. Đảm bảo tất cả environment variables đã set
3. Kiểm tra `package.json` có script `start`

### Database mất sau khi redeploy
- Dùng Railway Volume để persist data (xem Bước 5.1)

### Cron không chạy đúng giờ
- Kiểm tra timezone của server (Railway thường UTC)
- Điều chỉnh cron expression trong `scheduler.js`

### Bot không nhận được tin nhắn
- Kiểm tra `TELEGRAM_TOKEN` đúng chưa
- Kiểm tra bot đã được start chưa (xem logs)
- Thử restart bot trong Railway Dashboard

---

## 📚 Tài liệu tham khảo

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Node Telegram Bot API: https://github.com/yagop/node-telegram-bot-api

---

## ✅ Checklist

- [ ] Code đã push lên GitHub
- [ ] Tạo Railway project từ GitHub repo
- [ ] Set tất cả environment variables
- [ ] Bot chạy thành công (check logs)
- [ ] Test `/help` command
- [ ] Test `/post` command (admin)
- [ ] Setup Volume cho database (nếu cần)
- [ ] Điều chỉnh timezone cho cron job

---

**Chúc bạn deploy thành công! 🎉**
