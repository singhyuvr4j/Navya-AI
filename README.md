<div align="center">
  <img alt="Navya AI Logo or UI Screenshot" src="app/(chat)/opengraph-image.png" width="800" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
  
  <br/>
  <h1 align="center">✨ Navya AI ✨</h1>

  > **⚠️ BETA VERSION - Currently in Development**
  >
  > This project is in active development. Features may change, and some functionality might be incomplete or experimental. Use with caution in production environments.

  <p align="center">
    <strong>A next-generation, open-source chat application featuring an immersive <br/> <em>Aetheris Prime</em> design aesthetic.</strong>
  </p>

  <p align="center">
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2.0-black?logo=next.js&logoColor=white" alt="Next.js" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.0-blue?logo=react&logoColor=white" alt="React 19" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://build.nvidia.com/"><img src="https://img.shields.io/badge/NVIDIA-NIM-76B900?logo=nvidia&logoColor=white" alt="NVIDIA NIM" /></a>
    <a href="https://neon.tech/"><img src="https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=neon&logoColor=black" alt="Neon Postgres" /></a>
    <a href="https://sdk.vercel.ai/docs"><img src="https://img.shields.io/badge/AI_SDK-3.0-black?logo=vercel&logoColor=white" alt="Vercel AI SDK" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  </p>
</div>

<hr />

## 🌟 Why Navya AI?

Navya AI isn't just another chat interface—it's an interactive, high-fidelity experience that leverages the fastest AI models and a stunning UI.

### 🎨 Aetheris Prime Design System
We've departed from generic CSS utilities to implement our proprietary **Aetheris Prime** design system. Driven completely by semantic Vanilla CSS, it guarantees a responsive, smooth, and breathtakingly glassmorphic visual experience.

### 🧠 Blazing Fast Inference
By communicating directly with **NVIDIA NIM**, Navya AI completely bypasses intermediate routing gateways, offering near-instantaneous streaming with industry-leading models like **DeepSeek** and **Moonshot**.

---

## ⚡ Core Features

| Feature | Description | Tech Stack |
| :--- | :--- | :--- |
| **Edge-Optimized Framework** | Built on Next.js App Router for top-tier performance | `Next.js`, `RSC` |
| **Intelligent Routing** | Auto-selects the best model based on modality detection | `AI SDK`, `NVIDIA NIM` |
| **Cloud Persistence** | Lightning-fast retrieval of chat histories and states | `Neon Serverless Postgres` |
| **Secure Authentication** | Native NextAuth powered by Neon's specialized Auth layer | `Neon Auth`, `Auth.js` |
| **Dynamic Generative UI** | Renders complex UI components seamlessly mid-conversation | `React`, `streamUI` |

---

## 🚀 Quick Start Guide

Get your own instance of Navya AI running locally in minutes!

### Prerequisites
- Node.js 18+
- `pnpm` package manager
- NVIDIA NIM API key ([Get one free here](https://build.nvidia.com/))
- Neon Postgres Database connection string

### 1. Configure the Environment
Copy the included example configuration and populate it with your API keys:
```bash
cp .env.example .env.local
```
> ⚠️ **Important:** Never commit `.env.local` to version control. Always keep your API keys and Database connections secure.

### 2. Install & Migrate
```bash
# Install the necessary packages
pnpm install

# Push database schema to Neon Postgres
pnpm db:migrate 
```

### 3. Launch Development Server
```bash
# Ignite the local environment
pnpm dev
```
> 🌐 Your Navya AI application should now be live on **[localhost:3000](http://localhost:3000)**!

---

## 🔧 Model Providers & Config

This project is tailored specifically for the **NVIDIA NIM** ecosystem to maximize token generation speeds.
Model definitions and configurations can be fine-tuned inside `lib/ai/models.ts`. 

If you wish to augment models, ensure they are compatible with the OpenAI specification, as we wrap NIM via an OpenAI-compatible interface in `lib/ai/providers.ts`.

---

## ⚠️ Known Issues

As this is a beta version, here are some known limitations:
- **UI Responsiveness:** Some advanced glassmorphic components might not render optimally on extremely old device browsers.
- **Model Switching:** Switching between multimodal capabilities mid-stream can sometimes cause slight delays.
- **Database Cold Starts:** Neon free tier databases pause after inactivity; initial boot sequence might take a few seconds longer.

## 🔧 Troubleshooting

### Build Errors
If you run into module resolution issues:
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
```

### Database Issues
**`Error: Can't reach database server`**
- Ensure your Neon Postgres instance is awake and active.
- Verify your `.env.local` connection string is properly formatted.

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're a developer, designer, or just passionate about AI, there are many ways to contribute:

### Ways to Contribute
- 🐛 **Report Bugs** - Found a bug? Open an issue on our tracker.
- 💡 **Suggest Features** - Have an idea? We'd love to hear it!
- 🔧 **Submit Pull Requests** - Fix bugs, optimize code, or add new features.
- 📖 **Improve Documentation** - Help make our docs better.
- ⭐ **Star the Repo** - Show your support!

### Getting Started with Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Check our Issues page for good first issues!

---

## 🛡️ Security

### Reporting Vulnerabilities
If you discover a security vulnerability, please do NOT open a public issue. Instead, reach out via direct message or private vulnerability reporting.

### API Key Safety
- Never commit your NVIDIA API key to the repository
- Use environment variables for all sensitive data
- The `.env.local` file is excluded from git via `.gitignore`

---

## 📞 Support

- 🐛 **Bug Reports**: Open a GitHub Issue
- 💬 **Questions**: Start a GitHub Discussion

---

<div align="center">
  <sub>Built with ❤️ for advanced agentic AI experiences.</sub>
  <br/><br/>
  <strong>⭐ If you found this project helpful, please consider giving it a star! ⭐</strong>
</div>
