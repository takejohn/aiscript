import { autobind } from '../../utils/mini-autobind.js';

export class HandlerRegistry {
	private handlers: (() => void)[] = [];

	@autobind
	public register(handler: () => void): void {
		this.handlers.push(handler);
	}

	@autobind
	public unregister(handler: () => void): void {
		this.handlers = this.handlers.filter(h => h !== handler);
	}

	@autobind
	public executeAllAndClear(): void {
		for (const handler of this.handlers) {
			handler();
		}
		this.handlers = [];
	}
}
