import { NULL } from '../value.js';
import { isControl, unWrapLabeledBreak, type Control } from '../control.js';
import { eq } from '../util.js';
import { evalClauseAsync, evalClauseSync } from '../evaluator-utils.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export const MatchEvaluator: Evaluator<Ast.Match> = {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Match, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const about = await context.eval(node.about, scope, callStack);
		if (isControl(about)) {
			return about;
		}
		for (const qa of node.qs) {
			const q = await context.eval(qa.q, scope, callStack);
			if (isControl(q)) {
				return q;
			}
			if (eq(about, q)) {
				return unWrapLabeledBreak(await evalClauseAsync(context, qa.a, scope, callStack), node.label);
			}
		}
		if (node.default) {
			return unWrapLabeledBreak(await evalClauseAsync(context, node.default, scope, callStack), node.label);
		}
		return NULL;
	},

	evalSync(context: SyncEvaluatorContext, node: Ast.Match, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const about = context.eval(node.about, scope, callStack);
		if (isControl(about)) {
			return about;
		}
		for (const qa of node.qs) {
			const q = context.eval(qa.q, scope, callStack);
			if (isControl(q)) {
				return q;
			}
			if (eq(about, q)) {
				return unWrapLabeledBreak(evalClauseSync(context, qa.a, scope, callStack), node.label);
			}
		}
		if (node.default) {
			return unWrapLabeledBreak(evalClauseSync(context, node.default, scope, callStack), node.label);
		}
		return NULL;
	},
};
