# Autoever Video Player Demo

A modern HLS video player built with Next.js 15, featuring real-time segment loading tracking, advanced buffering, and comprehensive performance monitoring.

## Features

### 🎬 Video Playback
- **HLS Adaptive Streaming**: Automatic quality switching based on network conditions
- **Cross-browser Support**: Works on Chrome, Firefox, Safari, and Edge
- **Custom Controls**: Play/pause, mute, fullscreen controls
- **Progress Bar**: Click to seek, with visual buffer indicators
- **Time Display**: Current time and total duration

### 📊 Advanced Monitoring
- **Real-time Segment Tracking**: Monitor HLS segment downloads in real-time
- **Full URI Display**: See complete segment paths without host domain
- **Performance Metrics**: Track download duration and DNS lookup times
- **Color-coded Console**: Easy-to-read log levels with syntax highlighting

### ⚡ Performance Optimization
- **Pre-buffering**: Downloads up to 10 seconds ahead
- **Background Buffering**: Continues downloading even when paused
- **Buffer Visualization**: See downloaded segments on progress bar
- **Efficient Resource Management**: Smart memory and bandwidth usage

### 🎨 Modern UI/UX
- **Dark Mode Support**: Seamless dark/light theme switching
- **Responsive Design**: Works on desktop and mobile devices
- **Tailwind CSS**: Modern, utility-first styling
- **ShadCN Components**: Beautiful, accessible UI components

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN/ui
- **Video Player**: HLS.js
- **State Management**: Zustand
- **Form Management**: React Hook Form + Zod
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone git@github.com:LuisFigoKim/video-convert-service-viewer.git

# Navigate to project directory
cd autoever-video-player-demo

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Playing a Video

1. The default demo video loads automatically
2. Or enter your own HLS stream URL (.m3u8) in the input field
3. Click "Load Video" or press Enter
4. Video will start loading and display in the player

### Monitoring Segments

The **Segment Loading Console** shows real-time information:

- 🟣 **[HLS]** - Manifest parsing and initialization
- 🟡 **[Loading]** - Segment download started
- 🟢 **[Loaded]** - Segment download completed
- 🔵 **[Buffered]** - Segment ready for playback

Each log entry includes:
- Segment sequence number
- Full URI path (without host)
- Duration and quality level
- Timestamp

### Customization

#### Adjust Buffer Settings

Edit `components/video-player.tsx`:

```typescript
const hls = new Hls({
  maxBufferLength: 10,        // Buffer up to 10 seconds ahead
  maxMaxBufferLength: 100,    // Maximum buffer length
  maxBufferSize: 10 * 1000 * 1000, // 10 MB buffer size
});
```

#### Change Video Source

Update the default URL in `app/page.tsx`:

```typescript
const defaultUrl = "https://your-video-url.m3u8";
```

## Project Structure

```
autoever-video-player-demo/
├── app/
│   ├── globals.css          # Global styles with Tailwind
│   ├── layout.tsx           # Root layout
│   └── page.tsx            # Main page with URL input and console
├── components/
│   ├── ui/                 # ShadCN UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   └── video-player.tsx    # HLS video player component
├── lib/
│   └── utils.ts           # Utility functions
├── public/                # Static assets
├── components.json        # ShadCN configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Key Features Explained

### HLS Adaptive Streaming

The player automatically adjusts video quality based on:
- Available bandwidth
- Device capabilities
- Network conditions

### Segment Pre-buffering

- Buffers 10 seconds ahead of current playback position
- Continues buffering even when video is paused
- Prevents playback interruptions due to network issues

### Real-time Monitoring

Uses HLS.js events and PerformanceObserver API to track:
- When segments start/finish downloading
- Download duration and performance metrics
- Buffer state and segment readiness

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [HLS.js](https://github.com/video-dev/hls.js) - HLS video player
- [ShadCN/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## Contact

For questions or feedback, please open an issue on GitHub.

---

Built with ❤️ using Next.js 15 and HLS.js
