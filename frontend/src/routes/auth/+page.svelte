<script lang="ts">
  import { login, register, setAuthToken } from '$lib/api';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let authMode: 'login' | 'register' = 'login';
  let email = '';
  let password = '';
  let label = '';
  let loading = false;
  let errorMessage = '';
  let toast = '';

  onMount(() => {
    const existing = localStorage.getItem('cmvault_token');
    if (existing) {
      goto('/');
    }
  });

  const setError = (msg: string) => {
    errorMessage = msg;
    setTimeout(() => (errorMessage = ''), 2400);
  };

  const setToast = (msg: string) => {
    toast = msg;
    setTimeout(() => (toast = ''), 2400);
  };

  async function handleAuthSubmit() {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    loading = true;
    try {
      const action = authMode === 'login' ? login : register;
      const res = await action({ email: email.trim(), password, label: label || undefined });
      setAuthToken(res.token);
      setToast(authMode === 'login' ? 'Logged in' : 'Account created');
      goto('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Auth failed');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>CMVault · Login</title>
</svelte:head>

<main class="page">
  <section class="panel" style="max-width:560px;margin:0 auto;">
    <div class="list-header" style="margin-bottom:0.5rem;">
      <h3 style="margin:0;">{authMode === 'login' ? 'Login' : 'Register'}</h3>
      <button class="ghost" on:click={() => (authMode = authMode === 'login' ? 'register' : 'login')}>
        {authMode === 'login' ? 'Need an account?' : 'Have an account? Login'}
      </button>
    </div>
    <div class="form-grid">
      <label>
        Email
        <input type="email" bind:value={email} placeholder="you@example.com" />
      </label>
      <label>
        Password
        <input type="password" bind:value={password} placeholder="Minimum 8 characters" />
      </label>
      <label>
        Token label
        <input bind:value={label} placeholder="e.g. Personal Laptop" />
      </label>
      <div class="actions" style="justify-content:flex-end;margin-top:0.4rem;">
        <button class="primary" on:click|preventDefault={handleAuthSubmit} disabled={loading}>
          {loading ? 'Working…' : authMode === 'login' ? 'Login' : 'Register'}
        </button>
      </div>
      {#if toast}
        <span class="status">{toast}</span>
      {/if}
      {#if errorMessage}
        <span class="status" style="border-color:#ef4444;color:#fca5a5">{errorMessage}</span>
      {/if}
    </div>
  </section>
</main>
