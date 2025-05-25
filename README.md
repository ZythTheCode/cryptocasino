
# 🎰 Crypto Casino Web App

A modern web-based casino application where players use crypto coins earned from a Money Tree idle system. Players can convert coins to casino chips and play various casino games.

## 🌟 Features

### Core Functionality
- **User Authentication**: Register/Login system with password protection
- **Money Tree**: Passive coin generation (1 coin every 10 minutes)
- **Wallet System**: Convert crypto coins to casino chips (1 coin = 10 chips)
- **Casino Games**: 5 different games (Color Game, Blackjack, Poker, Slots, Baccarat)
- **Admin Panel**: Administrative controls for user management
- **Offline Earnings**: Coins accumulate while offline based on last login time

### Technical Features
- React + TypeScript frontend
- Local storage for data persistence
- Responsive design with Tailwind CSS
- Real-time updates and notifications
- Modern UI components with shadcn/ui

## 🚀 Quick Start (Lovable Platform)

This project is built on Lovable and can be instantly deployed:

1. **Live Preview**: View your app in real-time in the Lovable editor
2. **Instant Deploy**: Click "Publish" for free hosting on `yourapp.lovable.app`
3. **GitHub Sync**: Connect to GitHub for version control and collaboration

## 💻 Local Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 16 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`
- **npm** (comes with Node.js)
  - Verify installation: `npm --version`
- **Git** (for cloning the repository)
  - Download from [git-scm.com](https://git-scm.com/)
- **VS Code** (recommended code editor)
  - Download from [code.visualstudio.com](https://code.visualstudio.com/)

### Step 1: Get the Code

#### Option A: Clone from GitHub (if connected)
```bash
# Clone the repository
git clone https://github.com/yourusername/crypto-casino-app.git

# Navigate to the project directory
cd crypto-casino-app
```

#### Option B: Download from Lovable
1. In Lovable editor, click "GitHub" → "Connect to GitHub"
2. Create a new repository
3. Clone the newly created repository

### Step 2: Install Dependencies

```bash
# Install all project dependencies
npm install
```

This will install:
- React & React DOM
- TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- shadcn/ui components
- Lucide React (icons)
- And other development dependencies

### Step 3: Start Development Server

```bash
# Start the development server
npm run dev
```

The application will be available at: `http://localhost:8080`

### Step 4: Open in VS Code

```bash
# Open the project in VS Code
code .
```

## 🛠️ Development Workflow

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── pages/              # Page components
│   ├── Index.tsx       # Main casino dashboard
│   └── NotFound.tsx    # 404 page
├── App.tsx             # Main app component
├── main.tsx           # App entry point
└── index.css          # Global styles
```

### Key Files

- **`src/pages/Index.tsx`**: Main casino application with all features
- **`src/App.tsx`**: App routing and providers setup
- **`package.json`**: Dependencies and scripts
- **`vite.config.ts`**: Build configuration
- **`tailwind.config.ts`**: Styling configuration

## 🎮 Using the Application

### For Players

1. **Registration/Login**
   - Create a new account or login with existing credentials
   - Admin account: username `admin`, any password

2. **Money Tree**
   - Automatically generates 1 coin every 10 minutes
   - Claim accumulated coins manually
   - Coins accumulate while offline

3. **Wallet System**
   - Convert coins to chips at 1:10 ratio
   - Use chips for betting in casino games

4. **Casino Games**
   - Access 5 different casino games
   - Bet using chips
   - Win or lose chips based on game outcomes

### For Administrators

- Login with username `admin`
- Access admin panel for user management
- View game logs and statistics
- Manage user balances

## 🔧 Customization

### Adding New Games

1. Create a new game component in `src/components/games/`
2. Add the game to the games array in `Index.tsx`
3. Implement game logic with chip betting system

### Modifying Coin Generation

Change the coin generation rate in the `MoneyTree` component:

```typescript
// Current: 1 coin every 10 minutes (600,000 ms)
const COIN_INTERVAL = 10 * 60 * 1000;

// Example: 1 coin every 5 minutes
const COIN_INTERVAL = 5 * 60 * 1000;
```

### Styling Changes

The app uses Tailwind CSS for styling. Modify classes in components or add custom styles in `src/index.css`.

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🔒 Security Notes

**Important**: This is a frontend-only demo application that uses local storage for data persistence. For production use, you would need:

- Secure backend API
- Real database (MySQL, PostgreSQL, etc.)
- Proper password hashing (bcrypt)
- JWT authentication
- HTTPS encryption
- Input validation and sanitization

## 🚀 Deployment Options

### Free Deployment (Lovable)
1. Click "Publish" in Lovable editor
2. Get instant hosting on `yourapp.lovable.app`
3. SSL certificate included

### Self Hosting
```bash
# Build for production
npm run build

# The dist/ folder contains the built application
# Upload to any static hosting service:
# - Netlify
# - Vercel
# - GitHub Pages
# - AWS S3
# - Your own server
```

### Environment Variables

For production deployment, you may want to set:

```bash
# .env file
VITE_APP_TITLE="Your Casino Name"
VITE_API_URL="https://your-api.com"
```

## 🔄 Syncing with Lovable

When developing locally, you can sync changes back to Lovable:

1. Make changes in VS Code
2. Commit and push to GitHub
3. Changes automatically sync to Lovable
4. Continue editing in either environment

## 🐛 Troubleshooting

### Common Issues

**Node.js version errors**
```bash
# Use Node Version Manager (nvm) to switch versions
nvm install 18
nvm use 18
```

**Port already in use**
```bash
# Kill process on port 8080
npx kill-port 8080
# Or use a different port
npm run dev -- --port 3000
```

**Module not found errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors**
```bash
# Run type checking
npm run type-check
```

### Development Tips

- Use browser developer tools for debugging
- Check the console for error messages
- Use React Developer Tools extension
- Enable TypeScript strict mode for better code quality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit changes: `git commit -m 'Add some feature'`
5. Push to branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

- **Lovable Documentation**: [docs.lovable.dev](https://docs.lovable.dev)
- **Discord Community**: [Join Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **GitHub Issues**: Report bugs and request features

## 🎯 Roadmap

- [ ] Complete implementation of all 5 casino games
- [ ] Real-time multiplayer features
- [ ] Leaderboards and achievements
- [ ] Mobile app version
- [ ] Cryptocurrency integration
- [ ] Advanced admin analytics
- [ ] Sound effects and animations
- [ ] Tournament system

---

**Happy Gaming! 🎰**

Built with ❤️ using React, TypeScript, and Lovable
