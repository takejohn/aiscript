import { Ast } from '../../index.js';
import type { Scope } from '../../index.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { Control } from '../control.js';
import type { CallInfo } from '../types.js';
import type { Value } from '../value.js';

export function evalClauseAsync(
	context: AsyncEvaluatorContext,
	node: Ast.Statement | Ast.Expression,
	scope: Scope,
	callStack: readonly CallInfo[]
): Promise<Value | Control> {
	return context.eval(node, Ast.isStatement(node) ? scope.createChildScope() : scope, callStack);
}

export function evalClauseSync(
	context: SyncEvaluatorContext,
	node: Ast.Statement | Ast.Expression,
	scope: Scope,
	callStack: readonly CallInfo[]
): Value | Control {
	return context.eval(node, Ast.isStatement(node) ? scope.createChildScope() : scope, callStack);
}
