# IPTV Live Playlist 🇷🇺 (Auto-updating)

**Fully automated Python scraper + GitHub Actions** for high-quality Russian/Ukrainian/International IPTV streams.

## Features
- ✅ **24/7 Auto-updates** via GitHub Actions
- ✅ Stream validation (skips dead links)
- ✅ Batch domain discovery (cbilant.com mirrors, etc.)
- ✅ M3U + M3U8 formats
- ✅ EPG support
- ✅ Parallel testing (fast!)

## Usage
1. Download `playlist_live.m3u`
2. Import into VLC, Kodi, IPTV Smarters, etc.
3. Star the repo for updates!

## How it works
The Python robot:
1. Parses base playlist.
2. Tests each stream.
3. Finds working alternatives if primary domain fails.
4. Regenerates clean playlist.
5. Commits to GitHub.

**Contribute**: Add more domains to `config.json` or PR new sources.

Last update: Auto via Actions.
