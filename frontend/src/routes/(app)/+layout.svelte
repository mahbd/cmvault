<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { createDeviceCode, getAuthToken, setAuthToken } from '$lib/api';

  let ready = false;
  let activeToken: string | null = null;
  let deviceCode: string | null = null;
  let deviceExpires: string | null = null;
  let toast = '';
  let errorMessage = '';

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
    goto('/auth');
  }

  const isActive = (path: string) => $page.url.pathname === path;
</script>

{#if ready && activeToken}
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="dot"></span>
        <div>
          <strong>CMVault</strong>
          <small>Personal command vault</small>
        </div>
      </div>
      <nav class="nav-links">
        <a href="/dashboard" class:active={isActive('/dashboard')}>Dashboard</a>
        <a href="/add-command" class:active={isActive('/add-command')}>Add Command</a>
        <a href="/learns" class:active={isActive('/learns')}>Show Learns</a>
      </nav>
      <div class="top-actions">
        <button class="ghost" on:click={handleDeviceCode}>Device code</button>
        <button class="ghost" on:click={handleLogout}>Logout</button>
      </div>
    </header>

    {#if deviceCode || toast || errorMessage}
      <div class="status-row">
        {#if deviceCode}
          <span class="code-chip">Code: {deviceCode} · expires {deviceExpires}</span>
        {/if}
        {#if toast}
          <span class="status">{toast}</span>
        {/if}
        {#if errorMessage}
          <span class="status error">{errorMessage}</span>
        {/if}
      </div>
    {/if}

    <slot />
  </div>
{/if}
