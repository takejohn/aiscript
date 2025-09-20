import type { Ast, Scope } from '../index.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Control } from './control.js';
import type { Value } from './value.js';
import type { Variable } from './variable.js';

export type LogObject = {
	scope?: string;
	var?: string;
	val?: Value | Variable;
};

export type CallInfo = {
	name: string;
	pos: Ast.Pos | undefined;
};

export interface NodeEvaluator<N extends Ast.Node> {
	evalAsync(
		context: AsyncEvaluatorContext,
		node: N,
		scope: Scope,
		callStack: readonly CallInfo[]
	): Promise<Value | Control>;

	evalSync(
		context: SyncEvaluatorContext,
		node: N,
		scope: Scope,
		callStack: readonly CallInfo[]
	): Value | Control;
}
