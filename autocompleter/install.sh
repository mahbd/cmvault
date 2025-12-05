#!/bin/bash

# CMVault Autocompleter Installer

echo "Installing CMVault Autocompleter..."

# Create config directory
mkdir -p ~/.config/cmvault

# Ask for API Token
read -p "Enter your CMVault API Token: " TOKEN

if [[ -z "$TOKEN" ]]; then
    echo "Token cannot be empty."
    exit 1
fi

echo "$TOKEN" > ~/.config/cmvault/token
chmod 600 ~/.config/cmvault/token

# Create plugin file
# Ask for API URL
read -p "Enter your CMVault API URL (default: http://localhost:3000): " API_URL
API_URL=${API_URL:-http://localhost:3000}

echo "$API_URL" > ~/.config/cmvault/url
chmod 600 ~/.config/cmvault/url

# Create plugin file
cat << 'EOF' > ~/.config/cmvault/cmvault-plugin.zsh
# CMVault Intelligent Autocompleter Plugin for Zsh

# Configuration
CMVAULT_URL_FILE="${HOME}/.config/cmvault/url"
CMVAULT_TOKEN_FILE="${HOME}/.config/cmvault/token"

# Ensure config files exist
if [[ ! -f "$CMVAULT_URL_FILE" ]] || [[ ! -f "$CMVAULT_TOKEN_FILE" ]]; then
    echo "CMVault: Config not found. Please run the install script."
    return
fi

CMVAULT_API_URL=$(cat "$CMVAULT_URL_FILE")
CMVAULT_TOKEN=$(cat "$CMVAULT_TOKEN_FILE")

# Suggestion fetcher function (runs in background)
_cmvault_fetch_suggestions() {
    local query="$1"
    local os=$(uname -s)
    local pwd="$PWD"
    
    # Debounce: only fetch if query length > 1
    if [[ ${#query} -lt 2 ]]; then
        return
    fi

    # API Request
    # Using curl with timeout to ensure zero-blocking feel (though this is still sync in subshell)
    # Ideally we'd use zsh/zpty or a daemon, but for MVP we use short timeout
    local suggestions=$(curl -s --max-time 0.2 -X POST "${CMVAULT_API_URL}/api/suggest" \
        -H "Authorization: Bearer ${CMVAULT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\", \"os\": \"$os\", \"pwd\": \"$pwd\"}")

    # Parse JSON (simple parsing for MVP, assuming simple array)
    # Remove brackets and quotes
    echo "$suggestions" | sed 's/[][]//g' | sed 's/"//g' | tr ',' '\n'
}

# ZLE Widget
_cmvault_autosuggest() {
    # Only suggest if buffer is not empty
    if [[ -n "$BUFFER" ]]; then
        # Fetch suggestions (this is blocking for 0.2s max, which might be noticeable)
        # For true async, we need a more complex setup (coproc or zpty)
        # For now, let's try this.
        
        # To avoid blocking typing, we might only trigger on specific keys or idle
        # But requirement is "As-You-Type".
        
        # Optimization: Check if we have a cached suggestion for this prefix?
        
        local suggestion=$(_cmvault_fetch_suggestions "$BUFFER" | head -n 1)
        
        if [[ -n "$suggestion" ]]; then
            # Display ghost text
            # This is tricky in pure Zsh without a plugin like zsh-autosuggestions
            # We can use POSTDISPLAY
            
            # Remove the part of suggestion that matches buffer
            local remaining=${suggestion#$BUFFER}
            
            if [[ -n "$remaining" ]]; then
                POSTDISPLAY=$'\n'"  $suggestion"
                # Or inline: POSTDISPLAY=" $remaining" (dimmed)
                # Let's try inline first if it matches prefix
                if [[ "$suggestion" == "$BUFFER"* ]]; then
                     POSTDISPLAY="${remaining}"
                     # Color it gray (fg=8)
                     region_highlight=("P${#BUFFER} ${#suggestion} fg=8")
                else
                     # If not a prefix match, show below
                     POSTDISPLAY=$'\n  > '$suggestion
                fi
            else
                POSTDISPLAY=""
            fi
        else
            POSTDISPLAY=""
        fi
    else
        POSTDISPLAY=""
    fi
}

# Hook into ZLE
zle -N _cmvault_autosuggest
# We need to hook this into self-insert, but that can be heavy.
# Let's hook it to a key for testing first, or wrap self-insert.

_cmvault_self_insert() {
    zle .self-insert
    _cmvault_autosuggest
}
zle -N self-insert _cmvault_self_insert

# Key binding to accept suggestion (Right Arrow)
_cmvault_accept() {
    if [[ -n "$POSTDISPLAY" ]]; then
        # If inline
        if [[ "$POSTDISPLAY" != $'\n'* ]]; then
            BUFFER="${BUFFER}${POSTDISPLAY}"
            CURSOR=${#BUFFER}
            POSTDISPLAY=""
        fi
    else
        zle .forward-char
    fi
}
zle -N _cmvault_accept
bindkey '^[[C' _cmvault_accept # Right Arrow

# Post-execution hook
_cmvault_preexec() {
    local cmd="$1"
    local os=$(uname -s)
    local pwd="$PWD"
    
    # Send to /api/learn in background
    (curl -s -X POST "${CMVAULT_API_URL}/api/learn" \
        -H "Authorization: Bearer ${CMVAULT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"executed_command\": \"$cmd\", \"os\": \"$os\", \"pwd\": \"$pwd\", \"directory_context\": []}" &) >/dev/null 2>&1
}
autoload -U add-zsh-hook
add-zsh-hook preexec _cmvault_preexec
EOF

# Add to .zshrc
if ! grep -q "source ~/.config/cmvault/cmvault-plugin.zsh" ~/.zshrc; then
    echo "source ~/.config/cmvault/cmvault-plugin.zsh" >> ~/.zshrc
    echo "Added to ~/.zshrc"
else
    echo "Already in ~/.zshrc"
fi

echo "Installation complete! Please restart your shell or run 'source ~/.zshrc'"
