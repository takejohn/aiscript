import { isControl, type Control, unWrapLabeledBreak } from '../../control.js';
import { assertBoolean } from '../../util.js';
import { NULL } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

export const ifEvaluator: Evaluator<Ast.Node & { type: 'if' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'if' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const cond = await context._eval(node.cond, scope, callStack);
		if (isControl(cond)) {
			return cond;
		}
		assertBoolean(cond);
		if (cond.value) {
			return unWrapLabeledBreak(await context._evalClause(node.then, scope, callStack), node.label);
		}
		for (const elseif of node.elseif) {
			const cond = await context._eval(elseif.cond, scope, callStack);
			if (isControl(cond)) {
				return cond;
			}
			assertBoolean(cond);
			if (cond.value) {
				return unWrapLabeledBreak(await context._evalClause(elseif.then, scope, callStack), node.label);
			}
		}
		if (node.else) {
			return unWrapLabeledBreak(await context._evalClause(node.else, scope, callStack), node.label);
		}
		return NULL;
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'if' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const cond = context._evalSync(node.cond, scope, callStack);
		if (isControl(cond)) {
			return cond;
		}
		assertBoolean(cond);
		if (cond.value) {
			return unWrapLabeledBreak(context._evalClauseSync(node.then, scope, callStack), node.label);
		}
		for (const elseif of node.elseif) {
			const cond = context._evalSync(elseif.cond, scope, callStack);
			if (isControl(cond)) {
				return cond;
			}
			assertBoolean(cond);
			if (cond.value) {
				return unWrapLabeledBreak(context._evalClauseSync(elseif.then, scope, callStack), node.label);
			}
		}
		if (node.else) {
			return unWrapLabeledBreak(context._evalClauseSync(node.else, scope, callStack), node.label);
		}
		return NULL;
	},
};
