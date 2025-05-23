# 🚀 EDA App Installation Guide

## Quick Start (Recommended)

### One-Command Install & Run

```bash
git clone https://github.com/yourusername/eda-app.git && cd eda-app && npm install && npm start
```

Then open http://localhost:3030 in your browser!

## Installation Options

### Option 1: Standard Installation (5 minutes)

1. **Prerequisites**
   - Node.js v14+ ([Download here](https://nodejs.org/))
   - Git ([Download here](https://git-scm.com/))

2. **Install Steps**
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/eda-app.git
   
   # Enter directory
   cd eda-app
   
   # Install dependencies
   npm install
   
   # Start the app
   npm start
   ```

3. **Access the App**
   - Open http://localhost:3030 in your browser
   - Modern Dashboard: http://localhost:3030/dashboard.html
   - Classic Interface: http://localhost:3030/index.html

### Option 2: Docker Installation (2 minutes)

```bash
# Using Docker Compose
docker-compose up

# Or using Docker directly
docker run -p 3030:3030 -v $(pwd)/uploads:/app/uploads yourusername/eda-app
```

### Option 3: One-Click Cloud Deploy

#### Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/eda-app)

#### Deploy to Netlify
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/eda-app)

#### Deploy to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/yourusername/eda-app)

### Option 4: Portable Version (No Installation)

1. Download the latest release ZIP
2. Extract to any folder
3. Double-click:
   - Windows: `start.bat`
   - Mac/Linux: `start.sh`

## 🔧 Configuration

### Change Port
```bash
PORT=8080 npm start
```

### Allow External Access
```bash
HOST=0.0.0.0 npm start
```

## 🐛 Troubleshooting

### "Port already in use"
```bash
# Kill process on port 3030
lsof -ti:3030 | xargs kill -9

# Or use different port
PORT=3031 npm start
```

### "Permission denied"
```bash
chmod +x start.sh
sudo npm start
```

### "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📱 Access from Mobile

1. Start with external access:
   ```bash
   HOST=0.0.0.0 npm start
   ```

2. Find your computer's IP:
   - Mac: `ifconfig | grep inet`
   - Windows: `ipconfig`
   - Linux: `ip addr show`

3. On mobile, browse to:
   ```
   http://YOUR_IP:3030
   ```

## 🔒 Security Notes

- All data processing happens locally in your browser
- No data is sent to external servers
- Uploads are stored temporarily and can be deleted
- Safe to use with sensitive data

## 💡 Tips

- Use Chrome or Firefox for best performance
- Maximum CSV file size: 100MB
- For larger files, increase Node.js memory:
  ```bash
  node --max-old-space-size=4096 server.js
  ```

## 🆘 Need Help?

- Check the [FAQ](https://github.com/yourusername/eda-app/wiki/FAQ)
- Open an [issue](https://github.com/yourusername/eda-app/issues)
- Join our [Discord](https://discord.gg/eda-app)

---

Happy analyzing! 📊✨