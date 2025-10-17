<script lang="ts">
	import '../app.css';
	import logo from '../static/logo.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>Profilarr</title>
</svelte:head>

{@render children?.()}
