# WAHA Frontend v2

SaaS WhatsApp Management System - Frontend Application

## Features

- Multi-tenant WhatsApp management
- Real-time messaging with WebSocket support
- Session management and monitoring
- Modern UI with Tailwind CSS and shadcn/ui components
- TypeScript support

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Docker Deployment

### Build and Run

```bash
# Build Docker image
docker build -t waha-frontend:latest .

# Run container
docker run -d --name waha-frontend -p 3000:3000 waha-frontend:latest
```

**Note:** Backend URL (`https://backend.botmarketi.com.tr/api/v1`) is baked into the Docker image.



### Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL (default: http://localhost:8080/api/v1)
- `NODE_ENV`: Environment (production/development)

## Production Build

```bash
npm run build
npm start
```

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Real-time**: WebSocket
- **Containerization**: Docker