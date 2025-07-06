import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { documentAPI } from '../services/api';
import socketService from '../services/socket';
import { Document, User } from '../types';

const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Map<string, User>>(new Map());
  const [showComments, setShowComments] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedText, setSelectedText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser] = useState(`User-${Math.random().toString(36).substr(2, 6)}`);
  
  const quillRef = useRef<ReactQuill>(null);
  const lastSavedContent = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced Quill modules with working features
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
      delay: 1000,
      maxStack: 100,
      userOnly: true
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'code-block', 'color', 'background',
    'align', 'direction',
    'script', 'clean'
  ];

  // Initialize socket connection with enhanced features
  useEffect(() => {
    const socket = socketService.connect();
    
    // Check for dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    
    socket.on('connect', () => {
      setIsConnected(true);
      if (id && id !== 'new') {
        socketService.joinDocument(id);
        socket.emit('user-info', { 
          userId: currentUser, 
          userName: currentUser,
          color: generateUserColor(currentUser)
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Enhanced real-time document updates
    socketService.onDocumentUpdate((data) => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        const currentPosition = quill.getSelection();
        quill.setContents(JSON.parse(data.content || '{}'), 'silent');
        if (currentPosition) {
          quill.setSelection(currentPosition, 'silent');
        }
      }
    });

    // Enhanced user presence
    socket.on('user-joined', (userData) => {
      setActiveUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(userData.userId, userData);
        return newMap;
      });
    });

    socket.on('user-left', (userId) => {
      setActiveUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    });

    // Comments handling
    socket.on('comment-added', (comment) => {
      setComments(prev => [...prev, comment]);
    });

    socket.on('comment-deleted', (commentId) => {
      setComments(prev => prev.filter(c => c.id !== commentId));
    });

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [id, currentUser]);

  // Load document with enhanced features
  useEffect(() => {
    if (id === 'new') {
      createNewDocument();
    } else if (id) {
      loadDocument(id);
    }
  }, [id]);

  // Word count and page count tracking
  useEffect(() => {
    if (currentDocument?.content) {
      const text = currentDocument.content.replace(/<[^>]*>/g, '');
      setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
      setPageCount(Math.ceil(text.length / 2000) || 1);
    }
  }, [currentDocument?.content]);

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
      setCurrentDocument(doc);
      lastSavedContent.current = doc.content;
      
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
    if (!currentDocument?.id || content === lastSavedContent.current) return;

    try {
      setSaving(true);
      await documentAPI.updateDocument(currentDocument.id, { 
        content, 
        ...(title && { title }) 
      });
      lastSavedContent.current = content;
    } catch (err) {
      console.error('Error saving document:', err);
    } finally {
      setSaving(false);
    }
  }, [currentDocument?.id]);

  const handleContentChange = (content: string, delta: any, source: string, editor: any) => {
    if (source === 'user' && currentDocument) {
      setCurrentDocument(prev => prev ? { ...prev, content } : null);

      // Broadcast changes
      socketService.sendDocumentChange({
        documentId: currentDocument.id,
        content: JSON.stringify(editor.getContents()),
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

  const handleSelectionChange = (range: any, source: string) => {
    if (source === 'user' && range && currentDocument) {
      // Update selected text for formatting menu
      if (range.length > 0) {
        const quill = quillRef.current?.getEditor();
        if (quill) {
          setSelectedText(quill.getText(range.index, range.length));
        }
      }
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (currentDocument) {
      setCurrentDocument(prev => prev ? { ...prev, title: newTitle } : null);
      saveDocument(currentDocument.content, newTitle);
    }
  };

  const generateUserColor = (userId: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    return colors[userId.length % colors.length];
  };

  const addComment = () => {
    if (newComment.trim() && selectedText) {
      const comment = {
        id: Date.now().toString(),
        text: newComment,
        author: currentUser,
        selectedText: selectedText,
        timestamp: new Date().toISOString(),
        resolved: false
      };
      
      setComments(prev => [...prev, comment]);
      setNewComment('');
      
      // Broadcast comment
      socketService.getSocket()?.emit('add-comment', comment);
      showNotification('Comment added!', 'success');
    }
  };

  const exportDocument = (format: 'html' | 'txt') => {
    if (!currentDocument) return;
    
    const content = format === 'txt' 
      ? currentDocument.content.replace(/<[^>]*>/g, '') 
      : currentDocument.content;
    
    const element = window.document.createElement('a');
    const file = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${currentDocument.title}.${format}`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
    showNotification(`Document exported as ${format.toUpperCase()}!`, 'success');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Create a simple notification
    const notification = window.document.createElement('div');
    notification.textContent = message;
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    window.document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex justify-center items-center h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className="text-red-600 mb-4 text-xl">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  if (!currentDocument) return null;

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
    }`}>
      {/* Enhanced Header */}
      <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} px-4 py-2 shadow-sm`}>
        <div className="flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={() => navigate('/')}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <div className="flex flex-col">
              <input
                type="text"
                value={currentDocument.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={`text-lg font-medium bg-transparent border-none outline-none rounded px-2 py-1 transition-colors ${
                  darkMode ? 'text-white hover:bg-gray-700 focus:bg-gray-700' : 'text-gray-900 hover:bg-gray-100 focus:bg-gray-100'
                }`}
                placeholder="Untitled Document"
              />
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{saving ? 'Saving...' : 'All changes saved'}</span>
                <span>{wordCount} words</span>
                <span>{pageCount} pages</span>
              </div>
            </div>
          </div>

          {/* Center section - Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
              className={`px-2 py-1 rounded transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              -
            </button>
            <span className="text-sm min-w-[50px] text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
              className={`px-2 py-1 rounded transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              +
            </button>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-2">
            {/* Comments button */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`p-2 rounded-lg transition-colors relative ${
                showComments
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Comments"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {comments.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {comments.length}
                </span>
              )}
            </button>

            {/* Export dropdown */}
            <div className="relative group">
              <button
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10`}>
                <div className="py-1">
                  <button
                    onClick={() => exportDocument('html')}
                    className={`block px-4 py-2 text-sm w-full text-left ${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    Export as HTML
                  </button>
                  <button
                    onClick={() => exportDocument('txt')}
                    className={`block px-4 py-2 text-sm w-full text-left ${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    Export as Text
                  </button>
                </div>
              </div>
            </div>

            {/* Share button */}
            <button
              onClick={() => setShowSharing(!showSharing)}
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium`}
            >
              Share
            </button>

            {/* Active users */}
            {activeUsers.size > 0 && (
              <div className="flex items-center space-x-1">
                {Array.from(activeUsers.values()).slice(0, 3).map((user, index) => (
                  <div
                    key={user.id}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                    style={{ 
                      backgroundColor: user.color || generateUserColor(user.id),
                      zIndex: 10 - index,
                      marginLeft: index > 0 ? '-8px' : '0'
                    }}
                    title={user.userName || user.id}
                  >
                    {(user.userName || user.id).slice(0, 2).toUpperCase()}
                  </div>
                ))}
                {activeUsers.size > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white -ml-2">
                    +{activeUsers.size - 3}
                  </div>
                )}
              </div>
            )}

            {/* Connection status */}
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                 title={isConnected ? 'Connected' : 'Disconnected'} />

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          <div 
            className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center'
            }}
          >
            <div className="max-w-4xl mx-auto p-8">
              <div className={`min-h-full ${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-lg rounded-lg overflow-hidden`}>
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={currentDocument.content}
                  onChange={handleContentChange}
                  onSelectionChange={handleSelectionChange}
                  modules={modules}
                  formats={formats}
                  placeholder="Start writing your document..."
                  className={`${darkMode ? 'dark-editor' : ''}`}
                  style={{ border: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Comments Sidebar */}
        {showComments && (
          <div className={`w-80 border-l ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex flex-col`}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg">Comments</h3>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{comment.author}</div>
                      <div className="text-xs text-gray-500 mb-2">
                        {new Date(comment.timestamp).toLocaleString()}
                      </div>
                      <div className="text-sm mb-2 italic">
                        "{comment.selectedText}"
                      </div>
                      <div className="text-sm">{comment.text}</div>
                    </div>
                    <button
                      onClick={() => setComments(prev => prev.filter(c => c.id !== comment.id))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedText && (
              <div className="p-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">
                  Selected: "{selectedText}"
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className={`w-full p-2 border rounded-lg resize-none ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows={3}
                />
                <button
                  onClick={addComment}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Comment
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sharing Modal */}
      {showSharing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg p-6 w-96 max-w-full`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Share Document</h3>
              <button
                onClick={() => setShowSharing(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Share link</label>
                <div className="flex">
                  <input
                    type="text"
                    value={window.location.href}
                    readOnly
                    className={`flex-1 p-2 border rounded-l-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
                    }`}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      showNotification('Link copied!', 'success');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Invite people</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className={`w-full p-2 border rounded-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
                  }`}
                />
                <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for dark mode */}
      <style jsx>{`
        .dark-editor .ql-editor {
          background-color: #1f2937;
          color: white;
        }
        .dark-editor .ql-toolbar {
          background-color: #374151;
          border-color: #4b5563;
        }
        .dark-editor .ql-toolbar button {
          color: #d1d5db;
        }
        .dark-editor .ql-toolbar button:hover {
          background-color: #4b5563;
        }
        .dark-editor .ql-toolbar .ql-picker-label {
          color: #d1d5db;
        }
        .ql-editor {
          min-height: 600px;
          font-size: 14px;
          line-height: 1.6;
          padding: 2rem;
        }
        .ql-editor::before {
          font-style: normal;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default DocumentEditor;