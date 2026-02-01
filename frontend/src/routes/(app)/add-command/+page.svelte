<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { createCommand, getAuthToken } from '$lib/api';
  import type { Visibility } from '$lib/types';

  const initialForm = {
    title: '',
    text: '',
    description: '',
    platform: 'Linux',
    visibility: 'PRIVATE' as Visibility,
    tags: ''
  };

  let form = { ...initialForm };
  let creating = false;
  let toast = '';
  let errorMessage = '';
  let activeToken: string | null = null;
  let ready = false;

  onMount(() => {
    activeToken = getAuthToken();
    if (!activeToken) {
      goto('/auth');
      return;
    }
    ready = true;
  });

  const setToast = (message: string) => {
    toast = message;
    setTimeout(() => (toast = ''), 2200);
  };

  const setError = (message: string) => {
    errorMessage = message;
    setTimeout(() => (errorMessage = ''), 2600);
  };

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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create command');
    } finally {
      creating = false;
    }
  }
</script>

<svelte:head>
  <title>CMVault · Add Command</title>
</svelte:head>

{#if ready && activeToken}
  <main class="page">
    <section class="hero">
      <div class="actions">
        {#if toast}
          <span class="status">{toast}</span>
        {/if}
        {#if errorMessage}
          <span class="status error">{errorMessage}</span>
        {/if}
      </div>
    </section>

    <section class="panel">
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
          <button class="ghost" on:click={() => (form = { ...initialForm })} type="button">Reset</button>
          <button class="primary" on:click|preventDefault={handleCreate} disabled={creating}>
            {creating ? 'Saving…' : 'Save command'}
          </button>
        </div>
      </div>
    </section>
  </main>
{:else}
  <main class="page">
    <section class="panel" style="margin-top:1.5rem;">
      <h3 style="margin-top:0;">Vault is private</h3>
      <p class="muted" style="margin-bottom:0;">Login to add commands.</p>
    </section>
  </main>
{/if}
