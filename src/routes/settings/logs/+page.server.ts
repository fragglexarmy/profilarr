import { readLastLogs, readLogsFromFile, getLogFilesList } from '$logger/reader.ts';

export const load = async ({ url }: { url: URL }) => {
	// Get all log files
	const logFiles = await getLogFilesList();

	// Get selected file from query param, default to newest (first in list)
	const selectedFile = url.searchParams.get('file') || logFiles[0]?.filename || '';

	// Load logs from selected file or all files if no file selected
	const logs = selectedFile ? await readLogsFromFile(selectedFile) : await readLastLogs();

	return {
		logs,
		logFiles,
		selectedFile
	};
};
