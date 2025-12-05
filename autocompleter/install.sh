#!/bin/bash

# CMVault Autocompleter Installer

echo "Installing CMVault Autocompleter..."

# Create config directory
mkdir -p ~/.config/cmvault

CONFIG_DIR="$HOME/.config/cmvault"
TOKEN_FILE="$CONFIG_DIR/token"
URL_FILE="$CONFIG_DIR/url"

# Read existing config if available
EXISTING_TOKEN=""
if [[ -f "$TOKEN_FILE" ]]; then
    EXISTING_TOKEN=$(cat "$TOKEN_FILE")
fi

EXISTING_URL="https://cmd.mahmudul.com.bd"
if [[ -f "$URL_FILE" ]]; then
    EXISTING_URL=$(cat "$URL_FILE")
fi

# Ask for API Token
if [[ -n "$EXISTING_TOKEN" ]]; then
    read -p "Enter your CMVault API Token (Press Enter to keep existing): " TOKEN
    TOKEN=${TOKEN:-$EXISTING_TOKEN}
else
    read -p "Enter your CMVault API Token: " TOKEN
fi

if [[ -z "$TOKEN" ]]; then
    echo "Token cannot be empty."
    exit 1
fi

echo "$TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

# Ask for API URL
read -p "Enter your CMVault API URL (default: $EXISTING_URL): " API_URL
API_URL=${API_URL:-$EXISTING_URL}

echo "$API_URL" > "$URL_FILE"
chmod 600 "$URL_FILE"

LEARN_FILE="$CONFIG_DIR/learn"
EXISTING_LEARN="true"
if [[ -f "$LEARN_FILE" ]]; then
    EXISTING_LEARN=$(cat "$LEARN_FILE")
fi

read -p "Enable learning mode? (captures executed commands) [Y/n]: " ENABLE_LEARN
ENABLE_LEARN=${ENABLE_LEARN:-"y"}

if [[ "$ENABLE_LEARN" =~ ^[Yy]$ ]]; then
    echo "true" > "$LEARN_FILE"
else
    echo "false" > "$LEARN_FILE"
fi
chmod 600 "$LEARN_FILE"

# Create plugin file
cat << 'EOF' > ~/.config/cmvault/cmvault-plugin.zsh
# CMVault Intelligent Autocompleter Plugin for Zsh

# Configuration
CMVAULT_URL_FILE="${HOME}/.config/cmvault/url"
CMVAULT_TOKEN_FILE="${HOME}/.config/cmvault/token"
CMVAULT_LEARN_FILE="${HOME}/.config/cmvault/learn"

# Ensure config files exist
if [[ ! -f "$CMVAULT_URL_FILE" ]] || [[ ! -f "$CMVAULT_TOKEN_FILE" ]]; then
    echo "CMVault: Config not found. Please run the install script."
    return
fi

CMVAULT_API_URL=$(cat "$CMVAULT_URL_FILE")
CMVAULT_TOKEN=$(cat "$CMVAULT_TOKEN_FILE")

# State variables
_cmvault_suggestions=()
_cmvault_index=1

