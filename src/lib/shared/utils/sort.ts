/**
 * Normalize a title for natural alphabetical sorting.
 * Strips leading non-alphanumeric characters and common articles (the, a, an).
 *
 * @example
 * sortTitle("The Matrix")      // "matrix"
 * sortTitle("A Quiet Place")   // "quiet place"
 * sortTitle("An Example")      // "example"
 * sortTitle("  ...Hello")      // "hello"
 */
export function sortTitle(title: string | undefined): string {
	return (title || '')
		.toLowerCase()
		.replace(/^[^a-z0-9]+/, '')
		.replace(/^(the|a|an)\s+/, '');
}
