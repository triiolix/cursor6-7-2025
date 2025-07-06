import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { documentAPI } from '../services/api';
import socketService from '../services/socket';
import { Document } from '../types';

const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
  const quillRef = useRef<ReactQuill>(null);
  const lastSavedContent = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Quill modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
    history: {
      delay: 2000,
      maxStack: 500,
      userOnly: true
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  // Initialize socket connection
  useEffect(() => {
    const socket = socketService.connect();
    
    socket.on('connect', () => {
      setIsConnected(true);
      if (id && id !== 'new') {
        socketService.joinDocument(id);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle real-time document updates
    socketService.onDocumentUpdate((data) => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        quill.setContents(JSON.parse(data.content), 'silent');
      }
    });

    // Handle user join/leave
    socketService.onUserJoined((userId) => {
      setActiveUsers(prev => new Set([...prev, userId]));
    });

    socketService.onUserLeft((userId) => {
      setActiveUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [id]);

  // Load document
  useEffect(() => {
    if (id === 'new') {
      createNewDocument();
    } else if (id) {
      loadDocument(id);
    }
  }, [id]);

  const createNewDocument = async () => {
    try {
      setLoading(true);
      const newDoc = await documentAPI.createDocument();
      navigate(`/document/${newDoc.id}`, { replace: true });
    } catch (err) {
      setError('Failed to create document');
      console.error('Error creating document:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocument = async (docId: string) => {
    try {
      setLoading(true);
      const doc = await documentAPI.getDocument(docId);
      setDocument(doc);
      lastSavedContent.current = doc.content;
      
      // Join socket room after loading document
      if (isConnected) {
        socketService.joinDocument(docId);
      }
    } catch (err) {
      setError('Failed to load document');
      console.error('Error loading document:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveDocument = useCallback(async (content: string, title?: string) => {
    if (!document?.id || content === lastSavedContent.current) return;

    try {
      setSaving(true);
      await documentAPI.updateDocument(document.id, { 
        content, 
        ...(title && { title }) 
      });
      lastSavedContent.current = content;
    } catch (err) {
      console.error('Error saving document:', err);
    } finally {
      setSaving(false);
    }
  }, [document?.id]);

  const handleContentChange = (content: string, delta: any, source: string) => {
    if (source === 'user' && document) {
      // Update local state
      setDocument(prev => prev ? { ...prev, content } : null);

      // Broadcast change to other users
      socketService.sendDocumentChange({
        documentId: document.id,
        content: JSON.stringify(quillRef.current?.getEditor().getContents()),
        operation: 'update'
      });

      // Auto-save with debounce
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(content);
      }, 1000);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (document) {
      setDocument(prev => prev ? { ...prev, title: newTitle } : null);
      saveDocument(document.content, newTitle);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-google-blue text-white px-4 py-2 rounded-lg hover:bg-google-blue-hover"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Document header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <input
              type="text"
              value={document.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xl font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded flex-1 max-w-md"
              placeholder="Untitled Document"
            />
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {saving && (
                <span className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-gray-300 border-t-google-blue rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </span>
              )}
              {!saving && (
                <span>All changes saved</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Active users */}
            {activeUsers.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{activeUsers.size} online</span>
                <div className="flex -space-x-1">
                  {Array.from(activeUsers).slice(0, 3).map((userId, index) => (
                    <div
                      key={userId}
                      className="w-6 h-6 bg-google-blue rounded-full border-2 border-white flex items-center justify-center"
                      style={{ zIndex: 10 - index }}
                    >
                      <span className="text-xs text-white font-medium">
                        {userId.slice(-2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={document.content}
          onChange={handleContentChange}
          modules={modules}
          formats={formats}
          placeholder="Start writing your document..."
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};

export default DocumentEditor;