const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload single file to ImgBB
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const imgbbKey = process.env.IMGBB_API_KEY;
        if (!imgbbKey) {
            return res.status(500).json({ message: 'IMGBB_API_KEY sozlanmagan' });
        }

        const params = new URLSearchParams();
        params.append('image', req.file.buffer.toString('base64'));
        params.append('name', `upload-${Date.now()}`);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
            method: 'POST',
            body: params
        });
        const result = await response.json();

        if (!result.success) {
            console.error('ImgBB upload failed:', result.error?.message);
            return res.status(500).json({ message: 'Fayl yuklashda xatolik: ' + result.error?.message });
        }

        res.json({
            name: req.file.originalname,
            url: result.data.url,
            type: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
