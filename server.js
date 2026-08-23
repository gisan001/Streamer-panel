const express = require('express');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ====== CONFIGURATION ======
const ADMIN_PASSWORD = '1234';  // Change this!
const HWID_FILE = './allowed_hwids.json';
const EXE_DIR = './exe_files/';

// ====== CREATE FOLDERS & FILES ======
if (!fs.existsSync(EXE_DIR)) fs.mkdirSync(EXE_DIR, { recursive: true });
if (!fs.existsSync(HWID_FILE)) fs.writeFileSync(HWID_FILE, JSON.stringify([]));

// ====== MIDDLEWARE ======
app.use(session({
    secret: 'wasteland_secret_key',
    resave: false,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ====== FILE UPLOAD CONFIG ======
const storage = multer.diskStorage({
    destination: EXE_DIR,
    filename: (req, file, cb) => cb(null, 'aim.exe')
});
const upload = multer({ storage });

// ====== AUTH MIDDLEWARE ======
function isAuth(req, res, next) {
    if (req.session.loggedIn) return next();
    res.redirect('/login');
}

// ====== ROUTES ======

// Root redirect
app.get('/', (req, res) => res.redirect('/login'));

// ====== LOGIN PAGE ======
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔐 Admin Panel</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    color: #fff;
                }
                .login-box {
                    background: rgba(255,255,255,0.05);
                    backdrop-filter: blur(15px);
                    padding: 50px 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.8);
                    border: 1px solid rgba(255,255,255,0.1);
                    width: 380px;
                    text-align: center;
                }
                .login-box h1 {
                    font-size: 28px;
                    margin-bottom: 8px;
                    letter-spacing: 2px;
                }
                .login-box .sub {
                    color: #aaa;
                    margin-bottom: 30px;
                    font-size: 14px;
                }
                .login-box input[type="password"] {
                    width: 100%;
                    padding: 14px 18px;
                    border: none;
                    border-radius: 30px;
                    background: rgba(255,255,255,0.08);
                    color: #fff;
                    font-size: 16px;
                    outline: 2px solid transparent;
                    transition: 0.3s;
                    margin-bottom: 20px;
                }
                .login-box input[type="password"]:focus {
                    outline: 2px solid #6c63ff;
                }
                .login-box button {
                    width: 100%;
                    padding: 14px;
                    border: none;
                    border-radius: 30px;
                    background: #6c63ff;
                    color: #fff;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: 0.3s;
                }
                .login-box button:hover {
                    background: #5a52e0;
                    transform: scale(1.02);
                }
                .error {
                    color: #ff6b6b;
                    margin-top: 15px;
                }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h1>🔐 WASTELAND</h1>
                <div class="sub">Streamer Panel • Access Required</div>
                <form method="POST" action="/login">
                    <input type="password" name="pass" placeholder="Enter Master Password" required />
                    <button type="submit">Unlock</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    if (req.body.pass === ADMIN_PASSWORD) {
        req.session.loggedIn = true;
        res.redirect('/admin');
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Access Denied</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; }
                .box { background: #16213e; padding: 40px; border-radius: 20px; text-align: center; }
                a { color: #6c63ff; text-decoration: none; }
            </style>
            </head>
            <body>
                <div class="box">
                    <h1>❌ Access Denied</h1>
                    <p>Invalid password.</p>
                    <a href="/login">← Try Again</a>
                </div>
            </body>
            </html>
        `);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ====== ADMIN DASHBOARD ======
app.get('/admin', isAuth, (req, res) => {
    const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
    const exeExists = fs.existsSync(path.join(EXE_DIR, 'aim.exe'));

    let listHtml = hwids.map((h, i) => `
        <div class="hwid-item">
            <span class="hwid-text">${h}</span>
            <form method="POST" action="/remove" style="display:inline;">
                <input type="hidden" name="index" value="${i}" />
                <button type="submit" class="remove-btn">✕ Remove</button>
            </form>
        </div>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🎮 Streamer Panel</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', sans-serif;
                    background: #0b0b1a;
                    color: #e0e0e0;
                    padding: 30px;
                }
                .container {
                    max-width: 900px;
                    margin: auto;
                    background: #15152a;
                    padding: 40px;
                    border-radius: 24px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.9);
                    border: 1px solid #2a2a4a;
                }
                h1 {
                    font-size: 32px;
                    color: #6c63ff;
                    letter-spacing: 2px;
                }
                .sub {
                    color: #888;
                    margin-bottom: 30px;
                }
                .section {
                    background: #1e1e38;
                    padding: 20px;
                    border-radius: 16px;
                    margin-bottom: 25px;
                    border-left: 4px solid #6c63ff;
                }
                .section h2 {
                    font-size: 20px;
                    margin-bottom: 15px;
                    color: #c0c0ff;
                }
                input[type="file"], input[type="text"] {
                    padding: 10px 16px;
                    border: none;
                    border-radius: 30px;
                    background: #2a2a4a;
                    color: #fff;
                    font-size: 14px;
                    width: 60%;
                    margin-right: 12px;
                    outline: 2px solid transparent;
                    transition: 0.3s;
                }
                input[type="file"] { width: auto; }
                input:focus {
                    outline: 2px solid #6c63ff;
                }
                .btn {
                    padding: 10px 28px;
                    border: none;
                    border-radius: 30px;
                    background: #6c63ff;
                    color: #fff;
                    font-weight: bold;
                    cursor: pointer;
                    transition: 0.3s;
                }
                .btn:hover {
                    background: #5a52e0;
                    transform: scale(1.02);
                }
                .btn-danger {
                    background: #e74c3c;
                }
                .btn-danger:hover {
                    background: #c0392b;
                }
                .status {
                    display: inline-block;
                    padding: 4px 14px;
                    border-radius: 30px;
                    font-size: 13px;
                    font-weight: bold;
                }
                .status.on { background: #2ecc71; color: #fff; }
                .status.off { background: #e74c3c; color: #fff; }
                .hwid-item {
                    background: #2a2a4a;
                    padding: 12px 18px;
                    border-radius: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                .hwid-text {
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    color: #b0b0ff;
                }
                .remove-btn {
                    background: #e74c3c;
                    border: none;
                    color: #fff;
                    padding: 5px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: 0.3s;
                }
                .remove-btn:hover {
                    background: #c0392b;
                }
                .top-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }
                .logout {
                    color: #888;
                    text-decoration: none;
                    padding: 8px 20px;
                    border: 1px solid #444;
                    border-radius: 30px;
                    transition: 0.3s;
                }
                .logout:hover {
                    border-color: #6c63ff;
                    color: #6c63ff;
                }
                .empty {
                    color: #666;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="top-bar">
                    <div>
                        <h1>🎮 Streamer Panel</h1>
                        <div class="sub">HWID Control • Remote Management</div>
                    </div>
                    <a href="/logout" class="logout">🚪 Logout</a>
                </div>

                <!-- Upload Section -->
                <div class="section">
                    <h2>📤 Upload aim.exe</h2>
                    <form method="POST" action="/upload" enctype="multipart/form-data">
                        <input type="file" name="exe" accept=".exe" required />
                        <button type="submit" class="btn">⬆ Upload</button>
                    </form>
                    <p style="margin-top:12px;">
                        Status: <span class="status ${exeExists ? 'on' : 'off'}">${exeExists ? '✅ Uploaded' : '❌ Missing'}</span>
                    </p>
                </div>

                <!-- Add HWID -->
                <div class="section">
                    <h2>➕ Add HWID</h2>
                    <form method="POST" action="/add">
                        <input type="text" name="hwid" placeholder="e.g. 1234-ABCD-5678" required />
                        <button type="submit" class="btn">Add</button>
                    </form>
                </div>

                <!-- HWID List -->
                <div class="section">
                    <h2>📋 Authorized HWIDs (${hwids.length})</h2>
                    ${listHtml || '<div class="empty">No HWIDs added yet.</div>'}
                </div>
            </div>
        </body>
        </html>
    `);
});

// ====== ACTIONS ======
app.post('/upload', isAuth, upload.single('exe'), (req, res) => {
    res.redirect('/admin');
});

app.post('/add', isAuth, (req, res) => {
    try {
        const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
        const newHwid = req.body.hwid.trim();
        if (newHwid && !hwids.includes(newHwid)) {
            hwids.push(newHwid);
            fs.writeFileSync(HWID_FILE, JSON.stringify(hwids, null, 2));
        }
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error adding HWID');
    }
});

app.post('/remove', isAuth, (req, res) => {
    try {
        const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
        const index = parseInt(req.body.index);
        if (!isNaN(index) && index >= 0 && index < hwids.length) {
            hwids.splice(index, 1);
            fs.writeFileSync(HWID_FILE, JSON.stringify(hwids, null, 2));
        }
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error removing HWID');
    }
});

// ====== ✅ FIXED /exe ROUTE ======
app.get('/exe', (req, res) => {
    try {
        const hwid = req.query.hwid || '';
        if (!hwid) {
            return res.status(400).send('HWID required');
        }

        let hwids = [];
        try {
            hwids = JSON.parse(fs.readFileSync(HWID_FILE));
        } catch {
            hwids = [];
        }

        if (!hwids.includes(hwid)) {
            return res.status(403).send('HWID not authorized');
        }

        const exePath = path.join(__dirname, EXE_DIR, 'aim.exe');
        if (!fs.existsSync(exePath)) {
            return res.status(404).send('aim.exe not found');
        }

        // ✅ FIXED: absolute path with root
        res.sendFile(exePath);
    } catch (err) {
        console.error('Error in /exe:', err);
        res.status(500).send('Internal Server Error: ' + err.message);
    }
});

// ====== START SERVER ======
app.listen(PORT, () => {
    console.log(`✅ Panel running on port ${PORT}`);
    console.log(`🌐 URL: https://streamer-panel-q1s6.onrender.com`);
});
