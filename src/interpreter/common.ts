import type * as Ast from '../node.js';
import type { Scope } from './scope.js';
import type { Value, VFn } from './value.js';

/**
 * プログラムの実行を行うインターフェース。
 */
export interface IInterpreter {
	readonly scope: Scope;

	exec(script?: Ast.Node[]): Promise<void>;

	/**
	 * Executes AiScript Function.  
	 * When it fails,  
	 * (i)If error callback is registered via constructor, this.abort is called and the callback executed, then returns ERROR('func_failed').  
	 * (ii)Otherwise, just throws a error.
	 *
	 * @remarks This is the same function as that passed to AiScript NATIVE functions as opts.topCall.
	 */
	execFn(fn: VFn, args: Value[]): Promise<Value>;

	/**
	 * Executes AiScript Function.
	 * Almost same as execFn but when error occurs this always throws and never calls callback.
	 *
	 * @remarks This is the same function as that passed to AiScript NATIVE functions as opts.call.
	 */
	execFnSimple(fn: VFn, args: Value[]): Promise<Value>;

	registerAbortHandler(handler: () => void): void;
	registerPauseHandler(handler: () => void): void;
	registerUnpauseHandler(handler: () => void): void;

	unregisterAbortHandler(handler: () => void): void;
	unregisterPauseHandler(handler: () => void): void;
	unregisterUnpauseHandler(handler: () => void): void;

	abort(): void;

	pause(): void;

	unpause(): void;
}
