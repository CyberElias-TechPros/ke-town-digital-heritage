const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Base upload directory
const UPLOAD_BASE = path.join(__dirname, '../uploads');

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configure storage with category-based folders
const getCategoryStorage = (category) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(UPLOAD_BASE, category || 'general');
      ensureDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, cleanName);
    }
  });
};

// File type filters
const filters = {
  images: /jpeg|jpg|png|gif|webp|svg/,
  videos: /mp4|mov|avi|webm|mkv/,
  audio: /mp3|wav|ogg|m4a/,
  documents: /pdf|doc|docx|txt|xls|xlsx|ppt|pptx/,
  all: /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|mp3|wav|pdf|doc|docx|txt/
};

const createFilter = (allowedTypes) => (req, file, cb) => {
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('File type not allowed!'));
  }
};

// Create multer instances for different categories
const uploadImages = multer({
  storage: getCategoryStorage('images'),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for images
  fileFilter: createFilter(filters.images)
});

const uploadVideos = multer({
  storage: getCategoryStorage('videos'),
  limits: { fileSize: 100 * 1024 * 100 }, // 100MB for videos
  fileFilter: createFilter(filters.videos)
});

const uploadAudio = multer({
  storage: getCategoryStorage('audio'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for audio
  fileFilter: createFilter(filters.audio)
});

const uploadDocuments = multer({
  storage: getCategoryStorage('documents'),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB for documents
  fileFilter: createFilter(filters.documents)
});

const uploadGeneral = multer({
  storage: getCategoryStorage('general'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB default
  fileFilter: createFilter(filters.all)
});

// Upload single image
router.post('/image', authenticate, uploadImages.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }
    res.status(201).json({
      message: 'Image uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/images/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload single video
router.post('/video', authenticate, uploadVideos.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video uploaded.' });
    }
    res.status(201).json({
      message: 'Video uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/videos/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload audio
router.post('/audio', authenticate, uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio uploaded.' });
    }
    res.status(201).json({
      message: 'Audio uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/audio/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        duration: req.body.duration ? parseInt(req.body.duration) : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload document
router.post('/document', authenticate, uploadDocuments.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded.' });
    }
    res.status(201).json({
      message: 'Document uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/documents/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload single file (general)
router.post('/single', authenticate, uploadGeneral.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/general/${req.file.filename}`;

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple files
router.post('/multiple', authenticate, uploadGeneral.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/general/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.status(201).json({
      message: `${files.length} files uploaded successfully`,
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete uploaded file
router.delete('/:filename', authenticate, requireAdmin, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Browse uploaded files (admin)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { category } = req.query;
    const uploadDir = category 
      ? path.join(UPLOAD_BASE, category)
      : UPLOAD_BASE;
    
    if (!fs.existsSync(uploadDir)) {
      return res.json({ categories: [], files: [] });
    }

    // Get categories
    const categories = fs.readdirSync(UPLOAD_BASE).filter((item) => {
      return fs.statSync(path.join(UPLOAD_BASE, item)).isDirectory();
    });

    // Get files in the directory
    const files = fs.readdirSync(uploadDir)
      .filter((item) => fs.statSync(path.join(uploadDir, item)).isFile())
      .map((filename) => {
        const filePath = path.join(uploadDir, filename);
        const stats = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        
        let type = 'general';
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) type = 'image';
        else if (['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes(ext)) type = 'video';
        else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) type = 'audio';
        else if (['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) type = 'document';
        
        return {
          filename,
          category: category || 'general',
          type,
          url: `/uploads/${category || 'general'}/${filename}`,
          size: stats.size,
          uploadedAt: stats.mtime
        };
      });

    res.json({ categories, files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get files by category (public)
router.get('/category/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const uploadDir = path.join(UPLOAD_BASE, type);
    
    if (!fs.existsSync(uploadDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(uploadDir)
      .filter((item) => fs.statSync(path.join(uploadDir, item)).isFile())
      .map((filename) => {
        const filePath = path.join(uploadDir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename,
          url: `/uploads/${type}/${filename}`,
          size: stats.size,
          uploadedAt: stats.mtime
        };
      });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
