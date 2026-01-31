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
# CMVault Zsh Autocomplete (clean version, no logs)

zmodload zsh/system

CMVAULT_URL_FILE="$HOME/.config/cmvault/url"
CMVAULT_TOKEN_FILE="$HOME/.config/cmvault/token"

: ${CMVAULT_DEBOUNCE:=0.35}
: ${CMVAULT_TIMEOUT:=5.0}
: ${CMVAULT_MAX_SUGGESTIONS:=6}

# ---- config ----
[[ -f "$CMVAULT_URL_FILE" && -f "$CMVAULT_TOKEN_FILE" ]] || return
CMVAULT_API_URL=$(<"$CMVAULT_URL_FILE")
CMVAULT_TOKEN=$(<"$CMVAULT_TOKEN_FILE")

# ---- state ----
typeset -g _cm_sug=()
typeset -g _cm_idx=1
typeset -g _cm_timer_pid=0
typeset -g _cm_async_pid=0

typeset -g _cm_ipc="${TMPDIR:-/tmp}/cmvault-ipc-$$.txt"
typeset -g _cm_raw="${TMPDIR:-/tmp}/cmvault-raw-$$.bin"
typeset -g _cm_rid="${TMPDIR:-/tmp}/cmvault-rid-$$.txt"
typeset -gi _cm_last_seen=0
typeset -g _cm_prev_tmout="${TMOUT-}"

print -r -- 0 >| "$_cm_rid"

_cleanup(){
  [[ $_cm_timer_pid -gt 0 ]] && kill $_cm_timer_pid 2>/dev/null
  [[ $_cm_async_pid -gt 0 ]] && kill $_cm_async_pid 2>/dev/null
  rm -f "$_cm_ipc" "$_cm_raw" "$_cm_rid" 2>/dev/null
  if [[ -n "$_cm_prev_tmout" ]]; then TMOUT="$_cm_prev_tmout"; else unset TMOUT 2>/dev/null; fi
}
trap _cleanup EXIT

# ---- rid helpers ----
_cur_rid(){
  local r
  r="$(cat -- "$_cm_rid" 2>/dev/null)"
  [[ "$r" == <-> ]] || r=0
  print -r -- "$r"
}
_next_rid(){
  local r="$(_cur_rid)"
  r=$(( r + 1 ))
  print -r -- "$r" >| "$_cm_rid"
  print -r -- "$r"
}

# ---- newline unescape ----
_cm_unescape_newlines() {
  local s="$1"
  s="${s//\\\\n/\\n}"
  print -r -- "${s//\\n/$'\n'}"
}

# ---- UI ----
_clear(){
  _cm_sug=()
  _cm_idx=1
  zle -M ""
  zle -R
}

