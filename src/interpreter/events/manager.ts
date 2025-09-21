import { autobind } from '../../utils/mini-autobind.js';
import { EventHandlerManager } from './handlers.js';

export interface EventHandlerRegistry {
	readonly registerAbortHandler: (handler: () => void) => void;
	readonly registerPauseHandler: (handler: () => void) => void;
	readonly registerUnpauseHandler: (handler: () => void) => void;
	readonly unregisterAbortHandler: (handler: () => void) => void;
	readonly unregisterPauseHandler: (handler: () => void) => void;
	readonly unregisterUnpauseHandler: (handler: () => void) => void;
}

export class EventManager {
	private _stop = false;
	private pausing: { promise: Promise<void>, resolve: () => void } | null = null;
	private readonly abortHandlers = new EventHandlerManager();
	private readonly pauseHandlers = new EventHandlerManager();
	private readonly unpauseHandlers = new EventHandlerManager();
	public readonly handlerRegistry: EventHandlerRegistry = Object.freeze({
		registerAbortHandler: this.abortHandlers.register,
		registerPauseHandler: this.pauseHandlers.register,
		registerUnpauseHandler: this.unpauseHandlers.register,
		unregisterAbortHandler: this.abortHandlers.unregister,
		unregisterPauseHandler: this.pauseHandlers.unregister,
		unregisterUnpauseHandler: this.unpauseHandlers.unregister,
	});

	public get stop(): boolean {
		return this._stop;
	}

	public waitWhilePausing(): Promise<void> {
		return this.pausing?.promise ?? Promise.resolve();
	}

	@autobind
	public abort(): void {
		this._stop = true;
		this.abortHandlers.executeAllAndClear();
	}

	@autobind
	public pause(): void {
		if (this.pausing) return;
		let resolve: () => void;
		const promise = new Promise<void>(r => { resolve = (): void => r(); });
		this.pausing = { promise, resolve: resolve! };
		this.pauseHandlers.executeAllAndClear();
	}

	@autobind
	public unpause(): void {
		if (!this.pausing) return;
		this.pausing.resolve();
		this.pausing = null;
		this.unpauseHandlers.executeAllAndClear();
	}
}
