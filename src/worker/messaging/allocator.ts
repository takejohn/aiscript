import { autobind } from '../../utils/mini-autobind.js';

export class IdAllocator<T extends NonNullable<unknown>> {
	private nextId = 0;
	private values = new Map<number, T>();

	@autobind
	alloc(value: T): number {
		const id = this.generateId();
		this.values.set(id, value);
		return id;
	}

	@autobind
	get(id: number): T {
		const value = this.values.get(id);
		if (value == null) {
			throw new RangeError(`Unknown id: ${id}`);
		}
		return value;
	}

	@autobind
	remove(id: number): T {
		const value = this.get(id);
		this.values.delete(id);
		return value;
	}

	@autobind
	private generateId(): number {
		const id = this.nextId;
		this.nextId = id + 1;
		return id;
	}
}
