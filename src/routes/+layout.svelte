<script lang="ts">
	import '../app.css';
	import logo from '$assets/logo.svg';
	import Navbar from '$ui/navigation/navbar/navbar.svelte';
	import PageNav from '$ui/navigation/pageNav/pageNav.svelte';
	import AlertContainer from '$alerts/AlertContainer.svelte';
</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>Profilarr</title>
</svelte:head>

<Navbar />
<PageNav />
<AlertContainer />

<main class="pt-16 pl-72">
	<slot />
</main>
