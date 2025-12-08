import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads folder yarat (yoxdursa)
const uploadsDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp + random number + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `image-${uniqueSuffix}${ext}`);
    }
});

// File filter - yalnız şəkillər
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Yalnız şəkil faylları (jpeg, jpg, png, gif, webp) yüklənə bilər'), false);
    }
};

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

export const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Şəkil faylı yüklənmədi'
            });
        }

        // File URL yarat
        const fileUrl = `/uploads/images/${req.file.filename}`;

        return res.status(200).json({
            success: true,
            message: 'Şəkil uğurla yükləndi',
            data: {
                url: fileUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('uploadImage error', error);
        return res.status(500).json({
            success: false,
            message: 'Şəkil yüklənərkən xəta baş verdi'
        });
    }
};

