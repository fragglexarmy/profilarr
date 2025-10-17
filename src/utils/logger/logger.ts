/**
 * Logger singleton with console and file output
 */

import { config } from '$config';
import { colors } from './colors.ts';
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

	private async log(
		level: string,
		color: string,
		message: string,
		options?: LogOptions
	): Promise<void> {
		const timestamp = new Date().toISOString();

		// Console output (colored)
		const consoleParts = [
			this.formatTimestamp(),
			this.formatLevel(level, color),
			message,
			options?.source ? this.formatSource(options.source) : '',
			options?.meta ? this.formatMeta(options.meta) : ''
		].filter(Boolean);

		console.log(consoleParts.join(' | '));

		// File output (JSON)
		const logEntry: LogEntry = {
			timestamp,
			level,
			message,
			...(options?.source ? { source: options.source } : {}),
			...(options?.meta ? { meta: options.meta } : {})
		};

		try {
			await Deno.writeTextFile(config.paths.logFile, JSON.stringify(logEntry) + '\n', {
				append: true
			});
		} catch (error) {
			// If file write fails, at least we have console output
			console.error('Failed to write to log file:', error);
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
		if (error?.stack) {
			console.log(`${colors.grey}${error.stack}${colors.reset}`);
		}

		// Write stack trace to file
		if (error?.stack) {
			const traceEntry: LogEntry = {
				timestamp: new Date().toISOString(),
				level: 'ERROR',
				message: 'Stack trace',
				meta: { stack: error.stack }
			};

			try {
				await Deno.writeTextFile(config.paths.logFile, JSON.stringify(traceEntry) + '\n', {
					append: true
				});
			} catch (writeError) {
				console.error('Failed to write stack trace to log file:', writeError);
			}
		}
	}
}

export const logger = new Logger();
