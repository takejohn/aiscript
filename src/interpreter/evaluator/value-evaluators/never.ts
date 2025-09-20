export function evalNever(): never {
	throw new Error('invalid node type');
}
