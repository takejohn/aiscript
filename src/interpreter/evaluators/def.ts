import { isControl, type Control } from '../control.js';
import { isFunction } from '../util.js';
import { NULL } from '../value.js';
import type { Scope } from '../scope.js';
import type * as Ast from '../../node.js';
import type { Value } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const defEvaluator: Evaluator<Ast.Node & { type: 'def' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'def' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const value = await context._eval(node.expr, scope, callStack);
		if (isControl(value)) {
			return value;
		}
		await context.evalAndSetAttr(node.attr, value, scope, callStack);
		if (
			node.expr.type === 'fn'
			&& node.dest.type === 'identifier'
			&& isFunction(value)
			&& !value.native
		) {
			value.name = node.dest.name;
		}
		context.define(scope, node.dest, value, node.mut);
		return NULL;
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'def' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const value = context._evalSync(node.expr, scope, callStack);
		if (isControl(value)) {
			return value;
		}
		context.evalAndSetAttrSync(node.attr, value, scope, callStack);
		if (
			node.expr.type === 'fn'
			&& node.dest.type === 'identifier'
			&& isFunction(value)
			&& !value.native
		) {
			value.name = node.dest.name;
		}
		context.define(scope, node.dest, value, node.mut);
		return NULL;
	},
};
