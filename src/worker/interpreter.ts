import type { Ast } from '../index.js';
import type { VNull, VBool, VNum, VStr } from '../interpreter/value.js';

type VArr = {
	type: 'arr';
	value: readonly Value[];
}

type VObj = {
	type: 'obj';
	value: ReadonlyMap<string, Value>;
}

export type VFn = VUserFn | VNativeFn;

type VFnBase = {
	type: 'fn';
};

type VUserFn = VFnBase & {
	type: 'fn';
	name?: string;
	// todo: 公称型に
}

type VNativeFn = VFnBase & {
	type: 'fn';
	native: (args: (Value | undefined)[], opts: {
		call: (fn: VFn, args: Value[]) => Promise<Value>;
		topCall: (fn: VFn, args: Value[]) => Promise<Value>;
	}) => Value | Promise<Value> | void;
};

type VError = {
	type: 'error';
	value: string;
	info?: Value;
}

// 属性は含まない
type Value = VNull | VBool | VNum | VStr | VArr | VObj | VFn | VError;

type CreateWorkerNativeFn = {
	(fn: VNativeFn['native']): VNativeFn;
}

interface WorkerInterpreter {
	exec(script?: Ast.Node[]): Promise<void>;
}

interface WorkerInterpreterConstructor {
	new(
		consts: Record<string, Value>,
		opts: {
			in?(q: string): Promise<string>;
			out?(value: Value): void;
			maxStep?: number;
			abortOnError?: boolean;
			irqRate?: number;
			irqSleep?: number;
		},
	): WorkerInterpreter;
};
