/**
 * Logger singleton with console and file output
 * Supports configurable settings, daily rotation, and size-based rotation
 */

import { config } from '$config';
import { colors } from './colors.ts';
import { logSettings } from './settings.ts';
import type { LogOptions, LogEntry } from './types.ts';

class Logger {
	private formatTimestamp(): string {
		const timestamp = new Date().toISOString();
		return `${colors.grey}${timestamp}${colors.reset}`;
	}

	private formatLevel(level: string, color: string): string {
		return `${color}${level.padEnd(5)}${colors.reset}`;
	}

	private formatSource(source?: string): string {
		if (!source) return '';
		return `${colors.grey}[${source}]${colors.reset}`;
	}

	private formatMeta(meta?: unknown): string {
		if (!meta) return '';
		return `${colors.grey}${JSON.stringify(meta)}${colors.reset}`;
	}

	/**
	 * Get log file path based on rotation strategy
	 */
	private getLogFilePath(): string {
		const settings = logSettings.get();
		const strategy = settings.rotation_strategy;

		if (strategy === 'daily' || strategy === 'both') {
			// Use date-based filename: app-2025-01-20.log
			const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
			return `${config.paths.logs}/app-${date}.log`;
		}

		// Default: use app.log
		return config.paths.logFile;
	}

	/**
	 * Check if log file needs rotation due to size
	 */
	private async checkSizeRotation(filePath: string): Promise<void> {
		const settings = logSettings.get();
		const strategy = settings.rotation_strategy;

		if (strategy !== 'size' && strategy !== 'both') {
			return;
		}

		try {
			const stat = await Deno.stat(filePath);
			const maxSizeBytes = settings.max_file_size * 1024 * 1024; // Convert MB to bytes

			if (stat.size >= maxSizeBytes) {
				// Rotate: rename current file with timestamp
				const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
				const rotatedPath = filePath.replace('.log', `-${timestamp}.log`);
				await Deno.rename(filePath, rotatedPath);
			}
		} catch (error) {
			// File might not exist yet, that's okay
			if (!(error instanceof Deno.errors.NotFound)) {
				console.error('Error checking file size for rotation:', error);
			}
		}
	}

	private async log(
		level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
		color: string,
		message: string,
		options?: LogOptions
	): Promise<void> {
		// Check if this log level should be logged
		if (!logSettings.shouldLog(level)) {
			return;
		}

		const timestamp = new Date().toISOString();

		// Console output (colored)
		if (logSettings.isConsoleLoggingEnabled()) {
			const consoleParts = [
				this.formatTimestamp(),
				this.formatLevel(level, color),
				message,
				options?.source ? this.formatSource(options.source) : '',
				options?.meta ? this.formatMeta(options.meta) : ''
			].filter(Boolean);

			console.log(consoleParts.join(' | '));
		}

		// File output (JSON)
		if (logSettings.isFileLoggingEnabled()) {
			const logEntry: LogEntry = {
				timestamp,
				level,
				message,
				...(options?.source ? { source: options.source } : {}),
				...(options?.meta ? { meta: options.meta } : {})
			};

			try {
				const filePath = this.getLogFilePath();

				// Check if file needs rotation due to size
				await this.checkSizeRotation(filePath);

				// Write to log file
				await Deno.writeTextFile(filePath, JSON.stringify(logEntry) + '\n', {
					append: true
				});
			} catch (error) {
				// If file write fails, at least we have console output
				console.error('Failed to write to log file:', error);
			}
		}
	}

	async debug(message: string, options?: LogOptions): Promise<void> {
		await this.log('DEBUG', colors.cyan, message, options);
	}

	async info(message: string, options?: LogOptions): Promise<void> {
		await this.log('INFO', colors.green, message, options);
	}

	async warn(message: string, options?: LogOptions): Promise<void> {
		await this.log('WARN', colors.yellow, message, options);
	}

	async error(message: string, options?: LogOptions): Promise<void> {
		await this.log('ERROR', colors.red, message, options);
	}

	async errorWithTrace(message: string, error?: Error, options?: LogOptions): Promise<void> {
		await this.log('ERROR', colors.red, message, options);

		// Print stack trace to console
		if (error?.stack && logSettings.isConsoleLoggingEnabled()) {
			console.log(`${colors.grey}${error.stack}${colors.reset}`);
		}

		// Write stack trace to file
		if (error?.stack && logSettings.isFileLoggingEnabled()) {
			const traceEntry: LogEntry = {
				timestamp: new Date().toISOString(),
				level: 'ERROR',
				message: 'Stack trace',
				meta: { stack: error.stack }
			};

			try {
				const filePath = this.getLogFilePath();
				await Deno.writeTextFile(filePath, JSON.stringify(traceEntry) + '\n', {
					append: true
				});
			} catch (writeError) {
				console.error('Failed to write stack trace to log file:', writeError);
			}
		}
	}
}

export const logger = new Logger();
