# Draft Approval

A full-stack web application built with TypeScript for managing draft documents and approvals. Features a modern React frontend and a Node.js backend with Drizzle ORM.

## Features

- **Draft Management** - Create, edit, and manage draft documents
- **Approval Workflow** - Multi-step approval process for documents
- **Client-Server Architecture** - Separate frontend and backend services
- **Real-time Updates** - Live synchronization of changes
- **Type-safe Development** - Full TypeScript support across the stack
- **Modern UI** - Built with Vite and Tailwind CSS

## Tech Stack

- **Frontend**: React with TypeScript, Vite
- **Backend**: Node.js with TypeScript
- **Database ORM**: Drizzle ORM
- **Styling**: Tailwind CSS, PostCSS
- **Package Manager**: npm

## Project Structure

```
.
├── client/              # Frontend React application
├── script/              # Build and utility scripts
├── server/              # Backend API server
└── shared/              # Shared types and utilities
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/niha1905/draft-approval-1.git
cd draft-approval-1

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### Running the Application

```bash
# Start the development server
# (Add your specific start commands here)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | Database connection string |
| API_URL | Backend API URL |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
