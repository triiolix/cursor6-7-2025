export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  lastModified: string;
  collaborators: string[];
}

export interface DocumentSummary {
  id: string;
  title: string;
  lastModified: string;
  createdAt: string;
}

export interface DocumentChange {
  documentId: string;
  content: string;
  operation: 'insert' | 'delete' | 'format' | 'update';
}

export interface CursorPosition {
  documentId: string;
  position: {
    index: number;
    length: number;
  };
}

export interface User {
  id: string;
  position?: {
    index: number;
    length: number;
  };
}