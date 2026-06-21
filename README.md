# 🧠 Dadarzz Agent

Your AI-Agent. Dadarzz Agent is a local-first interface that connects a powerful LLM to your local files.
---

## 🌟 Features

- **Document Understanding (PDFs/TXT)**: Upload files and ask questions directly.
- **Local File Management**: Let the agent organize, create, and manage your local files safely.

---

## 🚀 Quick Start (Pre-Built Binaries)

The easiest way to use Dadarzz Agent is to download the pre-built binaries from the [GitHub Releases](https://github.com/Dadarzz2405/Dadarzz-Agent/releases/latest) page.

| Platform | Architecture | What to Download |
|----------|-------------|------------------|
| 🍎 **macOS** | Apple Silicon (M1/M2/M3) | `DadarzzAgent-macOS-arm64.zip` |
| 🪟 **Windows** | x64 (Intel/AMD) | `DadarzzAgent-Windows-x64.zip` |
| 🐧 **Linux** | x64 (Intel/AMD) | `DadarzzAgent-Linux-x64.zip` |
| 🐧 **Linux** | ARM64 (Raspberry Pi, etc.) | `DadarzzAgent-Linux-arm64.zip` |

### Instructions:
1. **Unzip** the downloaded file
2. **Launch**:
   - **macOS**: double-click `launch.command` *(if blocked: right-click → Open → Open)*
   - **Windows**: double-click `launch.bat` *(if SmartScreen blocks: More info → Run anyway)*
   - **Linux**: run `./launch.sh`
3. Enter your free [Groq API key](https://console.groq.com/keys) in the browser window that opens.

---

## 🛠️ Run from Source (For Developers)

If you have Python 3 installed and want to run or modify the code yourself:

**macOS:**
Double-click `install.command` to auto-install dependencies and create a launcher.

**Windows:**
Double-click `install.bat`. It will create a Desktop shortcut for you.

**Linux:**
```bash
chmod +x install.sh
./install.sh
```

---

## ❓ Troubleshooting

### 🍎 Detailed macOS Troubleshooting
Apple's security sometimes blocks downloaded apps. If `launch.command` doesn't work, open the **Terminal** app and run these commands based on your issue:

**1. "App is damaged and can't be opened"**
This is macOS Gatekeeper blocking the app. Run this exact command (assuming you unzipped it in Downloads):
```bash
xattr -cr ~/Downloads/DadarzzAgent
```

**2. "Permission denied" or the launcher opens as a text file**
You need to make the launcher executable:
```bash
chmod +x ~/Downloads/DadarzzAgent/launch.command
```

**3. "Unidentified Developer" warning**
Instead of double-clicking, simply **Right-Click** on `launch.command` → select **Open** → then click **Open** anyway.

---

### Other Issues
| Problem | Platform | Fix |
|---------|----------|-----|
| Nothing happens | All | Try launching from a Terminal/Command Prompt to see the error message |
| Port 5000 in use | All | Close any other running instances of Dadarzz Agent |
| "python not found" | Windows | Make sure to check **Add Python to PATH** when installing Python |

---

## 🛑 Stopping the App

To stop Dadarzz Agent, simply close the Terminal/Command Prompt window that opened, or press `Ctrl+C` in it.
