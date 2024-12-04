import type * as Ast from '../node.js';
import type { Value, VFn } from './value.js';
import type { Variable } from './variable.js';

/**
 * プログラムの実行を行うインターフェース。
 */
export interface IInterpreter {
	readonly scope: IScope;

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

export interface IScope {
	readonly name: string;
	readonly nsName?: string;

	/**
	 * 指定した名前の変数を取得します
	 * @param name - 変数名
	 */
	get(name: string): Value;

	/**
	 * 名前空間名を取得します。
	 */
	getNsPrefix(): string;

	/**
	 * 指定した名前の変数が存在するか判定します
	 * @param name - 変数名
	 */
	exists(name: string): boolean;

	/**
	 * 現在のスコープに存在する全ての変数を取得します
	 */
	getAll(): Map<string, Variable>;

	/**
	 * 指定した名前の変数を現在のスコープに追加します。名前空間である場合は接頭辞を付して親のスコープにも追加します
	 * @param name - 変数名
	 * @param val - 初期値
	 */
	add(name: string, variable: Variable): void;

	/**
	 * 指定した名前の変数に値を再代入します
	 * @param name - 変数名
	 * @param val - 値
	 */
	assign(name: string, val: Value): void;
}
