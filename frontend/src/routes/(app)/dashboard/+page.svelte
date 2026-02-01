<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { deleteCommand, fetchCommands, getAuthToken } from "$lib/api";
  import type { Command } from "$lib/types";

  let commands: Command[] = [];
  let commandsTotal = 0;
  let commandsLimit = 20;
  let commandsOffset = 0;
  let searchTerm = "";
  let loadingCommands = false;
  let toast = "";
  let errorMessage = "";
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let activeToken: string | null = null;
  let ready = false;

  onMount(() => {
    activeToken = getAuthToken();
    if (!activeToken) {
      goto("/auth");
      return;
    }
    ready = true;
    loadCommands();
  });

  const setToast = (message: string) => {
    toast = message;
    setTimeout(() => (toast = ""), 2200);
  };

  const setError = (message: string) => {
    errorMessage = message;
    setTimeout(() => (errorMessage = ""), 2600);
  };

  async function loadCommands() {
    if (!getAuthToken()) return;
    loadingCommands = true;
    try {
      const page = await fetchCommands({
        search: searchTerm || undefined,
        limit: commandsLimit,
        offset: commandsOffset,
      });
      commands = page.items;
      commandsTotal = page.total;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load commands",
      );
    } finally {
      loadingCommands = false;
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCommand(id);
      commands = commands.filter((c) => c.id !== id);
      setToast("Deleted command");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Delete failed");
    }
  }

  function handleSearchChange(value: string) {
    searchTerm = value;
    commandsOffset = 0;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadCommands(), 220);
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
</script>

<svelte:head>
  <title>CMVault · Dashboard</title>
</svelte:head>

{#if ready && activeToken}
  <main class="page">
    <section class="hero">
      <div class="actions">
        <button
          class="primary"
          on:click={loadCommands}
          disabled={loadingCommands}>Refresh commands</button
        >
        <a class="ghost link-button" href="/add-command">Add command</a>
        <a class="ghost link-button" href="/learns">Review learns</a>
        {#if toast}
          <span class="status">{toast}</span>
        {/if}
        {#if errorMessage}
          <span class="status error">{errorMessage}</span>
        {/if}
      </div>
    </section>

    <section class="panel">
      <div class="list-header">
        <div class="search">
          <input
            placeholder="Search commands"
            value={searchTerm}
            on:input={(e) =>
              handleSearchChange((e.target as HTMLInputElement).value)}
          />
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <span class="pill">Showing {commands.length} / {commandsTotal}</span>
          <div style="display:flex;gap:0.4rem;">
            <button
              class="ghost"
              on:click={prevCommandsPage}
              disabled={commandsOffset === 0 || loadingCommands}>Prev</button
            >
            <button
              class="ghost"
              on:click={nextCommandsPage}
              disabled={commandsOffset + commandsLimit >= commandsTotal ||
                loadingCommands}>Next</button
            >
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
              <span class="muted"
                >saved {new Date(command.created_at).toLocaleDateString()}</span
              >
            </div>
            {#if command.title}
              <strong>{command.title}</strong>
            {/if}
            {#if command.description}
              <p class="muted">{command.description}</p>
            {/if}
            <div class="command-text">{command.text}</div>
            <div class="command-footer">
              <div
                style="display:flex;gap:0.35rem;flex-wrap:wrap;align-items:center;"
              >
                {#each command.tags as tag}
                  <span class="pill tag">{tag}</span>
                {/each}
              </div>
              <div style="display:flex;gap:0.4rem;align-items:center;">
                <span class="muted">usage {command.usage_count}</span>
                <button class="danger" on:click={() => handleDelete(command.id)}
                  >Delete</button
                >
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
      <p class="muted" style="margin-bottom:0;">
        Login to view your dashboard.
      </p>
    </section>
  </main>
{/if}
