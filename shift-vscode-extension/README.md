# Loom Dev Bridge ⚡

**The official bridge between Loom AI and your local development environment.**

Loom Dev Bridge transforms your IDE from a static editor into an interactive component of the Loom AI ecosystem. It enables seamless, bi-directional communication between the Loom Control Plane and your local source code, allowing for "magical but controlled" project imports and structural analysis.

---

## 🏗️ Core Principles

### **1. Trust-First Security**
Loom Dev Bridge operates on the principle of **Least Privilege**.
- **No Background Crawling**: We only access files required for specific authorized jobs.
- **Revocable Tokens**: Connection is managed via scoped, revocable machine tokens.
- **Local Handshake**: Pairing is initiated by you, never by us.

### **2. Intelligence, not Intrusion**
The extension serves as the **Hands & Sensors** for Loom. The "Brain" (Intelligence) lives in the Loom backend, ensuring your IDE stays lightweight and responsive.

### **3. Transparency**
Every action is reported in the real-time **Sync Log**, providing absolute visibility into what the extension is doing and why.

---

## 🚀 Key Features

- **✨ One-Click Project Import**: Transform a web-designed Loom project into local source code instantly.
- **🔍 Structural Insights**: Real-time detection of frameworks (Next.js, React, etc.) and component health.
- **📡 Deterministic Polling**: A robust, low-overhead job system that picks up tasks only when you're ready.
- **🎨 Calm UI**: A minimal, deterministic sidebar interface that stays out of your way until you need it.

---

## 🛠️ Usage

### **1. Installation**
Install **Loom Dev Bridge** directly from the VS Code Marketplace.

### **2. Connecting**
1. Open the Loom sidebar icon ✨ in VS Code.
2. Click **Connect with API Key**.
3. Go to [Loom Web Dashboard](http://localhost:3000/dashboard/settings) to generate a key if you don't have one.
4. Paste your key (starts with `loom_`) into the VS Code input box.
5. You're connected!

---

## ⚙️ Configuration

- `loom.apiUrl`: The endpoint for the Loom Control Plane (Default: `https://api.loom-ai.com`).
- `loom.apiKey`: Securely stored machine token for authentication.

---

## 📜 License
MIT © MGE / Loom AI.
