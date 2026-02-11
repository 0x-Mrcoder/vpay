# VTPay Frontend

VTPay is a modern payment gateway and virtual top-up platform. This repository contains the frontend application built with React, TypeScript, and Vite.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```bash
   cd vtpay-frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

> **Note:** Ensure the backend server is running on port 3000 for API requests to work correctly.

## 🛠️ Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Custom CSS
- **Routing:** React Router v7
- **Icons:** Lucide React

## 📂 Project Structure

```
src/
├── components/     # Reusable UI components
├── context/        # React Context (Auth, etc.)
├── layouts/        # Page layouts (Dashboard, Auth)
├── pages/          # Application pages
│   ├── auth/       # Authentication pages
│   ├── dashboard/  # Protected dashboard pages
│   └── public/     # Public pages (Landing, Docs)
├── services/       # API services
├── styles/         # CSS files
└── types/          # TypeScript definitions
```

## 🎨 Styling

The project uses a hybrid approach:
- **Tailwind CSS v4**: For utility classes and layout.
- **Custom CSS**: Located in `src/styles/` for specific component styling and themes.

## 🔌 API Integration

The frontend communicates with the backend via a proxy configured in `vite.config.ts`. All API requests starting with `/api` are forwarded to `http://localhost:3000`.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
