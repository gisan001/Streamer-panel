const express = require('express');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ====== আপনার পাসওয়ার্ড এখানে দিন ======
const ADMIN_PASSWORD = 'gisan';  // পরিবর্তন করুন

const HWID_FILE = './allowed_hwids.json';
const EXE_DIR = './exe_files/';

// ফোল্ডার ও ফাইল তৈরি
if (!fs.existsSync(EXE_DIR)) fs.mkdirSync(EXE_DIR);
if (!fs.existsSync(HWID_FILE)) fs.writeFileSync(HWID_FILE, JSON.stringify([]));

// মিডলওয়্যার
app.use(session({ 
    secret: 'wasteland_secret_key', 
    resave: false, 
    saveUninitialized: true 
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ফাইল আপলোড কনফিগার
const storage = multer.diskStorage({
    destination: EXE_DIR,
    filename: (req, file, cb) => cb(null, 'aim.exe')
});
const upload = multer({ storage });

// অথেন্টিকেশন মিডলওয়্যার
function isAuth(req, res, next) {
    if (req.session.loggedIn) return next();
    res.redirect('/login');
}

// ====== রুট পেজ ======
app.get('/', (req, res) => {
    res.redirect('/login');
});

// ====== লগইন ======
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔐 লগইন</title>
            <style>
                body { font-family: Arial; background: #1a1a2e; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .box { background: #16213e; padding: 40px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,255,0,0.2); }
                input { padding: 10px; width: 200px; border: none; border-radius: 5px; }
                button { padding: 10px 20px; background: #0f3460; color: #fff; border: none; border-radius: 5px; cursor: pointer; }
                button:hover { background: #1a4a7a; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>🔐 পাসওয়ার্ড দিন</h2>
                <form method="POST" action="/login">
                    <input type="password" name="pass" placeholder="পাসওয়ার্ড" required />
                    <br><br>
                    <button type="submit">ঢুকুন</button>
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
            <h2>❌ ভুল পাসওয়ার্ড</h2>
            <a href="/login">আবার চেষ্টা করুন</a>
        `);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ====== অ্যাডমিন প্যানেল ======
app.get('/admin', isAuth, (req, res) => {
    const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
    const exeExists = fs.existsSync(path.join(EXE_DIR, 'aim.exe'));

    let listHtml = hwids.map((h, i) => `
        <li style="margin: 10px 0; padding: 10px; background: #0f3460; border-radius: 5px;">
            <span style="font-weight: bold;">${h}</span>
            <form method="POST" action="/remove" style="display:inline; margin-left: 15px;">
                <input type="hidden" name="index" value="${i}" />
                <button type="submit" style="background: #e94560; border: none; color: #fff; padding: 5px 15px; border-radius: 3px; cursor: pointer;">🗑️ রিমুভ</button>
            </form>
        </li>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🎮 স্ট্রিমার প্যানেল</title>
            <style>
                body { font-family: Arial; background: #1a1a2e; color: #fff; padding: 20px; }
                .container { max-width: 800px; margin: auto; background: #16213e; padding: 30px; border-radius: 10px; }
                h1, h2 { color: #0f3460; }
                button { background: #0f3460; color: #fff; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer; }
                button:hover { background: #1a4a7a; }
                input[type="file"], input[type="text"] { padding: 8px; border-radius: 5px; border: none; width: 60%; }
                ul { list-style: none; padding: 0; }
                hr { border: 1px solid #0f3460; }
                a { color: #e94560; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎮 স্ট্রিমার প্যানেল</h1>
                <p><a href="/logout">🚪 লগআউট</a></p>
                <hr/>

                <h2>📤 নতুন aim.exe আপলোড করুন</h2>
                <form method="POST" action="/upload" enctype="multipart/form-data">
                    <input type="file" name="exe" accept=".exe" required />
                    <button type="submit">আপলোড করুন</button>
                </form>
                <p>বর্তমান EXE: ${exeExists ? '✅ আছে' : '❌ নেই'}</p>
                <hr/>

                <h2>➕ নতুন HWID যোগ করুন</h2>
                <form method="POST" action="/add">
                    <input type="text" name="hwid" placeholder="যেমন: 1234-ABCD-5678" required />
                    <button type="submit">যোগ করুন</button>
                </form>
                <hr/>

                <h2>📋 অনুমোদিত HWID তালিকা (${hwids.length}টি)</h2>
                <ul>${listHtml || '<li style="color: #888;">কোনো HWID যোগ করা হয়নি</li>'}</ul>
            </div>
        </body>
        </html>
    `);
});

// ====== অ্যাকশন ======
app.post('/upload', isAuth, upload.single('exe'), (req, res) => {
    res.redirect('/admin');
});

app.post('/add', isAuth, (req, res) => {
    const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
    const newHwid = req.body.hwid.trim();
    if (newHwid && !hwids.includes(newHwid)) {
        hwids.push(newHwid);
        fs.writeFileSync(HWID_FILE, JSON.stringify(hwids, null, 2));
    }
    res.redirect('/admin');
});

app.post('/remove', isAuth, (req, res) => {
    const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
    const index = parseInt(req.body.index);
    if (!isNaN(index) && index >= 0 && index < hwids.length) {
        hwids.splice(index, 1);
        fs.writeFileSync(HWID_FILE, JSON.stringify(hwids, null, 2));
    }
    res.redirect('/admin');
});

// ====== পেলোড ডাউনলোড API (HWID চেক) ======
app.get('/exe', (req, res) => {
    const hwid = req.query.hwid || '';
    const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
    if (!hwids.includes(hwid)) {
        return res.status(403).send('❌ HWID ম্যাচ করে না');
    }
    const exePath = path.join(EXE_DIR, 'aim.exe');
    if (!fs.existsSync(exePath)) {
        return res.status(404).send('❌ aim.exe পাওয়া যায়নি');
    }
    res.sendFile(exePath);
});

// ====== সার্ভার চালু ======
app.listen(PORT, () => {
    console.log(`✅ প্যানেল চালু হয়েছে on port ${PORT}`);
    console.log(`🌐 URL: https://streamer-panel-q1s6.onrender.com`);
});