# Suggestion fetcher function
_cmvault_fetch_suggestions() {
    local query="$1"
    local os=$(uname -s)
    local pwd="$PWD"
    
    # Debounce: only fetch if query length > 0
    if [[ ${#query} -lt 1 ]]; then
        return
    fi

    # API Request
    local suggestions=$(curl -s --max-time 0.2 -X POST "${CMVAULT_API_URL}/api/suggest" \
        -H "Authorization: Bearer ${CMVAULT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\", \"os\": \"$os\", \"pwd\": \"$pwd\"}")

    # Parse JSON array of strings
    # Extract strings inside quotes and remove quotes
    echo "$suggestions" | grep -o '"[^"]*"' | tr -d '"'
}

_cmvault_show_suggestion() {
    local suggestion="${_cmvault_suggestions[$_cmvault_index]}"
    local total=${#_cmvault_suggestions[@]}
    
    # 1. Inline part (only if prefix matches)
    local remaining=""
    if [[ "$suggestion" == "$BUFFER"* ]]; then
        remaining=${suggestion#$BUFFER}
    fi
    
    local output="$remaining"
    
    # Reset highlights
    region_highlight=()
    
    # Highlight inline part (gray)
    if [[ -n "$remaining" ]]; then
        region_highlight+=("P0 ${#remaining} fg=8")
    fi
    
    # 2. List below
    output+=$'\n'
    local current_len=${#output} # Length so far (including newline)
    
    for ((i=1; i<=total; i++)); do
        local item="${_cmvault_suggestions[$i]}"
        local line=""
        local is_selected=0
        
        if [[ $i -eq $_cmvault_index ]]; then
            line="> $item"
            is_selected=1
        else
            line="  $item"
        fi
        
        output+="$line"
        local line_len=${#line}
        
        # Highlight logic
        if [[ $is_selected -eq 1 ]]; then
            # Cyan for selected
            region_highlight+=("P${current_len} $((current_len + line_len)) fg=6")
        else
            # Gray for others
            region_highlight+=("P${current_len} $((current_len + line_len)) fg=8")
        fi
        
        output+=$'\n'
        ((current_len += line_len + 1))
    done
    
    # Strip last newline
    output="${output%$'\n'}"
    
    POSTDISPLAY="$output"
}

# ZLE Widget
_cmvault_autosuggest() {
    # Only suggest if buffer is not empty
    if [[ -n "$BUFFER" ]]; then
        # Fetch suggestions into array (split by newline)
        _cmvault_suggestions=("${(@f)$(_cmvault_fetch_suggestions "$BUFFER")}")
        _cmvault_index=1
        
        if [[ ${#_cmvault_suggestions[@]} -gt 0 ]]; then
            _cmvault_show_suggestion
        else
            POSTDISPLAY=""
        fi
    else
        POSTDISPLAY=""
        _cmvault_suggestions=()
    fi
}

_cmvault_cycle_up() {
    if [[ -n "$POSTDISPLAY" ]] && [[ ${#_cmvault_suggestions[@]} -gt 1 ]]; then
        ((_cmvault_index--))
        if [[ $_cmvault_index -lt 1 ]]; then
            _cmvault_index=${#_cmvault_suggestions[@]}
        fi
        _cmvault_show_suggestion
    else
        zle .up-line-or-history
    fi
}

_cmvault_cycle_down() {
    if [[ -n "$POSTDISPLAY" ]] && [[ ${#_cmvault_suggestions[@]} -gt 1 ]]; then
        ((_cmvault_index++))
        if [[ $_cmvault_index -gt ${#_cmvault_suggestions[@]} ]]; then
            _cmvault_index=1
        fi
        _cmvault_show_suggestion
    else
        zle .down-line-or-history
    fi
}

_cmvault_accept() {
    if [[ -n "$POSTDISPLAY" ]]; then
        local suggestion="${_cmvault_suggestions[$_cmvault_index]}"
        if [[ -n "$suggestion" ]]; then
            BUFFER="$suggestion"
            CURSOR=${#BUFFER}
        fi
        POSTDISPLAY=""
        _cmvault_suggestions=()
    else
        zle .forward-char
    fi
}

# Hook into ZLE
zle -N _cmvault_autosuggest
zle -N _cmvault_cycle_up
zle -N _cmvault_cycle_down
zle -N _cmvault_accept

_cmvault_self_insert() {
    zle .self-insert
    _cmvault_autosuggest
}
zle -N self-insert _cmvault_self_insert

_cmvault_backward_delete_char() {
    zle .backward-delete-char
    _cmvault_autosuggest
}
zle -N backward-delete-char _cmvault_backward_delete_char

_cmvault_vi_backward_delete_char() {
    zle .vi-backward-delete-char
    _cmvault_autosuggest
}
zle -N vi-backward-delete-char _cmvault_vi_backward_delete_char

# Key bindings
# Key bindings
bindkey '^[[1;5A' _cmvault_cycle_up   # Ctrl + Up Arrow
bindkey '^[[1;5B' _cmvault_cycle_down # Ctrl + Down Arrow
bindkey '^[[C' _cmvault_accept        # Right Arrow
bindkey '^[OC' _cmvault_accept        # Right Arrow (alternative)

# Ensure bindings work in both emacs and vi modes
bindkey -M emacs '^[[1;5A' _cmvault_cycle_up
bindkey -M emacs '^[[1;5B' _cmvault_cycle_down
bindkey -M emacs '^[[C' _cmvault_accept
bindkey -M emacs '^[OC' _cmvault_accept

bindkey -M viins '^[[1;5A' _cmvault_cycle_up
bindkey -M viins '^[[1;5B' _cmvault_cycle_down
bindkey -M viins '^[[C' _cmvault_accept
bindkey -M viins '^[OC' _cmvault_accept

# Post-execution hook for learning
_cmvault_preexec() {
    # Check if learning is enabled
    if [[ -f "$CMVAULT_LEARN_FILE" ]]; then
        local learn_enabled=$(cat "$CMVAULT_LEARN_FILE")
        if [[ "$learn_enabled" != "true" ]]; then
            return
        fi
    fi

    local cmd="$1"
    local os=$(uname -s)
    local pwd="$PWD"
    
    # Capture ls output (limit to first 20 lines)
    local ls_output=$(ls -1 2>/dev/null | head -n 20)
    ls_output="${ls_output//$'\n'/\\n}"
    
    (curl -s -X POST "${CMVAULT_API_URL}/api/learn" \
        -H "Authorization: Bearer ${CMVAULT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"executed_command\": \"$cmd\", \"os\": \"$os\", \"pwd\": \"$pwd\", \"ls_output\": \"$ls_output\"}" &) >/dev/null 2>&1
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
