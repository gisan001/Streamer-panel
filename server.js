const express = require('express');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = 'gisan123#';
const HWID_FILE = './allowed_hwids.json';
const EXE_DIR = './exe_files/';

if (!fs.existsSync(EXE_DIR)) fs.mkdirSync(EXE_DIR);
if (!fs.existsSync(HWID_FILE)) fs.writeFileSync(HWID_FILE, JSON.stringify([]));

app.use(session({ secret: 'wasteland_secret', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const storage = multer.diskStorage({
    destination: EXE_DIR,
    filename: (req, file, cb) => cb(null, 'aim.exe')
});
const upload = multer({ storage });

function isAuth(req, res, next) {
    if (req.session.loggedIn) return next();
    res.redirect('/login');
}

// ====== রুট পেজ - এটা যোগ করুন ======
app.get('/', (req, res) => {
    res.redirect('/login');
});

// ====== লগইন ======
app.get('/login', (req, res) => {
    res.send(`
        <h2>🔐 পাসওয়ার্ড দিন</h2>
        <form method="POST" action="/login">
            <input type="password" name="pass" placeholder="পাসওয়ার্ড" />
            <button type="submit">ঢুকুন</button>
        </form>
    `);
});

app.post('/login', (req, res) => {
    if (req.body.pass === ADMIN_PASSWORD) {
        req.session.loggedIn = true;
        res.redirect('/admin');
    } else {
        res.send('ভুল পাসওয়ার্ড। <a href="/login">আবার চেষ্টা করুন</a>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/admin', isAuth, (req, res) => {
    const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
    const exeExists = fs.existsSync(path.join(EXE_DIR, 'aim.exe'));

    let listHtml = hwids.map((h, i) => `
        <li>
            ${h}
            <form method="POST" action="/remove" style="display:inline;">
                <input type="hidden" name="index" value="${i}" />
                <button type="submit">🗑️ রিমুভ</button>
            </form>
        </li>
    `).join('');

    res.send(`
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
        <ul>${listHtml || '<li>কোনো HWID যোগ করা হয়নি</li>'}</ul>
    `);
});

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

app.get('/exe', (req, res) => {
    const hwid = req.query.hwid || '';
    const hwids = JSON.parse(fs.readFileSync(HWID_FILE));
    if (!hwids.includes(hwid)) {
        return res.status(403).send('HWID ম্যাচ করে না');
    }
    const exePath = path.join(EXE_DIR, 'aim.exe');
    if (!fs.existsSync(exePath)) return res.status(404).send('aim.exe পাওয়া যায়নি');
    res.sendFile(exePath);
});

app.listen(PORT, () => {
    console.log(`✅ প্যানেল চালু হয়েছে on port ${PORT}`);
});
