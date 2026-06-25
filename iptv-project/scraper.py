import requests
import re
import time
from urllib.parse import urlparse
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# Config
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; IPTVBot/1.0)'}
TIMEOUT = 10
MAX_WORKERS = 20
DOMAINS_TO_SCAN = ["cbilant.com", "iptv", "stream", "live"]  # Expandable

def is_stream_working(url, timeout=TIMEOUT):
    try:
        # HEAD request first for speed
        response = requests.head(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        if response.status_code == 200:
            # Quick GET to confirm HLS
            resp = requests.get(url, headers=HEADERS, timeout=timeout, stream=True)
            if resp.status_code == 200:
                return True
        return False
    except:
        return False

def extract_channels_from_m3u(content):
    channels = []
    lines = content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('#EXTINF:'):
            # Parse metadata
            match = re.search(r',(.+?)$', line)
            name = match.group(1) if match else "Unknown"
            tvg_id = re.search(r'tvg-id="([^"]+)"', line)
            group = re.search(r'group-title="([^"]+)"', line)
            logo = re.search(r'tvg-logo="([^"]+)"', line)
            
            # Next line is URL
            if i + 1 < len(lines):
                url = lines[i+1].strip()
                if url.startswith('http'):
                    channels.append({
                        'name': name,
                        'url': url,
                        'tvg_id': tvg_id.group(1) if tvg_id else '',
                        'group': group.group(1) if group else 'Общие',
                        'logo': logo.group(1) if logo else ''
                    })
            i += 2
        else:
            i += 1
    return channels

def find_alternative_domains(base_url):
    parsed = urlparse(base_url)
    domain = parsed.netloc
    alternatives = []
    # Pattern match for similar providers
    for d in DOMAINS_TO_SCAN:
        if d in domain:
            # Try common variations
            alternatives.append(f"http://{domain.replace('2477fd5f', 'otherid')}/iptv/...")  # Customize logic
    return alternatives

def main():
    # Load original playlist
    with open('playlists/playlist_3840.m3u', 'r', encoding='utf-8') as f:
        content = f.read()
    
    channels = extract_channels_from_m3u(content)
    print(f"Found {len(channels)} channels to validate.")
    
    working_channels = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_channel = {executor.submit(is_stream_working, ch['url']): ch for ch in channels}
        for future in as_completed(future_to_channel):
            ch = future_to_channel[future]
            if future.result():
                working_channels.append(ch)
                print(f"✅ Working: {ch['name']}")
            else:
                print(f"❌ Skipped: {ch['name']}")
    
    # Generate new M3U
    m3u_content = '#EXTM3U\n#EXTM3U x-tvg-url="https://is.gd/epg2xml"\n'
    for ch in working_channels:
        extinf = f'#EXTINF:-1 tvg-id="{ch["tvg_id"]}" group-title="{ch["group"]}" tvg-logo="{ch["logo"]}",{ch["name"]}\n'
        m3u_content += extinf + ch['url'] + '\n'
    
    with open('playlists/playlist_live.m3u', 'w', encoding='utf-8') as f:
        f.write(m3u_content)
    with open('playlists/playlist_live.m3u8', 'w', encoding='utf-8') as f:
        f.write(m3u_content)
    
    print(f"Updated playlist with {len(working_channels)} working channels.")

if __name__ == "__main__":
    main()
