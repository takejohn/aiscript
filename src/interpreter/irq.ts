import { AiScriptHostsideError } from '../error.js';

export type IRQManagerOptions = {
	irqRate?: number;
	irqSleep?: number | (() => Promise<void>);
}

export class IRQManager {
	private static readonly IRQ_RATE_DEFAULT = 300;
	private irqRate: number;
	private irqSleep: () => Promise<void>;

	public constructor(opts: IRQManagerOptions) {
		const irqRate = opts.irqRate ?? IRQManager.IRQ_RATE_DEFAULT;
		if (!(irqRate >= 0)) {
			throw new AiScriptHostsideError(`Invalid IRQ rate (${opts.irqRate}): must be non-negative number`);
		}
		this.irqRate = irqRate;

		const sleep = (time: number) => (
			(): Promise<void> => new Promise(resolve => setTimeout(resolve, time))
		);

		if (typeof opts.irqSleep === 'function') {
			this.irqSleep = opts.irqSleep;
		} else if (opts.irqSleep === undefined) {
			this.irqSleep = sleep(5);
		} else if (opts.irqSleep >= 0) {
			this.irqSleep = sleep(opts.irqSleep);
		} else {
			throw new AiScriptHostsideError('irqSleep must be a function or a positive number.');
		}
	}

	public async sleepIfRequired(stepCount: number): Promise<void> {
		// irqRateが小数の場合は不等間隔になる
		if (this.irqRate !== 0 && stepCount % this.irqRate >= this.irqRate - 1) {
			await this.irqSleep();
		}
	}
}
