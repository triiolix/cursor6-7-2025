import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();
  const isDocumentPage = location.pathname.includes('/document/');

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-google-blue rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
                <path d="M6 8h8v2H6V8zm0 3h8v2H6v-2z"/>
              </svg>
            </div>
            <span className="text-xl font-medium text-gray-900">
              Collaborative Docs
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {!isDocumentPage && (
            <Link
              to="/document/new"
              className="bg-google-blue hover:bg-google-blue-hover text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              + New Document
            </Link>
          )}
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">U</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;