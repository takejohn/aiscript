import { autobind } from '../../utils/mini-autobind.js';
import { HandlerRegistry } from './handler-registry.js';

export interface LifecycleHandlerRegistry {
	registerAbortHandler: (handler: () => void) => void;
	registerPauseHandler: (handler: () => void) => void;
	registerUnpauseHandler: (handler: () => void) => void;
	unregisterAbortHandler: (handler: () => void) => void;
	unregisterPauseHandler: (handler: () => void) => void;
	unregisterUnpauseHandler: (handler: () => void) => void;
}

export class LifecycleManager {
	private _stop = false;
	private _pausing: { promise: Promise<void>, resolve: () => void } | null = null;
	public readonly abortHandlers = new HandlerRegistry();
	public readonly pauseHandlers = new HandlerRegistry();
	public readonly unpauseHandlers = new HandlerRegistry();

	public get stop(): boolean {
		return this._stop;
	}

	public get pausing(): { promise: Promise<void>, resolve: () => void } | null {
		return this._pausing;
	}

	public get registry(): LifecycleHandlerRegistry {
		return {
			registerAbortHandler: this.abortHandlers.register,
			registerPauseHandler: this.pauseHandlers.register,
			registerUnpauseHandler: this.unpauseHandlers.register,
			unregisterAbortHandler: this.abortHandlers.unregister,
			unregisterPauseHandler: this.pauseHandlers.unregister,
			unregisterUnpauseHandler: this.unpauseHandlers.unregister,
		};
	}

	@autobind
	public abort(): void {
		this._stop = true;
		this.abortHandlers.executeAllAndClear();
	}

	@autobind
	public pause(): void {
		if (this._pausing) return;
		let resolve: () => void;
		const promise = new Promise<void>(r => { resolve = () => r(); });
		this._pausing = { promise, resolve: resolve! };
		this.pauseHandlers.executeAllAndClear();
	}

	@autobind
	public unpause(): void {
		if (!this._pausing) return;
		this._pausing.resolve();
		this._pausing = null;
		this.unpauseHandlers.executeAllAndClear();
	}
}
