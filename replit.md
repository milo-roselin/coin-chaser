# Overview

This project is a web-based 2D coin collection game, featuring a React frontend, Express.js backend, and PostgreSQL database. Players control a character to collect coins, avoid obstacles, and compete on a global leaderboard. The game is designed for scalability with clear separation of concerns, supporting a full-stack TypeScript architecture.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system, Radix UI primitives, and shadcn/ui components
- **3D Graphics (prepared)**: React Three Fiber and React Three Drei
- **State Management**: Zustand (for game state, audio, leaderboard)
- **Game Engine**: Custom HTML5 Canvas-based 2D engine with collision detection, input handling, and object management.

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **API Structure**: RESTful API (`/api` prefix)

## Build System
- **Frontend**: Vite
- **Backend**: esbuild
- **TypeScript**: Shared configuration across client, server, and shared directories.

## Core Features & Design
- **UI**: Multiple game screens (start, playing, game over, victory, leaderboard), mobile-friendly touch controls, responsive canvas rendering.
- **Game Logic**: Progressive difficulty scaling for TNT obstacles (quantity, speed), comprehensive collision detection, and a callback system for game events.
- **State Management**: Dedicated state stores for game progression, audio controls, and leaderboard data.
- **User System**: Authentication (login/registration with bcrypt hashing, session management), user-specific coin bank, and avatar selection system.
- **Leaderboard**: Global, cross-device leaderboard with real-time scoring, score submission, and personal score tracking. Allows inline editing of player names and displays cumulative scores.
- **Audio System**: HTML5 Audio API for background music and sound effects, with mute functionality.

# External Dependencies

- **Database**: Neon Database (PostgreSQL)
- **UI Framework**: Radix UI
- **Fonts**: Inter font family (via Fontsource)
- **Audio**: HTML5 Audio API
- **Development Tools**: Drizzle Kit, PostCSS, ESBuild, Replit Integration (runtime error overlay)