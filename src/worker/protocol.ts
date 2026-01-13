import type * as Ast from '../node.js';
import type { VBool, VNull, VNum, VStr } from '../interpreter/value.js';

export type TVArr = {
	type: 'arr';
	value: TransferableValue[];
};

export type TVObj = {
	type: 'obj';
	value: Map<string, TransferableValue>;
};

export type TVFn = TVUserFn | TVNativeFn;
type TVFnBase = {
	type: 'fn';
};
export type TVUserFn = TVFnBase & {
	native: false;
	id: string;
};
export type TVNativeFn = TVFnBase & {
    native: true;
    id: string;
};

export type TVError = {
	type: 'error';
	value: string;
	info?: TransferableValue;
};

export type TransferableValue = (VNull | VBool | VNum | VStr | TVArr | TVObj | TVFn | TVError) & Attr;

export type TransferableAiScriptError = {
	name: string;
	info: unknown;
	pos?: Ast.Pos;
}

type ResponseBase<Name extends string> = {
		type: 'response';
		name: Name;
		ok: boolean;
		id: number;
}

type MethodSchema<Name extends string, Params extends unknown[], Result> = {
	request: {
		type: 'request';
		name: Name;
		params: Params;
		id: number;
	};
	response: ResponseBase<Name> & ({
		ok: true;
		result: Result;
	} | {
		ok: false;
		error: TransferableAiScriptError;
	});
}

export type MethodInit = MethodSchema<'init', [
	consts: Record<string, TransferableValue>,
	opts: {
		maxStep?: number;
		abortOnError?: boolean;
	},
], void>;

export type MethodExec = MethodSchema<'exec', [script: Ast.Node[]], void>;

export type Method = MethodInit | MethodExec;

type CallbackSchema<Name extends string | number, Params extends unknown[], Result> = {
	request: {
		type: 'request';
		name: Name;
		params: Params;
		id: number;
	};
	response: {
		type: 'response';
		result: Result;
		params: Params;
		id: number;
	}
};

export type CallbackIn = CallbackSchema<'in', [q: string], string>;

export type CallbackOut = CallbackSchema<'out', [value: TransferableValue], void>;

export type CallbackErr = CallbackSchema<'err', [e: TransferableAiScriptError], void>;

export type CallbackLog = CallbackSchema<'log', [
	type: string,
	params: {
		scope?: string;
		var?: string;
		val?: TransferableValue | {
			isMutable: boolean;
			value: TransferableValue;
		};
	},
], void>;

export type Callback = CallbackIn | CallbackOut | CallbackErr | CallbackLog;

export type Request<F extends Method | Callback> = F['request'];

export type Response<F extends Method | Callback> = F['response'];

export type Input = Request<Method> | Response<Callback>;

export type Output = Response<Method> | Request<Callback>;
