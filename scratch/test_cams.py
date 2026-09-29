import urllib.request
import json

url = "https://cwwp2.dot.ca.gov/data/d4/cctv/cctvStatusD04.json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        cams = data.get('data', [])
        print(f"Total D4 cameras: {len(cams)}")
        sf_cams = []
        for c in cams:
            cctv = c.get('cctv', {})
            loc = cctv.get('location', {})
            county = str(loc.get('county', ''))
            place = str(loc.get('nearbyPlace', ''))
            name = str(loc.get('locationName', ''))
            if 'San Francisco' in county or 'San Francisco' in place or 'SF' in name:
                sf_cams.append(cctv)
        print(f"SF cameras: {len(sf_cams)}")
        for sc in sf_cams[:6]:
            loc = sc.get('location', {})
            img = sc.get('imageData', {}).get('static', {}).get('currentImageURL', '')
            stream = sc.get('imageData', {}).get('streamingVideoURL', '')
            print(f"- {loc.get('locationName')} ({loc.get('latitude')}, {loc.get('longitude')})")
            print(f"  Img: {img}")
            print(f"  Stream: {stream}")
except Exception as e:
    print(f"Error: {e}")
