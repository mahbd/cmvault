# CMVault - The Developer's Command Vault

CMVault is a powerful command management system designed for developers. It serves as a central repository for your most used, complex, or hard-to-remember shell commands, offering intelligent autocompletion directly in your terminal.

## 🌐 Live Demo
**[https://cmd.mahmudul.com.bd](https://cmd.mahmudul.com.bd)**

## ✨ Features

### 🚀 Smart Command Management
*   **Centralized Storage**: Keep all your snippets, scripts, and one-liners in one place.
*   **Multi-Platform Support**: Tag commands for specific OSs (Linux, macOS, Windows) or make them universal.
*   **Privacy Control**: Toggle commands between Public (sharable) and Private.
*   **Tagging System**: Organize commands with custom tags for easy filtering.

### 💻 Intelligent Terminal Autocompleter
*   **Zsh Integration**: A robust Zsh plugin that integrates directly with your shell.
*   **Real-time Suggestions**: Get command suggestions as you type based on your personalized vault.
*   **Context Aware**: Auto-fetches suggestions relevant to your current workflow.
*   **Non-Blocking & Async**: Suggestions are fetched asynchronously to ensure zero typing lag.
*   **Persistent Caching**: Stale-while-revalidate caching ensures instant feedback even with slow networks.
*   **Smart Learning Mode**: Optionally captures executed commands to suggest them later ("Learn" -> "Promote" workflow).

### 🔒 Secure Authentication
*   **Modern Auth**: Supports Google OAuth for passwordless login.
*   **API Tokens**: Generate secure API tokens for CLI access.
*   **Device Code Flow**: Easily authenticate new terminal devices using a 6-digit temporary code—no need to copy-paste long tokens!

## 🛠️ Tech Stack

**Frontend & Backend**:
- **Next.js 16** - React framework for production
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Efficient form handling

**Database & ORM**:
- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe database layer

**Authentication**:
- **Better Auth** - Modern authentication framework
- **Google OAuth** - Passwordless authentication

**UI Components**:
- **Radix UI** - Accessible React components
- **Sonner** - Toast notifications
- **Lucide React** - Icon library

## 🛠️ Installation

### Web Application (Self-Hosting)
1.  **Clone the repo**:
    ```bash
    git clone https://github.com/mahbd/cmvault.git
    cd cmvault
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment**:
    Copy `.env.example` to `.env` and configure your database (SQLite/Postgres) and auth providers.
4.  **Sync Database Schema**:
    ```bash
    npx drizzle-kit push
    ```
    This command will automatically create all necessary tables in your PostgreSQL database.

5.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
    The server will start on http://localhost:3000 (or next available port)

### Terminal Plugin (Client)
To install the autocompleter in your Zsh shell:

1.  **Run the Installer**:
    ```bash
    bash <(curl -s https://raw.githubusercontent.com/mahbd/cmvault/main/autocompleter/install.sh)
    ```
    *(Replace URL with your self-hosted instance if applicable)*

2.  **Authenticate**:
    The installer will ask for your **API Token** or a **6-Digit Device Code**.
    *   Go to **Settings** on the web dashboard to generate a code.
    *   Enter it in the terminal to instantly link your device.

3.  **Restart Shell**:
    ```bash
    source ~/.zshrc
    ```

## 📖 Usage Guide

### Using the Dashboard
*   **Create**: Press `+` or click "Add Command". Enter title, command, platform, and tags.
*   **Filter**: Use the platform dropdown to see commands for your specific OS.
*   **Search**: Press `/` to focus the search bar. Fuzzy search finds commands by keywords.
*   **Edit/Delete**: Managing existing commands is just a click away.

### Using the Autocompleter
Just start typing!
*   **Ghost Text**: Suggestions appear in gray.
*   **Cycle Options**: Use `Up` / `Down` arrows to cycle through multiple matching commands.
*   **Accept**: Press `Right Arrow` to accept a suggestion.

### Learning Mode
If enabled during installation, CMVault captures commands you execute.
1.  Run commands as usual in your terminal.
2.  Visit the **Learned** page in the dashboard.
3.  Click **Promote** to turn a captured command into a permanent, sharable snippet in your vault.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
