# Code Reviewer

Code Reviewer is an advanced desktop application built to analyze source code for security vulnerabilities, code smells, architecture flaws, and performance bottlenecks. 

It combines a blazing-fast native **C++ deterministic engine** with a **Deep AI Pipeline** (powered by the Groq `gpt-oss-120b` model) to provide state-of-the-art static analysis and comprehensive code auditing.

## Features
- **Deterministic C++ Engine**: Swiftly flags hardcoded secrets, unsafe string copies, and dangerous command executions.
- **Deep AI Agent**: Intelligently reads codebase context to find complex logical bugs, memory leaks, and architectural tight-coupling.
- **Risk Correlation**: Automatically calculates confidence, severity, and risk scores, presenting them in a beautiful React UI.

## Tech Stack
- **UI Shell**: Electron + React 19 + Tailwind CSS + Vite
- **Native Backend**: C++17 (MSVC)
- **AI Integration**: Groq API (LLaMA/GPT OSS models)

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Compile the Native C++ Engine**
   ```bash
   npm run build:native
   ```

3. **Set your Groq API Key** (Required for the Deep AI pipeline)
   ```powershell
   $env:GROQ_API_KEY="gsk_your_api_key_here"
   ```

4. **Launch the Application**
   ```bash
   npm run dev
   ```

## Usage
Simply start the application and upload a file or project ZIP. The hybrid engine will run side-by-side, analyze the code, and return rich JSON reports and a dashboard populated with strict security recommendations.
