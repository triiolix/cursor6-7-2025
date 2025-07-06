import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';
import Header from './components/Header';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-google-light-gray">
        <Header />
        <Routes>
          <Route path="/" element={<DocumentList />} />
          <Route path="/document/:id" element={<DocumentEditor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;