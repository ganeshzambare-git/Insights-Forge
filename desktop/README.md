# InsightForge Desktop App

A Windows desktop wrapper for the InsightForge platform using Tauri 2.

## Prerequisites

1. **Rust toolchain** (stable toolchain)
2. **MinGW-w64** (for Windows builds) - `choco install mingw` or use MSYS2
3. **Node.js 20+** and npm
4. **Visual Studio Build Tools** (optional, for MSVC builds)

> **Important**: The project path must NOT contain spaces. If you see linker errors like `cc1.exe: fatal error: Study\...`, move this folder to a path like `C:\code\IsightFordge_v1\` or `D:\IsightFordge_v1\`.

## Setup

```bash
cd desktop
npm install
```

## Development

```bash
# Start dev server (opens the desktop window)
npx tauri dev
```

The app loads the production Vercel frontend at `https://insights-forge-aie6.vercel.app/` inside a native Windows window.

## Building the Installer

```bash
# Build NSIS installer
npx tauri build

# Installer will be at: src-tauri/target/release/bundle/nsis/insightforge-desktop Setup 1.0.0.exe
```

## Auto-Updates

The app uses Tauri's built-in updater. Updates are published to GitHub Releases with:

1. Git tag: `desktop-v1.0.0` (semver)
2. Release artifacts: signed installer + `latest.json`

### GitHub Actions Release Workflow

The workflow `.github/workflows/desktop-release.yml` triggers on `desktop-v*` tags:

```yaml
# On push of tag matching desktop-v*
# 1. Builds NSIS installer on windows-latest
# 2. Signs updater artifacts (requires secrets: MINISIGN_PUBKEY, GH_TOKEN)
# 3. Creates GitHub Release with installer + latest.json
```

### Required GitHub Secrets

- `MINISIGN_PRIVKEY` - Private key for signing updates (never in repo)
- `GH_TOKEN` - GitHub token for release creation

## Project Structure

```
desktop/
├── loader/           # Local loader page (inits webview)
│   └── index.html    # Redirects to Vercel frontend
├── src-tauri/
│   ├── Cargo.toml    # Rust dependencies + updater plugin
│   ├── tauri.conf.json # Tauri configuration
│   ├── src/main.rs   # Updater plugin + error handling
│   └── icons/        # icon.ico
├── package.json      # npm dependencies (@tauri-apps/cli)
└── README.md
```

## Architecture

- Uses **Tauri 2** (~10 MB installer vs ~150 MB for Electron)
- Loads production frontend via webview (no Electron overhead)
- CSP allows only `insights-forge-aie6.vercel.app` and `insights-forge.onrender.com`
- NSIS installer creates Desktop + Start Menu shortcuts
- Updater plugin handles signed auto-updates

## Troubleshooting

### Path with spaces error

If you see: `cc1.exe: fatal error: Study\...`

**Solution**: Move the project to a path without spaces:
```bash
# Move to C:\code\
mv "D:\Ganesh Study\..." "C:\code\IsightFordge_v1\"
```

### Cargo/Tauri not found

```bash
export PATH="$HOME/.cargo/bin:$PATH"  # Linux/macOS
# Windows: Add C:\Users\<USER>\.cargo\bin to PATH
```

### Windows linker errors (MSVC)

Install Visual Studio Build Tools with "Desktop development with C++" workload, or use MinGW:
```bash
rustup default stable-x86_64-pc-windows-gnu
```