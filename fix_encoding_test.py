import re

with open("src/app/dashboard/job-match/page.tsx", "rb") as f:
    raw = f.read()

# Remove UTF-8 BOM if present
if raw.startswith(b'\xef\xbb\xbf'):
    raw = raw[3:]

text = raw.decode("utf-8")

before = len(re.findall(r'[\xc3\xc5\xe2][\x80-\xbf\x94\x9c\x9e\xb0\xb8]', text.encode("latin-1", errors="ignore").decode("latin-1")))
print(f"File loaded. Length: {len(text)}")
print(f"Sample around LOADING_STEPS:")
idx = text.find("LOADING_STEPS")
print(repr(text[idx:idx+300]))