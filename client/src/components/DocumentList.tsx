import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { documentAPI } from '../services/api';
import { DocumentSummary } from '../types';

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'modified' | 'created' | 'name'>('modified');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const templates = [
    {
      id: 'blank',
      name: 'Blank Document',
      description: 'Start with a blank document',
      icon: '📄',
      color: 'bg-blue-500'
    },
    {
      id: 'resume',
      name: 'Resume',
      description: 'Professional resume template',
      icon: '👔',
      color: 'bg-green-500'
    },
    {
      id: 'letter',
      name: 'Letter',
      description: 'Formal letter template',
      icon: '✉️',
      color: 'bg-purple-500'
    },
    {
      id: 'report',
      name: 'Report',
      description: 'Business report template',
      icon: '📊',
      color: 'bg-orange-500'
    },
    {
      id: 'essay',
      name: 'Essay',
      description: 'Academic essay template',
      icon: '📚',
      color: 'bg-red-500'
    },
    {
      id: 'meeting',
      name: 'Meeting Notes',
      description: 'Meeting notes template',
      icon: '🗣️',
      color: 'bg-indigo-500'
    }
  ];

  useEffect(() => {
    loadDocuments();
    // Check for dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentAPI.getAllDocuments();
      setDocuments(docs);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewDocument = async (templateId?: string) => {
    try {
      let title = 'Untitled Document';
      let content = '';

      if (templateId && templateId !== 'blank') {
        const template = templates.find(t => t.id === templateId);
        title = `New ${template?.name || 'Document'}`;
        content = getTemplateContent(templateId);
      }

      const newDoc = await documentAPI.createDocument(title);
      if (content) {
        await documentAPI.updateDocument(newDoc.id, { content });
      }
      navigate(`/document/${newDoc.id}`);
    } catch (err) {
      console.error('Error creating document:', err);
    }
  };

  const getTemplateContent = (templateId: string): string => {
    const templates: { [key: string]: string } = {
      resume: `
        <h1>Your Name</h1>
        <p>Email | Phone | Address</p>
        <h2>Professional Summary</h2>
        <p>Brief description of your professional background...</p>
        <h2>Experience</h2>
        <h3>Job Title - Company Name</h3>
        <p>Date Range</p>
        <ul><li>Key achievement or responsibility</li></ul>
        <h2>Education</h2>
        <h3>Degree - Institution</h3>
        <p>Graduation Date</p>
        <h2>Skills</h2>
        <ul><li>Skill 1</li><li>Skill 2</li></ul>
      `,
      letter: `
        <p>[Your Name]</p>
        <p>[Your Address]</p>
        <p>[Date]</p>
        <br>
        <p>[Recipient Name]</p>
        <p>[Recipient Address]</p>
        <br>
        <p>Dear [Recipient Name],</p>
        <br>
        <p>I am writing to...</p>
        <br>
        <p>Sincerely,</p>
        <p>[Your Name]</p>
      `,
      report: `
        <h1>Report Title</h1>
        <h2>Executive Summary</h2>
        <p>Brief overview of the report...</p>
        <h2>Introduction</h2>
        <p>Background information...</p>
        <h2>Methodology</h2>
        <p>How the research was conducted...</p>
        <h2>Findings</h2>
        <p>Key findings and data...</p>
        <h2>Recommendations</h2>
        <p>Suggested actions...</p>
        <h2>Conclusion</h2>
        <p>Summary and final thoughts...</p>
      `,
      essay: `
        <h1>Essay Title</h1>
        <h2>Introduction</h2>
        <p>Thesis statement and overview...</p>
        <h2>Body Paragraph 1</h2>
        <p>First main point with supporting evidence...</p>
        <h2>Body Paragraph 2</h2>
        <p>Second main point with supporting evidence...</p>
        <h2>Body Paragraph 3</h2>
        <p>Third main point with supporting evidence...</p>
        <h2>Conclusion</h2>
        <p>Restate thesis and summarize key points...</p>
      `,
      meeting: `
        <h1>Meeting Notes</h1>
        <p><strong>Date:</strong> [Date]</p>
        <p><strong>Time:</strong> [Time]</p>
        <p><strong>Attendees:</strong> [Names]</p>
        <h2>Agenda</h2>
        <ol><li>Item 1</li><li>Item 2</li></ol>
        <h2>Discussion Points</h2>
        <ul><li>Point 1</li><li>Point 2</li></ul>
        <h2>Action Items</h2>
        <ul><li>Task - Assigned to [Name] - Due [Date]</li></ul>
        <h2>Next Meeting</h2>
        <p>Date and time of next meeting...</p>
      `
    };
    return templates[templateId] || '';
  };

  const filteredDocuments = documents
    .filter(doc => 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'modified':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">{error}</h2>
          <button
            onClick={loadDocuments}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Enhanced Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Collaborative Docs
                  </h1>
                  <p className="text-sm text-gray-500">Your documents, everywhere</p>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-64 pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                      : 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* View toggles */}
              <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'modified' | 'created' | 'name')}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="modified">Last Modified</option>
                <option value="created">Date Created</option>
                <option value="name">Name</option>
              </select>

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
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Templates Section */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Start a new document</h2>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {showTemplates ? 'Show less' : 'Show more templates'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {templates.slice(0, showTemplates ? templates.length : 6).map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => createNewDocument(template.id)}
                className={`cursor-pointer rounded-xl border-2 border-transparent hover:border-blue-300 transition-all duration-200 ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:shadow-lg'
                }`}
              >
                <div className="p-6 text-center">
                  <div className={`w-16 h-20 mx-auto mb-4 rounded-lg ${template.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {template.icon}
                  </div>
                  <h3 className="font-medium text-sm mb-1">{template.name}</h3>
                  <p className="text-xs text-gray-500">{template.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Recent Documents */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent documents</h2>
            <div className="text-sm text-gray-500">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-8xl mb-6">📝</div>
              <h3 className="text-xl font-medium mb-2">No documents found</h3>
              <p className="text-gray-500 mb-8">
                {searchTerm ? 'Try a different search term' : 'Create your first document to get started'}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => createNewDocument()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
              >
                Create Document
              </motion.button>
            </motion.div>
          ) : (
            <AnimatePresence>
              {viewMode === 'grid' ? (
                <motion.div
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {filteredDocuments.map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        to={`/document/${doc.id}`}
                        className={`block rounded-xl border-2 border-transparent hover:border-blue-300 transition-all duration-200 ${
                          darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:shadow-lg'
                        }`}
                      >
                        <div className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-lg truncate mb-2">
                                {doc.title}
                              </h3>
                              <div className="flex items-center text-sm text-gray-500 space-x-4">
                                <span>Opened {formatDate(doc.lastModified)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  layout
                  className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}
                >
                  {filteredDocuments.map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b last:border-b-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}
                    >
                      <Link
                        to={`/document/${doc.id}`}
                        className={`flex items-center p-4 hover:bg-gray-50 ${darkMode ? 'hover:bg-gray-700' : ''} transition-colors`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-lg truncate">{doc.title}</h3>
                          <p className="text-sm text-gray-500">Last modified {formatDate(doc.lastModified)}</p>
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatDate(doc.createdAt)}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default DocumentList;