# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese research application (卒論用のアプリケーション) for studying music classification and recommendation systems. Built with Next.js Pages Router, it integrates Spotify API and Supabase for user authentication and data management.

## Conversation Guidelines

- 常に日本語で会話する

## Development Commands

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm run start

# Linting
npm run lint

# Install dependencies
npm install
```

## Architecture

### Technology Stack

- **Frontend**: Next.js 15.1.3 with Pages Router, React 19, TypeScript
- **Styling**: Tailwind CSS, Material-UI components
- **Authentication**: NextAuth.js with Spotify OAuth
- **Database**: Supabase (PostgreSQL) with real-time sync
- **API**: Comprehensive Spotify Web API integration

### Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Core library functions (spotify.ts, supabase.ts)
├── pages/              # Next.js Pages Router
│   ├── api/            # API routes
│   ├── mobile/         # Mobile-specific pages
│   └── ipad/           # iPad-specific pages
├── types/              # TypeScript definitions
├── utils/              # Utility functions
└── styles/             # Global CSS
```

### Device-Specific Implementation

The application has distinct implementations for different devices:

- **Mobile**: `/mobile/phasesA/`, `/mobile/phasesB/`
- **iPad**: `/ipad/phaseA/`, `/ipad/phaseB/`
- **Desktop**: Standard responsive layouts

Each device type has its own phase-based interaction flow with different UI components and user experiences.

### Authentication Flow

Complex Spotify OAuth implementation with:

- PKCE (Proof Key for Code Exchange) support
- Automatic token refresh in `src/lib/spotify.ts`
- User profile and library synchronization
- Real-time data saving to Supabase

Key authentication files:

- `src/pages/api/auth/[...nextauth].ts`: NextAuth configuration
- `src/lib/spotify.ts`: Spotify API client with token management
- `src/lib/supabase.ts`: Database client configuration

### Database Schema

Main Supabase tables:

- `users`: User profile information
- `tracks`: Track metadata with classification data
- `sessions`: User session management
- `phases`: Phase-based interaction tracking

### Data Processing Algorithm

Advanced track classification system that computes:

- Self-disclosure levels (0-4 scale)
- Song favorite levels (1-4 scale)
- Singing confidence levels (0-4 scale)
- Popularity-based recommendations

Core algorithm located in track processing utilities.

### Spotify API Integration

Comprehensive integration with extensive scopes:

- User library access (`user-library-read`)
- Playlist management (`playlist-read-private`)
- Playback control (`user-modify-playback-state`)
- Recently played tracks (`user-read-recently-played`)
- Top tracks (`user-top-read`)

### Environment Variables

Required for development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=
NEXTAUTH_SECRET=
```

### Configuration Files

- `tsconfig.json`: TypeScript config with path aliases (`@/*` → `./src/*`)
- `tailwind.config.ts`: Tailwind CSS configuration
- `next.config.ts`: Next.js config with Spotify image domains
- `package.json`: Dependencies and scripts

## Development Notes

### Phase-Based Architecture

The application uses a phase-based interaction system where users progress through different phases of music selection and classification. Each phase has device-specific implementations.

### Real-Time Data Sync

All user interactions and track selections are synchronized in real-time with Supabase, enabling research data collection and analysis.

### Token Management

Spotify tokens are automatically refreshed through NextAuth callbacks. The refresh logic is implemented in the NextAuth configuration and Spotify client library.

### Mobile-First Design

While supporting multiple devices, the application prioritizes mobile user experience with touch-optimized interfaces and responsive layouts.
