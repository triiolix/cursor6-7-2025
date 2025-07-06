import { io, Socket } from 'socket.io-client';
import { DocumentChange, CursorPosition } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private readonly url: string;

  constructor() {
    this.url = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
  }

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.url);
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinDocument(documentId: string): void {
    if (this.socket) {
      this.socket.emit('join-document', documentId);
    }
  }

  sendDocumentChange(change: DocumentChange): void {
    if (this.socket) {
      this.socket.emit('document-change', change);
    }
  }

  sendCursorPosition(position: CursorPosition): void {
    if (this.socket) {
      this.socket.emit('cursor-position', position);
    }
  }

  onDocumentUpdate(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('document-update', callback);
    }
  }

  onCursorUpdate(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('cursor-update', callback);
    }
  }

  onUserJoined(callback: (userId: string) => void): void {
    if (this.socket) {
      this.socket.on('user-joined', callback);
    }
  }

  onUserLeft(callback: (userId: string) => void): void {
    if (this.socket) {
      this.socket.on('user-left', callback);
    }
  }

  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();