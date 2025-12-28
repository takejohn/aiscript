import { isControl, type Control, unWrapLabeledBreak } from '../../control.js';
import { eq } from '../../util.js';
import { NULL } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const matchEvaluator: Evaluator<Ast.Node & { type: 'match' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'match' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const about = await context._eval(node.about, scope, callStack);
		if (isControl(about)) {
			return about;
		}
		for (const qa of node.qs) {
			const q = await context._eval(qa.q, scope, callStack);
			if (isControl(q)) {
				return q;
			}
			if (eq(about, q)) {
				return unWrapLabeledBreak(await context._evalClause(qa.a, scope, callStack), node.label);
			}
		}
		if (node.default) {
			return unWrapLabeledBreak(await context._evalClause(node.default, scope, callStack), node.label);
		}
		return NULL;
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'match' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const about = context._evalSync(node.about, scope, callStack);
		if (isControl(about)) {
			return about;
		}
		for (const qa of node.qs) {
			const q = context._evalSync(qa.q, scope, callStack);
			if (isControl(q)) {
				return q;
			}
			if (eq(about, q)) {
				return unWrapLabeledBreak(context._evalClauseSync(qa.a, scope, callStack), node.label);
			}
		}
		if (node.default) {
			return unWrapLabeledBreak(context._evalClauseSync(node.default, scope, callStack), node.label);
		}
		return NULL;
	},
};
