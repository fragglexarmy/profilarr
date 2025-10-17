<script lang="ts">
	import '../app.css';
	import logo from '$static/logo.svg';
	import Navbar from '$components/navigation/navbar/navbar.svelte';
</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>Profilarr</title>
</svelte:head>

<Navbar />

<main class="pt-16">
	<slot />
</main>
