# Collaborative Docs

A real-time collaborative document editor similar to Google Docs, built with React, Node.js, and Socket.IO.

## Features

- 📝 Rich text editing with Quill.js
- 🤝 Real-time collaboration with multiple users
- 💾 Auto-save functionality
- 📱 Responsive design with modern UI
- 🔗 Document sharing via URLs
- 👥 Active user indicators
- 🎨 Rich formatting options (bold, italic, colors, fonts, etc.)
- 📋 Document management (create, view, edit)

## Tech Stack

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Quill.js for rich text editing
- Socket.IO client for real-time features
- Tailwind CSS for styling

### Backend
- Node.js with Express
- Socket.IO for real-time collaboration
- JSON file storage for documents
- CORS enabled for development

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd collaborative-docs
```

2. Install dependencies for all components:
```bash
npm run install-all
```

Alternatively, install manually:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Running the Application

1. **Development Mode** (recommended):
```bash
npm run dev
```
This starts both the server (port 5000) and client (port 3000) concurrently.

2. **Production Mode**:
```bash
# Build the client
npm run build

# Start the server
npm start
```

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage

### Creating Documents
1. Visit the homepage
2. Click "Create a new document" or the "+ New Document" button
3. Start typing to automatically save your changes

### Collaborative Editing
1. Share the document URL with others
2. Multiple users can edit simultaneously
3. Changes appear in real-time for all users
4. Active users are shown in the top-right corner

### Document Management
- All documents are listed on the homepage
- Documents show last modified date
- Click any document to open it for editing
- Document titles can be edited by clicking on them

## Project Structure

```
collaborative-docs/
├── package.json              # Root package.json with scripts
├── README.md                 # This file
├── server/                   # Backend server
│   ├── package.json         # Server dependencies
│   ├── index.js            # Main server file
│   └── documents/          # Document storage (auto-created)
└── client/                  # Frontend React app
    ├── package.json        # Client dependencies
    ├── public/
    │   └── index.html     # HTML template
    ├── src/
    │   ├── components/    # React components
    │   │   ├── Header.tsx
    │   │   ├── DocumentList.tsx
    │   │   └── DocumentEditor.tsx
    │   ├── services/      # API and Socket services
    │   │   ├── api.ts
    │   │   └── socket.ts
    │   ├── types/         # TypeScript interfaces
    │   │   └── index.ts
    │   ├── App.tsx        # Main App component
    │   ├── index.tsx      # React entry point
    │   └── index.css      # Global styles
    ├── tailwind.config.js # Tailwind configuration
    ├── postcss.config.js  # PostCSS configuration
    └── tsconfig.json      # TypeScript configuration
```

## API Endpoints

### Documents
- `GET /api/documents` - Get all documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get specific document
- `PUT /api/documents/:id` - Update document

### WebSocket Events
- `join-document` - Join a document room
- `document-change` - Broadcast document changes
- `cursor-position` - Share cursor positions
- `user-joined` / `user-left` - User presence events

## Features in Detail

### Real-time Collaboration
- Uses Socket.IO for WebSocket connections
- Document changes are broadcasted to all connected users
- Conflict resolution through operational transforms
- User presence indicators

### Rich Text Editing
- Full Quill.js toolbar with formatting options
- Headers, fonts, colors, alignment
- Lists, quotes, code blocks
- Links and basic image support

### Auto-save
- Changes are automatically saved after 1 second of inactivity
- Visual indicators show save status
- No data loss on connection issues

### Modern UI
- Google Docs-inspired design
- Responsive layout for mobile and desktop
- Clean, professional interface
- Loading states and error handling

## Development

### Available Scripts

In the project directory:
- `npm run dev` - Start development servers
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend client
- `npm run build` - Build for production
- `npm run install-all` - Install all dependencies

### Customization

#### Styling
- Modify `client/tailwind.config.js` for theme customization
- Update `client/src/index.css` for global styles

#### Editor Configuration
- Quill.js modules and formats can be customized in `DocumentEditor.tsx`
- Toolbar options and features are easily configurable

#### Backend Storage
- Currently uses JSON files for simplicity
- Can be easily replaced with MongoDB, PostgreSQL, etc.
- Document schema is defined in `types/index.ts`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Known Issues

- Document storage is file-based (not suitable for production scale)
- No user authentication system
- Limited conflict resolution for simultaneous edits
- No document versioning/history

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Document permissions and sharing settings
- [ ] Version history and document recovery
- [ ] Comments and suggestions
- [ ] Export to PDF, Word, etc.
- [ ] Database integration
- [ ] Improved conflict resolution
- [ ] Mobile app support
- [ ] Advanced formatting features
