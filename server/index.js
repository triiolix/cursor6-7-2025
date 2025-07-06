const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const DOCUMENTS_DIR = path.join(__dirname, 'documents');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure documents directory exists
fs.ensureDirSync(DOCUMENTS_DIR);

// In-memory store for active document sessions
const documentSessions = new Map();

// Document operations
class DocumentManager {
  static async createDocument(title = 'Untitled Document') {
    const id = uuidv4();
    const document = {
      id,
      title,
      content: '',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      collaborators: []
    };
    
    await this.saveDocument(document);
    return document;
  }

  static async getDocument(id) {
    try {
      const filePath = path.join(DOCUMENTS_DIR, `${id}.json`);
      const document = await fs.readJson(filePath);
      return document;
    } catch (error) {
      return null;
    }
  }

  static async saveDocument(document) {
    const filePath = path.join(DOCUMENTS_DIR, `${document.id}.json`);
    document.lastModified = new Date().toISOString();
    await fs.writeJson(filePath, document, { spaces: 2 });
  }

  static async getAllDocuments() {
    try {
      const files = await fs.readdir(DOCUMENTS_DIR);
      const documents = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(DOCUMENTS_DIR, file);
          const document = await fs.readJson(filePath);
          documents.push({
            id: document.id,
            title: document.title,
            lastModified: document.lastModified,
            createdAt: document.createdAt
          });
        }
      }
      
      return documents.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    } catch (error) {
      return [];
    }
  }

  static async updateDocument(id, updates) {
    const document = await this.getDocument(id);
    if (!document) return null;
    
    Object.assign(document, updates);
    await this.saveDocument(document);
    return document;
  }
}

// API Routes
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await DocumentManager.getAllDocuments();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { title } = req.body;
    const document = await DocumentManager.createDocument(title);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const document = await DocumentManager.getDocument(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

app.put('/api/documents/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const document = await DocumentManager.updateDocument(req.params.id, { title, content });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Socket.IO for real-time collaboration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-document', async (documentId) => {
    socket.join(documentId);
    
    // Track active sessions
    if (!documentSessions.has(documentId)) {
      documentSessions.set(documentId, new Set());
    }
    documentSessions.get(documentId).add(socket.id);

    // Notify others about new collaborator
    socket.to(documentId).emit('user-joined', socket.id);
    
    console.log(`User ${socket.id} joined document ${documentId}`);
  });

  socket.on('document-change', (data) => {
    const { documentId, content, operation } = data;
    
    // Broadcast change to all other users in the document
    socket.to(documentId).emit('document-update', {
      content,
      operation,
      userId: socket.id
    });
  });

  socket.on('cursor-position', (data) => {
    const { documentId, position } = data;
    
    // Broadcast cursor position to other users
    socket.to(documentId).emit('cursor-update', {
      userId: socket.id,
      position
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from all document sessions
    for (const [documentId, users] of documentSessions.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(documentId).emit('user-left', socket.id);
        
        if (users.size === 0) {
          documentSessions.delete(documentId);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});