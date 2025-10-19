// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Extend RequestInit to support Deno HttpClient
	interface RequestInit {
		client?: Deno.HttpClient;
	}
}

export {};
