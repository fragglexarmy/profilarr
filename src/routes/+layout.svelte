<script lang="ts">
	import '../app.css';
	import logo from '$static/logo.svg';
	import Navbar from '$components/navigation/navbar/navbar.svelte';
	import PageNav from '$components/navigation/pageNav/pageNav.svelte';
</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>Profilarr</title>
</svelte:head>

<Navbar />
<PageNav />

<main class="pt-16 pl-72">
	<slot />
</main>
