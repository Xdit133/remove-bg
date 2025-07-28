const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

const INPUT_DIR = path.resolve(__dirname, 'input');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const PYTHON_DIR = path.resolve(__dirname, 'python');

[INPUT_DIR, OUTPUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use('/output', express.static(OUTPUT_DIR));
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, INPUT_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const cleanupFiles = (filePaths) => {
    filePaths.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlink(file, err => {
                if (err) console.error(`Gagal menghapus file ${file}:`, err);
            });
        }
    });
};

function createApiEndpoint(apiPath, commandGenerator) {
    app.post(apiPath, upload.single('image'), (req, res) => {
        if (!req.file) {
            console.log(`[${new Date().toISOString()}] UPLOAD FAILED: File tidak ditemukan, IP: ${req.ip}`);
            return res.status(400).json({ error: 'File tidak ditemukan.' });
        }
        const inputPath = req.file.path;
        const fileName = path.parse(req.file.filename).name;
        const { outputPath, command } = commandGenerator(inputPath, fileName);

        console.log(`[${new Date().toISOString()}] UPLOAD: ${req.file.originalname}, saved as: ${inputPath}, IP: ${req.ip}`);

        exec(command, { cwd: PYTHON_DIR }, (err, stdout, stderr) => {
            if (err || (stderr && stderr.includes('ERROR'))) {
                console.log(`[${new Date().toISOString()}] ERROR Proses (${apiPath}): ${stderr || err}, User: ${req.ip}, File: ${inputPath}`);
                cleanupFiles([inputPath]);
                return res.status(500).json({ error: stderr || 'Gagal memproses gambar.' });
            }
            const resultUrl = `/output/${path.basename(outputPath)}`;
            console.log(`[${new Date().toISOString()}] SUCCESS ${apiPath}, User: ${req.ip}, File: ${inputPath} => ${resultUrl}`);
            res.json({ success: true, url: resultUrl });
            setTimeout(() => cleanupFiles([inputPath, outputPath]), 60000);
        });
    });
}

createApiEndpoint('/api/remove-bg', (inputPath, fileName) => {
    const outputPath = path.join(OUTPUT_DIR, `${fileName}_rmbg.png`);
    const command = `python remove_bg.py "${inputPath}" "${outputPath}"`;
    return { outputPath, command };
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});