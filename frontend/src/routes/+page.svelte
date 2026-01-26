<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    createCommand,
    createDeviceCode,
    deleteCommand,
    fetchCommands,
    fetchLearned,
    promoteLearned,
    setAuthToken,
    getAuthToken
  } from '$lib/api';
  import type { Command, LearnedCommand, Visibility } from '$lib/types';

  const initialForm = {
    title: '',
    text: '',
    description: '',
    platform: 'Linux',
    visibility: 'PRIVATE' as Visibility,
    tags: ''
  };

  let form = { ...initialForm };
  let commands: Command[] = [];
  let commandsTotal = 0;
  let commandsLimit = 20;
  let commandsOffset = 0;
  let learned: LearnedCommand[] = [];
  let learnedTotal = 0;
  let learnedLimit = 20;
  let learnedOffset = 0;
  let searchTerm = '';
  let loadingCommands = false;
  let loadingLearned = false;
  let creating = false;
  let errorMessage = '';
  let toast = '';
  let deviceCode: string | null = null;
  let deviceExpires: string | null = null;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let activeToken: string | null = null;
  let ready = false;

  onMount(() => {
    activeToken = getAuthToken();
    if (activeToken) {
      ready = true;
      refreshAll();
    } else {
      goto('/auth');
    }
  });

  const setToast = (message: string) => {
    toast = message;
    setTimeout(() => (toast = ''), 2200);
  };

  const setError = (message: string) => {
    errorMessage = message;
    setTimeout(() => (errorMessage = ''), 2600);
  };

  async function refreshAll() {
    if (!getAuthToken()) {
      commands = [];
      learned = [];
      return;
    }
    await Promise.all([loadCommands(), loadLearned()]);
  }

  async function loadCommands() {
    if (!getAuthToken()) {
      commands = [];
      return;
    }
    loadingCommands = true;
    try {
      const page = await fetchCommands({
        search: searchTerm || undefined,
        limit: commandsLimit,
        offset: commandsOffset
      });
      commands = page.items;
      commandsTotal = page.total;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load commands');
    } finally {
      loadingCommands = false;
    }
  }

  async function loadLearned() {
    if (!getAuthToken()) {
      learned = [];
      return;
    }
    loadingLearned = true;
    try {
      const page = await fetchLearned({
        limit: learnedLimit,
        offset: learnedOffset
      });
      learned = page.items;
      learnedTotal = page.total;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load learned commands');
    } finally {
      loadingLearned = false;
    }
  }

  function parseTags(raw: string): string[] {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function handleCreate() {
    if (!form.text.trim()) {
      setError('Command text is required');
      return;
    }

    creating = true;
    try {
      await createCommand({
        title: form.title || undefined,
        text: form.text,
        description: form.description || undefined,
        platform: form.platform || 'Unknown',
        visibility: form.visibility,
        tags: parseTags(form.tags)
      });
      form = { ...initialForm };
      setToast('Saved command');
      await loadCommands();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create command');
    } finally {
      creating = false;
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCommand(id);
      commands = commands.filter((c) => c.id !== id);
      setToast('Deleted command');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  async function handlePromote(item: LearnedCommand) {
    try {
      await promoteLearned(item.id, {
        title: item.content.slice(0, 64),
        description: item.pwd ?? '',
        platform: 'Linux',
        visibility: 'PRIVATE',
        tags: []
      });
      setToast('Promoted to your vault');
      await Promise.all([loadLearned(), loadCommands()]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Promotion failed');
    }
  }

  async function handleSearchChange(value: string) {
    searchTerm = value;
    commandsOffset = 0;
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    searchTimer = setTimeout(() => loadCommands(), 220);
  }

  async function handleDeviceCode() {
    try {
      const { code, expires_at } = await createDeviceCode();
      deviceCode = code;
      deviceExpires = new Date(expires_at).toLocaleTimeString();
      setToast('Device code created');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not create device code');
    }
  }

  function handleLogout() {
    setAuthToken(null);
    activeToken = null;
    setToast('Logged out');
    goto('/auth');
  }

  function nextCommandsPage() {
    if (commandsOffset + commandsLimit < commandsTotal) {
      commandsOffset += commandsLimit;
      loadCommands();
    }
  }

  function prevCommandsPage() {
    commandsOffset = Math.max(0, commandsOffset - commandsLimit);
    loadCommands();
  }

  function nextLearnedPage() {
    if (learnedOffset + learnedLimit < learnedTotal) {
      learnedOffset += learnedLimit;
      loadLearned();
    }
  }

  function prevLearnedPage() {
    learnedOffset = Math.max(0, learnedOffset - learnedLimit);
    loadLearned();
  }
</script>

<svelte:head>
  <title>CMVault · Rust + Svelte</title>
  <meta
    name="description"
    content="Rust-powered Actix API with a Svelte dashboard for your shell command vault."
  />
</svelte:head>

{#if ready && activeToken}
<main class="page">
  <section class="hero">
    <div class="actions">
      <button class="primary" on:click={refreshAll} disabled={!activeToken}>Sync data</button>
      <button class="ghost" on:click={handleDeviceCode} disabled={!activeToken}>Generate device code</button>
      <button class="ghost" on:click={handleLogout}>Logout</button>
      {#if deviceCode}
        <span class="code-chip">Code: {deviceCode} · expires {deviceExpires}</span>
      {/if}
      {#if toast}
        <span class="status">{toast}</span>
      {/if}
      {#if errorMessage}
        <span class="status" style="border-color:#ef4444;color:#fca5a5">{errorMessage}</span>
      {/if}
    </div>
  </section>

  {#if activeToken}
    <section class="grid">
      <div class="panel" style="grid-area: form">
        <h3>Save a command</h3>
        <small>Authenticated via your token. Save commands to your vault.</small>
      <div class="form-grid" style="margin-top:0.8rem">
        <label>
          Title
          <input bind:value={form.title} placeholder="Optional summary" />
        </label>
        <label>
          Command
          <textarea bind:value={form.text} placeholder="kubectl get pods -A | head -5"></textarea>
        </label>
        <label>
          Description
          <textarea bind:value={form.description} placeholder="Why this command exists"></textarea>
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
          <label>
            Platform
            <input bind:value={form.platform} placeholder="Linux / macOS / Windows" />
          </label>
          <label>
            Visibility
            <select bind:value={form.visibility}>
              <option value="PRIVATE">Private</option>
              <option value="PUBLIC">Public</option>
            </select>
          </label>
        </div>
        <label>
          Tags
          <input bind:value={form.tags} placeholder="deploy, docker, db" />
        </label>
        <div class="actions" style="justify-content:flex-end; margin-top:0.4rem;">
          <button class="primary" on:click|preventDefault={handleCreate} disabled={creating}>
            {creating ? 'Saving…' : 'Save command'}
          </button>
        </div>
      </div>
    </div>

    <div class="panel" style="grid-area: commands">
      <div class="list-header">
        <div class="search">
          <input
            placeholder="Search commands"
            value={searchTerm}
            on:input={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
          />
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <span class="pill">Showing {commands.length} / {commandsTotal}</span>
          <div style="display:flex;gap:0.4rem;">
            <button class="ghost" on:click={prevCommandsPage} disabled={commandsOffset === 0 || loadingCommands}>Prev</button>
            <button class="ghost" on:click={nextCommandsPage} disabled={commandsOffset + commandsLimit >= commandsTotal || loadingCommands}>Next</button>
          </div>
        </div>
      </div>

      {#if loadingCommands}
        <p class="muted">Loading commands…</p>
      {:else if commands.length === 0}
        <p class="muted">No commands yet. Add one to get started.</p>
      {:else}
        {#each commands as command (command.id)}
          <article class="command">
            <div class="command-header">
              <span class="pill tag">{command.visibility}</span>
              <span class="pill">{command.platform}</span>
              <span class="muted">saved {new Date(command.created_at).toLocaleDateString()}</span>
            </div>
            {#if command.title}
              <strong>{command.title}</strong>
            {/if}
            {#if command.description}
              <p class="muted">{command.description}</p>
            {/if}
            <div class="command-text">{command.text}</div>
            <div class="command-footer">
              <div style="display:flex;gap:0.35rem;flex-wrap:wrap;align-items:center;">
                {#each command.tags as tag}
                  <span class="pill tag">{tag}</span>
                {/each}
              </div>
              <div style="display:flex;gap:0.4rem;align-items:center;">
                <span class="muted">usage {command.usage_count}</span>
                <button class="danger" on:click={() => handleDelete(command.id)}>Delete</button>
              </div>
            </div>
          </article>
        {/each}
      {/if}
    </div>

    <div class="panel" style="grid-area: learned">
      <div class="list-header">
        <h3 style="margin:0;">Learned snippets</h3>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <span class="pill">Showing {learned.length} / {learnedTotal}</span>
          <div style="display:flex;gap:0.4rem;">
            <button class="ghost" on:click={prevLearnedPage} disabled={learnedOffset === 0 || loadingLearned}>Prev</button>
            <button class="ghost" on:click={nextLearnedPage} disabled={learnedOffset + learnedLimit >= learnedTotal || loadingLearned}>Next</button>
          </div>
        </div>
      </div>
      {#if loadingLearned}
        <p class="muted">Crunching recent commands…</p>
      {:else if learned.length === 0}
        <p class="muted">
          The autocompleter posts to <code>/api/learn</code>. Once data lands, promote items into your vault.
        </p>
      {:else}
        {#each learned as item (item.id)}
          <article class="command">
            <div class="command-header">
              <span class="pill">usage {item.usage_count}</span>
              {#if item.pwd}
                <span class="pill">{item.pwd}</span>
              {/if}
            </div>
            <div class="command-text">{item.content}</div>
            <div class="command-footer">
              <span class="muted">seen {new Date(item.created_at).toLocaleString()}</span>
              <div style="display:flex;gap:0.4rem;">
                <button class="primary" on:click={() => handlePromote(item)}>Promote</button>
              </div>
            </div>
          </article>
        {/each}
      {/if}
    </div>
    </section>
  {:else}
    <section class="panel" style="margin-top:1.5rem;">
      <h3 style="margin-top:0;">Vault is private</h3>
      <p class="muted" style="margin-bottom:0;">
        Login or register above to view and manage your commands. Data stays hidden until a token is active.
      </p>
    </section>
  {/if}
</main>
{/if}
