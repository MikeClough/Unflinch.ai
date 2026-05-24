# Unflinch.ai Landing Page v31

Local test search fix:
- Removed noopener from the temporary search tab so the script can redirect it after the Worker returns.
- Added a loading message inside the new tab while AEGIS prepares the Google query.
- Keeps fallback behavior if the Worker fails.
- Note: for local file:// testing, the Worker also needs CORS to allow Origin: null, or the site should be tested through Cloudflare Pages.
