import { autobind } from '../utils/mini-autobind.js';

export interface LifecycleHandlerRegistry {
	registerAbortHandler: (handler: () => void) => void;
	registerPauseHandler: (handler: () => void) => void;
	registerUnpauseHandler: (handler: () => void) => void;
	unregisterAbortHandler: (handler: () => void) => void;
	unregisterPauseHandler: (handler: () => void) => void;
	unregisterUnpauseHandler: (handler: () => void) => void;
}

export class LifecycleManager implements LifecycleHandlerRegistry {
	private _stop = false;
	private _pausing: { promise: Promise<void>, resolve: () => void } | null = null;
	private abortHandlers: (() => void)[] = [];
	private pauseHandlers: (() => void)[] = [];
	private unpauseHandlers: (() => void)[] = [];

	public get stop(): boolean {
		return this._stop;
	}

	public get pausing(): { promise: Promise<void>, resolve: () => void } | null {
		return this._pausing;
	}

	public get registry(): LifecycleHandlerRegistry {
		return {
			registerAbortHandler: this.registerAbortHandler,
			registerPauseHandler: this.registerPauseHandler,
			registerUnpauseHandler: this.registerUnpauseHandler,
			unregisterAbortHandler: this.unregisterAbortHandler,
			unregisterPauseHandler: this.unregisterPauseHandler,
			unregisterUnpauseHandler: this.unregisterUnpauseHandler,
		};
	}

	@autobind
	public registerAbortHandler(handler: () => void): void {
		this.abortHandlers.push(handler);
	}

	@autobind
	public registerPauseHandler(handler: () => void): void {
		this.pauseHandlers.push(handler);
	}

	@autobind
	public registerUnpauseHandler(handler: () => void): void {
		this.unpauseHandlers.push(handler);
	}

	@autobind
	public unregisterAbortHandler(handler: () => void): void {
		this.abortHandlers = this.abortHandlers.filter(h => h !== handler);
	}

	@autobind
	public unregisterPauseHandler(handler: () => void): void {
		this.pauseHandlers = this.pauseHandlers.filter(h => h !== handler);
	}

	@autobind
	public unregisterUnpauseHandler(handler: () => void): void {
		this.unpauseHandlers = this.unpauseHandlers.filter(h => h !== handler);
	}

	@autobind
	public abort(): void {
		this._stop = true;
		for (const handler of this.abortHandlers) {
			handler();
		}
		this.abortHandlers = [];
	}

	@autobind
	public pause(): void {
		if (this._pausing) return;
		let resolve: () => void;
		const promise = new Promise<void>(r => { resolve = () => r(); });
		this._pausing = { promise, resolve: resolve! };
		for (const handler of this.pauseHandlers) {
			handler();
		}
		this.pauseHandlers = [];
	}

	@autobind
	public unpause(): void {
		if (!this._pausing) return;
		this._pausing.resolve();
		this._pausing = null;
		for (const handler of this.unpauseHandlers) {
			handler();
		}
		this.unpauseHandlers = [];
	}
}
