import axios from 'axios';
import { Document, DocumentSummary } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const documentAPI = {
  // Get all documents
  getAllDocuments: async (): Promise<DocumentSummary[]> => {
    const response = await api.get('/documents');
    return response.data;
  },

  // Get a specific document
  getDocument: async (id: string): Promise<Document> => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  // Create a new document
  createDocument: async (title?: string): Promise<Document> => {
    const response = await api.post('/documents', { title });
    return response.data;
  },

  // Update a document
  updateDocument: async (id: string, updates: Partial<Document>): Promise<Document> => {
    const response = await api.put(`/documents/${id}`, updates);
    return response.data;
  },
};

export default api;