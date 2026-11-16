import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Ensure public uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `img_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/upload - Single image upload
router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// POST /api/upload/multiple - Batch images upload (up to 8 photos for product listing)
router.post('/multiple', upload.array('images', 8), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const urls = files.map((f) => `${protocol}://${host}/uploads/${f.filename}`);

    res.json({
      success: true,
      urls,
      count: urls.length,
    });
  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

export default router;

