# How to Reload the Extension

The changes are in the code, but VS Code is running the old compiled version. Here's how to reload:

## Option 1: Quick Reload (Recommended)

If you're running the extension in debug mode (pressed F5):

1. **Press `Ctrl+Shift+F5`** (Cmd+Shift+F5 on Mac) to reload the Extension Development Host window
2. The new UI should appear immediately in the Loom sidebar

## Option 2: Full Restart

1. Close the "Extension Development Host" window if it's open
2. In your main VS Code window, press **F5** to launch the extension again
3. Open the Loom sidebar in the new window

## Option 3: Compile First (if changes don't appear)

```powershell
cd c:\Users\LENOVO\Documents\Loom\loom-vscode-extension
npm run compile
```

Then press `Ctrl+Shift+F5` to reload.

## What You Should See

**Before** (old UI):
- "Connect Workspace" button
- "Open Loom Web" button (or "Connect with Browser")

**After** (new UI):
- **"Connect to Loom"** title
- **"Connect with API Key"** button (primary, emerald colored)
- **"Get your API Key →"** link (direct link to settings)
- *Note: Browser pairing has been removed to simplify the experience.*

## Testing the New Flow

Once you see the new UI:

1. Click **"Enter API Key"**
2. A VS Code input box should appear at the top
3. Paste a key (format: `loom_xxx...`)
4. Extension validates and connects instantly

## Troubleshooting

If the UI still doesn't update:
- Make sure you're looking at the Loom sidebar in the **Extension Development Host** window, not the main VS Code window
- Try closing all Extension Development Host windows and pressing F5 again
- Check the extension console for errors (Help → Toggle Developer Tools in the Extension Development Host)
