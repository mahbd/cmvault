<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { deleteLearned, fetchLearned, getAuthToken, promoteLearned } from '$lib/api';
  import type { LearnedCommand } from '$lib/types';

  let learned: LearnedCommand[] = [];
  let learnedTotal = 0;
  let learnedLimit = 20;
  let learnedOffset = 0;
  let searchTerm = '';
  let loadingLearned = false;
  let toast = '';
  let errorMessage = '';
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let selected = new Set<string>();
  let activeToken: string | null = null;
  let ready = false;

  onMount(() => {
    activeToken = getAuthToken();
    if (!activeToken) {
      goto('/auth');
      return;
    }
    ready = true;
    loadLearned();
  });

  const setToast = (message: string) => {
    toast = message;
    setTimeout(() => (toast = ''), 2200);
  };

  const setError = (message: string) => {
    errorMessage = message;
    setTimeout(() => (errorMessage = ''), 2600);
  };

  async function loadLearned() {
    if (!getAuthToken()) return;
    loadingLearned = true;
    try {
      const page = await fetchLearned({
        search: searchTerm || undefined,
        limit: learnedLimit,
        offset: learnedOffset
      });
      learned = page.items;
      learnedTotal = page.total;
      // keep only selected items that are visible
      selected = new Set([...selected].filter((id) => learned.some((l) => l.id === id)));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load learned commands');
    } finally {
      loadingLearned = false;
    }
  }

  function handleSearchChange(value: string) {
    searchTerm = value;
    learnedOffset = 0;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadLearned(), 220);
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
      await loadLearned();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Promotion failed');
    }
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

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selected = next;
  }

  function toggleSelectAll() {
    if (selected.size === learned.length) {
      selected = new Set();
    } else {
      selected = new Set(learned.map((l) => l.id));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLearned(id);
      learned = learned.filter((l) => l.id !== id);
      selected.delete(id);
      setToast('Deleted learn');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map((id) => deleteLearned(id)));
      learned = learned.filter((l) => !selected.has(l.id));
      selected = new Set();
      setToast(`Deleted ${ids.length} item${ids.length === 1 ? '' : 's'}`);
      await loadLearned();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bulk delete failed');
    }
  }
</script>

<svelte:head>
  <title>CMVault · Learned</title>
</svelte:head>

{#if ready && activeToken}
  <main class="page">
    <section class="hero">
      <div class="eyebrow">Show Learns</div>
      <h1>Promote learned snippets</h1>
      <p>Search, select, delete, or promote what the autocompleter captured.</p>
      <div class="actions">
        <button class="primary" on:click={loadLearned} disabled={loadingLearned}>Refresh list</button>
        <a class="ghost link-button" href="/dashboard">Go to dashboard</a>
        <a class="ghost link-button" href="/add-command">Add command</a>
        {#if selected.size}
          <button class="danger" on:click={handleDeleteSelected} disabled={loadingLearned}>
            Delete {selected.size === learned.length ? 'all' : selected.size} selected
          </button>
        {/if}
        {#if toast}
          <span class="status">{toast}</span>
        {/if}
        {#if errorMessage}
          <span class="status error">{errorMessage}</span>
        {/if}
      </div>
    </section>

    <section class="panel">
      <div class="list-header" style="align-items:flex-start;">
        <div style="flex:1;display:grid;gap:0.35rem;min-width:260px;">
          <h3 style="margin:0;">Learned snippets</h3>
          <div class="search">
            <input
              placeholder="Search learns"
              value={searchTerm}
              on:input={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          <span class="pill">Showing {learned.length} / {learnedTotal}</span>
          <span class="pill">{selected.size} selected</span>
          <button class="ghost" on:click={toggleSelectAll} disabled={learned.length === 0}>
            {selected.size === learned.length && learned.length > 0 ? 'Clear selection' : 'Select all'}
          </button>
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
            <div class="command-header" style="align-items:flex-start;gap:0.6rem;">
              <input type="checkbox" checked={selected.has(item.id)} on:change={() => toggleSelect(item.id)} />
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
                <button class="danger" on:click={() => handleDelete(item.id)}>Delete</button>
              </div>
            </div>
          </article>
        {/each}
      {/if}
    </section>
  </main>
{:else}
  <main class="page">
    <section class="panel" style="margin-top:1.5rem;">
      <h3 style="margin-top:0;">Vault is private</h3>
      <p class="muted" style="margin-bottom:0;">Login to view learned snippets.</p>
    </section>
  </main>
{/if}
