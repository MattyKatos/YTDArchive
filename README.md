# YTDArchive

YTDArchive is a Discord bot designed for **archiving purposes only**. It allows users to download YouTube videos or audio files directly from Discord. The bot uses `yt-dlp` and `ffmpeg` to handle video/audio downloading and processing.

## ⚠️ Disclaimer
This project is intended **only for archiving content that you have the legal right to download**. Ensure that you comply with YouTube's Terms of Service and any applicable copyright laws. The creators of this project are not responsible for any misuse.

## Features
- Download YouTube videos as MP4 or MP3.
- Automatically host large files temporarily for download via a link.
- Supports Discord server boost levels to determine file size limits.
- Automatically cleans up old files after a specified time.

## Requirements
- Node.js (v16 or higher)
- `yt-dlp` (YouTube downloader)
- `ffmpeg` (for audio/video processing)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/YTDArchive.git
   cd YTDArchive
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Download `yt-dlp` and `ffmpeg`:
   - **yt-dlp**: [Download here](https://github.com/yt-dlp/yt-dlp#installation)
   - **ffmpeg**: [Download here](https://ffmpeg.org/download.html)

   Place the executables (`yt-dlp.exe` and `ffmpeg.exe`) in the root directory of the project.

4. Update the `config.yaml` file:
   - Rename the provided `config.example.yaml` file to `config.yaml`.
   - Edit `config.yaml` to include your details.

5. Start the bot:
   ```bash
   npm run start
   ```

## Bot Commands
   - /downloadmp3 [url] download a video as an MP3
   - /downloadmp4 [url] download a video as an MP4

## Notes
- Files larger than Discord's upload limit are hosted temporarily on a local HTTP server.
- The bot automatically cleans up old files from the `downloads/` directory after a time set in minutes in config.yaml (default 5).

## Legal Use
This bot is intended for **archiving purposes only**. You should only use it to download content that:
1. You own.
2. Is in the public domain.
3. You have explicit permission to download.

By using this bot, you agree to take full responsibility for ensuring that your use complies with all applicable laws and regulations.