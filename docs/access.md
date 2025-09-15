# Access Control Documentation

## Overview

The Scorekeeper application includes a lightweight client-side access gate that provides basic passphrase protection. **This is NOT a security feature** - it's purely for convenience and can be easily bypassed by anyone with access to the browser's developer tools.

## ⚠️ Security Disclaimer

**IMPORTANT**: This access gate provides NO REAL SECURITY. It is implemented purely for convenience and user experience. Anyone with access to the browser can:

- View the passphrase in browser developer tools
- Bypass the gate entirely using browser console
- Access localStorage to retrieve stored access tokens
- Modify the client-side JavaScript

For production deployments requiring actual security, implement proper server-side authentication.

## How It Works

### Technical Implementation

1. **Passphrase Check**: Simple string comparison (not hashed for security)
2. **Persistence**: Uses localStorage to remember access for 30 days
3. **No Server Communication**: Entirely client-side, works offline
4. **Easy Bypass**: Can be disabled by setting `enabled: false` in configuration

### User Experience

- **First Visit**: Shows passphrase prompt
- **Subsequent Visits**: Automatically grants access if within 30-day window
- **Incorrect Passphrase**: Shows error message, allows retry
- **Reset Option**: Button to clear access for testing

## Configuration

### Basic Setup

The access gate is configured in `frontend/src/components/AccessGate.jsx`:

```javascript
export const ACCESS_CONFIG = {
  // Enable/disable the entire gate
  enabled: true,

  // Set your passphrase here
  passphrase: 'scorekeeper2025',

  // How long access persists (days)
  persistenceDays: 30,

  // localStorage key for access token
  storageKey: 'scorekeeper_access_granted'
};
```

### Changing the Passphrase

1. Open `frontend/src/components/AccessGate.jsx`
2. Locate the `ACCESS_CONFIG` object
3. Change the `passphrase` value to your desired passphrase
4. Save the file and rebuild the application

```javascript
export const ACCESS_CONFIG = {
  passphrase: 'your-new-passphrase-here',
  // ... other settings
};
```

### Disabling the Gate

To completely disable the access gate:

1. Open `frontend/src/components/AccessGate.jsx`
2. Set `enabled: false` in the `ACCESS_CONFIG`
3. Save and rebuild

```javascript
export const ACCESS_CONFIG = {
  enabled: false,  // Disables the gate entirely
  passphrase: 'scorekeeper2025',
  // ... other settings
};
```

### Adjusting Persistence

To change how long access is remembered:

```javascript
export const ACCESS_CONFIG = {
  persistenceDays: 7,  // Remember for 7 days instead of 30
  // ... other settings
};
```

## Testing the Gate

### Fresh Browser Test

1. Open the application in an incognito/private window
2. Verify the gate appears and requires passphrase
3. Enter correct passphrase
4. Verify access is granted and main app loads

### Persistence Test

1. Grant access in normal browser window
2. Close and reopen the application
3. Verify access is automatically granted (no gate shown)

### Reset Test

1. Grant access in browser
2. Click "Reset Access (for testing)" button at bottom of gate
3. Verify page reloads and gate appears again

### Disable Test

1. Set `enabled: false` in configuration
2. Rebuild application
3. Verify gate no longer appears

## Deployment Considerations

### GitHub Pages

- The gate works perfectly with GitHub Pages
- No server configuration required
- All access control is client-side

### Local Development

- Works identically in development and production
- Can be easily disabled for development workflow

### Multiple Environments

You can create different configurations for different environments:

```javascript
// For development
const DEV_CONFIG = {
  enabled: false,
  passphrase: 'dev'
};

// For production
const PROD_CONFIG = {
  enabled: true,
  passphrase: 'production-passphrase'
};
```

## Troubleshooting

### Gate Not Appearing

- Check that `enabled: true` in `ACCESS_CONFIG`
- Clear browser localStorage and reload
- Check browser console for JavaScript errors

### Access Not Persisting

- Check browser localStorage for `scorekeeper_access_granted` key
- Verify `persistenceDays` setting
- Check if localStorage is disabled in browser

### Incorrect Passphrase

- Verify the passphrase in `ACCESS_CONFIG` matches what you're entering
- Check for extra spaces or case sensitivity
- The comparison is case-sensitive

### Build Issues

- Ensure the `AccessGate.jsx` file is properly imported in `App.jsx`
- Check for syntax errors in the configuration
- Verify React and component dependencies are installed

## Future Enhancements

### Planned Improvements

1. **Environment-Specific Configs**: Load different settings based on environment
2. **Multiple Passphrases**: Support multiple valid passphrases
3. **Time-Based Access**: Restrict access to certain hours/days
4. **IP-Based Filtering**: Basic IP range checking (limited effectiveness)
5. **Session Management**: More granular session controls

### Migration Path

When ready to implement real security:

1. Disable the client-side gate: `enabled: false`
2. Implement server-side authentication
3. Add proper session management
4. Consider OAuth or other authentication providers
5. Implement role-based access control

## Support

For issues with the access gate:

1. Check this documentation first
2. Review browser console for errors
3. Test in incognito mode to rule out localStorage issues
4. Verify configuration settings are correct

Remember: This gate is for convenience only. For any scenario requiring actual security, implement proper server-side authentication.