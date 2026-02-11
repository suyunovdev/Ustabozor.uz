const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { getBucket } = require('../config/db');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Generate Firebase Storage download URL with token
const getFirebaseDownloadUrl = (bucketName, fileName, token) => {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
};

// Upload single file to Firebase Storage
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const bucket = getBucket();
        if (!bucket) {
            return res.status(500).json({ message: 'Firebase Storage is not configured' });
        }

        const token = crypto.randomUUID();
        const fileName = `uploads/${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`;
        const file = bucket.file(fileName);

        await file.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
                metadata: {
                    firebaseStorageDownloadTokens: token
                }
            }
        });

        const publicUrl = getFirebaseDownloadUrl(bucket.name, fileName, token);

        res.json({
            name: req.file.originalname,
            url: publicUrl,
            type: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
