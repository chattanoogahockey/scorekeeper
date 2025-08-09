# Fanfare Sound Files

This directory contains fanfare sound files that are played by the DJ controls in the Hockey Scorekeeper application.

## Adding New Fanfare Files

To add new fanfare files:

1. **Add your audio file**: Place your `.mp3` file in this directory (`/sounds/fanfare/`)

2. **Update the configuration**: Edit `fanfare-config.json` and add an entry for your new file:
   ```json
   {
     "filename": "your-new-fanfare.mp3",
     "displayName": "Your Fanfare Name",
     "description": "Description of the fanfare sound"
   }
   ```

3. **No code changes needed**: The MediaControlPanel component automatically loads the configuration and makes all listed files available in the fanfare rotation.

## Current Fanfare Files

The application currently includes:
- **Organ Fanfare** (`fanfare_organ.mp3`) - Classic organ charge fanfare
- **Bugle Call** (`fanfare_bugle.mp3`) - Military-style bugle fanfare  
- **Trumpet Fanfare** (`fanfare_trumpet.mp3`) - Brass trumpet announcement
- **Piano Flourish** (`fanfare_piano.mp3`) - Grand piano fanfare

## Technical Details

- Supported formats: MP3 (recommended for best browser compatibility)
- The fanfare button cycles through all configured files in order
- Files are loaded dynamically from `fanfare-config.json` on component mount
- If the config file fails to load, the application falls back to default fanfare files
