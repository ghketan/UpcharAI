# UpcharAI — Frontend Application

> **Clinical Triage & Decision Support UI for Rural Health Centres**  
> Built with **React 19**, **TypeScript**, and **Tailwind CSS v4**.

[![Live Deployment](https://img.shields.io/badge/Live_Deployment-upchar--ai--beta.vercel.app-0070F3?style=for-the-badge&logo=vercel&logoColor=white)](https://upchar-ai-beta.vercel.app/)

---

## 🌐 Live Production Application

The frontend is live and deployed at:  
👉 **[https://upchar-ai-beta.vercel.app/](https://upchar-ai-beta.vercel.app/)**

---

## Features

- **Single-Operator Rapid Intake Modal:** Optimized for frontline health workers (ANMs, ASHAs) with physiological plausibility validation (<90s completion).
- **Live Urgency Queue:** Real-time priority display sorted dynamically by clinical urgency tier (EMERGENCY > URGENT > ROUTINE) and wait duration.
- **Explainable Clinical Flags:** Visual breakdowns of Royal College of Physicians NEWS2 component scores and triggered red-flag safety rules.
- **Simulated Emergency SOS & Referral:** Transfer slip generation and regional hospital routing for acute emergencies.
- **Sahayak Multilingual Chatbot:** Health education chat supporting English, Hindi (Devanagari), and Hinglish with safety pre-filters.

---

## Demo Credentials

You can test different personas on the live application:

| Persona | Role | Username | Password |
|---|---|---|---|
| **Dr. Ananya Sharma** | Clinician / Doctor | `doctor` | `doctor123` |
| **Pooja Devi** | Triage Nurse / ASHA | `staff` | `staff123` |
| **Sita Devi** | Citizen / Patient | `user` | `user123` |

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173/`. Vite automatically proxies `/api` requests to `http://127.0.0.1:8000`.

### 3. Build for Production
```bash
npm run build
```
Builds optimized production artifacts to `dist/`.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API (used in cloud deployments) | `""` (relies on local proxy or same domain) |
