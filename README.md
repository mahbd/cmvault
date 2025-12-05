# CMVault - Command Manager Vault

CMVault is a personal command manager that helps you store, organize, and recall your terminal commands. It features a modern web dashboard and an intelligent Zsh plugin for real-time autocompletion in your terminal.

## Features

- **Command Management**: Store commands with titles, descriptions, and tags.
- **Organization**: Filter by tags, platforms (Linux, macOS, Windows, etc.), and search instantly.
- **Intelligent Autocompleter**: A Zsh plugin that suggests commands from your vault as you type.
- **Privacy**: Mark commands as Public or Private.
- **Modern UI**: Built with Next.js, Tailwind CSS, and ShadCN UI.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/cmvault.git
    cd cmvault
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up the database (SQLite):
    ```bash
    npx prisma db push
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Intelligent Terminal Autocompleter

CMVault comes with a Zsh plugin that connects to your local instance to provide AI-like command suggestions.

### Setup

1.  **Generate API Token**:
    - Go to the Dashboard -> **Settings & API**.
    - Enter a name (e.g., "My Laptop") and click **Generate**.
    - Copy the generated token.

2.  **Install the Plugin**:
    Run the installation script:
    ```bash
    bash <(curl -s https://raw.githubusercontent.com/mahbd/cmvault/main/autocompleter/install.sh)
    ```
    Enter your API token and backend URL when prompted.

3.  **Activate**:
    Restart your shell or run:
    ```bash
    source ~/.zshrc
    ```

### Usage

- **Type**: Start typing a command in your terminal.
- **Suggest**: If a matching command exists in your vault, it will appear as gray "ghost text".
- **Accept**: Press `Right Arrow` to accept the suggestion.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite (via Prisma ORM)
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI
- **Shell Integration**: Zsh Scripting

## License

MIT
