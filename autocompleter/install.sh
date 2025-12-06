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
    read -p "Enter your CMVault API Token or 6-Digit Device Code (Press Enter to keep existing): " INPUT_TOKEN
    INPUT_TOKEN=${INPUT_TOKEN:-$EXISTING_TOKEN}
else
    read -p "Enter your CMVault API Token or 6-Digit Device Code: " INPUT_TOKEN
fi

# Ask for API URL
read -p "Enter your CMVault API URL (default: $EXISTING_URL): " API_URL
API_URL=${API_URL:-$EXISTING_URL}

echo "$API_URL" > "$URL_FILE"
chmod 600 "$URL_FILE"

# Check if input is a 6-digit code (simple regex check)
if [[ "$INPUT_TOKEN" =~ ^[0-9]{6}$ ]]; then
    echo "Exchanging device code for API token..."
    RESPONSE=$(curl -s -X POST "$API_URL/api/exchange-token" \
        -H "Content-Type: application/json" \
        -d "{\"code\": \"$INPUT_TOKEN\"}")
    
    # Extract token using grep/sed to avoid jq dependency
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')
    
    if [[ -z "$TOKEN" ]]; then
        echo "Error: Failed to exchange code. Server response: $RESPONSE"
        exit 1
    fi
    echo "Successfully authenticated!"
else
    TOKEN="$INPUT_TOKEN"
fi

if [[ -z "$TOKEN" ]]; then
    echo "Token cannot be empty."
    exit 1
fi

echo "$TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

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

zmodload zsh/system

# Configuration
CMVAULT_URL_FILE="${HOME}/.config/cmvault/url"
CMVAULT_TOKEN_FILE="${HOME}/.config/cmvault/token"
CMVAULT_LEARN_FILE="${HOME}/.config/cmvault/learn"
CMVAULT_CACHE_DIR="${HOME}/.config/cmvault/cache"

# Ensure config files exist
if [[ ! -f "$CMVAULT_URL_FILE" ]] || [[ ! -f "$CMVAULT_TOKEN_FILE" ]]; then
    echo "CMVault: Config not found. Please run the install script."
    return
fi

# Ensure cache dir exists
if [[ ! -d "$CMVAULT_CACHE_DIR" ]]; then
    mkdir -p "$CMVAULT_CACHE_DIR"
fi

CMVAULT_API_URL=$(cat "$CMVAULT_URL_FILE")
CMVAULT_TOKEN=$(cat "$CMVAULT_TOKEN_FILE")

# State variables
typeset -g _cmvault_suggestions=()
typeset -g _cmvault_index=1
typeset -g _cmvault_fd
typeset -g _cmvault_fifo="${TMPDIR:-/tmp}/cmvault-suggestions-$$"
typeset -g _cmvault_async_pid=0

# Cleanup function
_cmvault_cleanup() {
    if [[ -n "$_cmvault_fd" ]]; then
        zle -F $_cmvault_fd 2>/dev/null
        exec {_cmvault_fd}>&- 2>/dev/null
    fi
    rm -f "$_cmvault_fifo"
}
# Register cleanup on exit
trap _cmvault_cleanup EXIT

# Create FIFO if not exists
if [[ ! -p "$_cmvault_fifo" ]]; then
    mkfifo "$_cmvault_fifo"
fi

# Open FIFO for read/write (non-blocking)
exec {_cmvault_fd}<>"$_cmvault_fifo"

# Async handler
_cmvault_async_handler() {
    local fd=$1
    local data
    
    if sysread -i $fd data; then
        [[ -z "$data" ]] && return
        
        # Split by newline
        local -a lines
        lines=("${(@f)data}")
        
        _cmvault_suggestions=($lines)
        _cmvault_index=1
        
        # Filter against current buffer to avoid stale suggestions
        local -a valid_suggestions
        for suggestion in $_cmvault_suggestions; do
            if [[ "$suggestion" == "$BUFFER"* ]]; then
                valid_suggestions+=("$suggestion")
            fi
        done
        _cmvault_suggestions=($valid_suggestions)
        
        if [[ ${#_cmvault_suggestions[@]} -gt 0 ]]; then
            _cmvault_show_suggestion
        else
            POSTDISPLAY=""
        fi
        zle -R
    fi
}

# Register handler
zle -F $_cmvault_fd _cmvault_async_handler

_cmvault_fetch_suggestions_async() {
    local query="$1"
    local os=$(uname -s)
    local pwd="$PWD"
    
    # Kill previous job
    if [[ $_cmvault_async_pid -gt 0 ]]; then
        kill $_cmvault_async_pid 2>/dev/null
    fi
    
    # Start background job
    (
        # Calculate cache key (MD5 of query + pwd)
        # Using md5sum which is standard on Linux. 
        # For cross-platform we might need checks, but user is on Linux.
        local cache_key=$(echo "${query}${pwd}" | md5sum | awk '{print $1}')
        local cache_file="${CMVAULT_CACHE_DIR}/${cache_key}"
        
        # 1. Check Cache
        # 1. Check Cache
        if [[ -f "$cache_file" ]]; then
            cat "$cache_file" > $_cmvault_fifo
            # Continue to fetch fresh data (Stale-While-Revalidate)
        fi

        # 2. Fetch from API
        local suggestions=$(curl -s --max-time 3.0 -X POST "${CMVAULT_API_URL}/api/suggest" \
            -H "Authorization: Bearer ${CMVAULT_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"query\": \"$query\", \"os\": \"$os\", \"pwd\": \"$pwd\"}")

        local parsed=$(echo "$suggestions" | grep -o '"[^"]*"' | tr -d '"')
        
        if [[ -n "$parsed" ]]; then
            # Write to cache and FIFO
            echo "$parsed" > "$cache_file"
            echo "$parsed" > $_cmvault_fifo
        fi
    ) &!
    _cmvault_async_pid=$!
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
        # Filter existing suggestions against new buffer
        local -a valid_suggestions
        for suggestion in $_cmvault_suggestions; do
            if [[ "$suggestion" == "$BUFFER"* ]]; then
                valid_suggestions+=("$suggestion")
            fi
        done
        _cmvault_suggestions=($valid_suggestions)
        
        if [[ ${#_cmvault_suggestions[@]} -gt 0 ]]; then
            _cmvault_show_suggestion
        else
            POSTDISPLAY=""
        fi
        
        # Trigger async fetch
        _cmvault_fetch_suggestions_async "$BUFFER"
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

_cmvault_accept_line() {
    POSTDISPLAY=""
    _cmvault_suggestions=()
    zle .accept-line
}

# Hook into ZLE
zle -N _cmvault_autosuggest
zle -N _cmvault_cycle_up
zle -N _cmvault_cycle_down
zle -N _cmvault_accept
zle -N accept-line _cmvault_accept_line

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