_render(){
  (( ${#_cm_sug[@]} > 0 )) || return 0
  local total=${#_cm_sug[@]} i msg="" item

  for ((i=1; i<=total; i++)); do
    item="$(_cm_unescape_newlines "${_cm_sug[$i]}")"
    if (( i == _cm_idx )); then
      msg+="> $item"$'\n'
    else
      msg+="  $item"$'\n'
    fi
  done

  msg="${msg%$'\n'}"
  zle -M "$msg"
  zle -R
}

# ---- poller ----
TMOUT=1
TRAPALRM(){ zle && _poll; }

_poll(){
  [[ -f "$_cm_ipc" ]] || return 0

  local expected="$(_cur_rid)" rid
  rid="$(head -n 1 -- "$_cm_ipc" 2>/dev/null)" || return 0
  [[ "$rid" == <-> ]] || return 0

  (( rid > _cm_last_seen )) || return 0
  _cm_last_seen=$rid
  (( rid == expected )) || return 0

  local raw
  raw="$(tail -n +2 -- "$_cm_ipc" 2>/dev/null)" || return 0

  local -a lines out
  lines=("${(@f)raw}")
  out=()
  local s
  for s in "${lines[@]}"; do
    [[ -n "$s" ]] || continue
    out+=("$s")
    (( ${#out[@]} >= CMVAULT_MAX_SUGGESTIONS )) && break
  done

  _cm_sug=("${out[@]}")
  _cm_idx=1

  (( ${#_cm_sug[@]} > 0 )) && _render || _clear
}

_kill_timer(){ [[ $_cm_timer_pid -gt 0 ]] && kill $_cm_timer_pid 2>/dev/null && _cm_timer_pid=0; }
_kill_async(){ [[ $_cm_async_pid -gt 0 ]] && kill $_cm_async_pid 2>/dev/null && _cm_async_pid=0; }

# ---- fetch ----
_fetch_async(){
  local query="$1"
  local os=$(uname -s)
  local pwd="$PWD"
  local rid="$(_next_rid)"

  _kill_async

  (
    curl -fsS --max-time "$CMVAULT_TIMEOUT" -X POST "${CMVAULT_API_URL}/api/suggest" \
      -H "Authorization: Bearer ${CMVAULT_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"$query\", \"os\": \"$os\", \"pwd\": \"$pwd\"}" \
      -o "$_cm_raw" 2>/dev/null || exit 0

    local parsed
    parsed="$(python3 - <<'PY' "$_cm_raw" 2>/dev/null
import json, pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text("utf-8", errors="replace").strip()
if not text: sys.exit(0)

obj = text
for _ in range(5):
    obj = json.loads(obj)
    if isinstance(obj, str):
        obj = obj.strip()
        continue
    break

if isinstance(obj, dict) and "suggestions" in obj:
    obj = obj["suggestions"]
    for _ in range(5):
        if isinstance(obj, str):
            obj = json.loads(obj.strip())
        else:
            break

if not isinstance(obj, list): sys.exit(0)

out=[]
for s in obj:
    if isinstance(s, str):
        s = s.strip()
        if s:
            out.append(s)
print("\n".join(out))
PY
)" || exit 0

    [[ -n "$parsed" ]] || exit 0
    local tmp="${_cm_ipc}.tmp"
    { print -r -- "$rid"; print -r -- "$parsed"; } >| "$tmp" || exit 0
    mv -f -- "$tmp" "$_cm_ipc" || exit 0
  ) &!
  _cm_async_pid=$!
}

# ---- debounce ----
_schedule(){
  _kill_timer
  [[ -n "$BUFFER" ]] || { _clear; _kill_async; return 0; }

  local snap="$BUFFER"
  (
    sleep "$CMVAULT_DEBOUNCE"
    [[ "$BUFFER" == "$snap" ]] || exit 0
    _fetch_async "$BUFFER"
  ) &!
  _cm_timer_pid=$!
}

# ---- widgets ----
_autosuggest(){ _schedule; }

_cycle_up(){
  if (( ${#_cm_sug[@]} > 1 )); then
    ((_cm_idx--)); (( _cm_idx < 1 )) && _cm_idx=${#_cm_sug[@]}
    _render
  else
    zle .up-line-or-history
  fi
}
_cycle_down(){
  if (( ${#_cm_sug[@]} > 1 )); then
    ((_cm_idx++)); (( _cm_idx > ${#_cm_sug[@]} )) && _cm_idx=1
    _render
  else
    zle .down-line-or-history
  fi
}
_accept(){
  if (( ${#_cm_sug[@]} > 0 )); then
    BUFFER="$(_cm_unescape_newlines "${_cm_sug[$_cm_idx]}")"
    CURSOR=${#BUFFER}
    _clear
  else
    zle .forward-char
  fi
}
_accept_line(){ _clear; _kill_timer; _kill_async; zle .accept-line; }

zle -N _autosuggest
zle -N _cycle_up
zle -N _cycle_down
zle -N _accept
zle -N accept-line _accept_line

_self_insert(){ zle .self-insert; _autosuggest; }
zle -N self-insert _self_insert
_backspace(){ zle .backward-delete-char; _autosuggest; }
zle -N backward-delete-char _backspace
_vi_backspace(){ zle .vi-backward-delete-char; _autosuggest; }
zle -N vi-backward-delete-char _vi_backspace

# Key bindings (Up/Down + Right)
bindkey '^[[1;5A' _cycle_up
bindkey '^[[1;5B' _cycle_down
bindkey '^[[C' _accept
bindkey '^[OC' _accept
EOF

# Add to .zshrc
if ! grep -q "source ~/.config/cmvault/cmvault-plugin.zsh" ~/.zshrc; then
    echo "source ~/.config/cmvault/cmvault-plugin.zsh" >> ~/.zshrc
    echo "Added to ~/.zshrc"
else
    echo "Already in ~/.zshrc"
fi

echo "Installation complete! Please restart your shell or run 'source ~/.zshrc'"
