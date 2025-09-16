import { NULL } from '../value.js';
import { isControl, unWrapLabeledBreak, type Control } from '../control.js';
import { assertBoolean } from '../util.js';
import { evalClauseAsync, evalClauseSync } from './evaluator-utils.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export const IfEvaluator: Evaluator<Ast.If> = {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.If, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const cond = await context.eval(node.cond, scope, callStack);
		if (isControl(cond)) {
			return cond;
		}
		assertBoolean(cond);
		if (cond.value) {
			return unWrapLabeledBreak(await evalClauseAsync(context, node.then, scope, callStack), node.label);
		}
		for (const elseif of node.elseif) {
			const cond = await context.eval(elseif.cond, scope, callStack);
			if (isControl(cond)) {
				return cond;
			}
			assertBoolean(cond);
			if (cond.value) {
				return unWrapLabeledBreak(await evalClauseAsync(context, elseif.then, scope, callStack), node.label);
			}
		}
		if (node.else) {
			return unWrapLabeledBreak(await evalClauseAsync(context, node.else, scope, callStack), node.label);
		}
		return NULL;
	},

	evalSync(context: SyncEvaluatorContext, node: Ast.If, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const cond = context.eval(node.cond, scope, callStack);
		if (isControl(cond)) {
			return cond;
		}
		assertBoolean(cond);
		if (cond.value) {
			return unWrapLabeledBreak(evalClauseSync(context, node.then, scope, callStack), node.label);
		}
		for (const elseif of node.elseif) {
			const cond = context.eval(elseif.cond, scope, callStack);
			if (isControl(cond)) {
				return cond;
			}
			assertBoolean(cond);
			if (cond.value) {
				return unWrapLabeledBreak(evalClauseSync(context, elseif.then, scope, callStack), node.label);
			}
		}
		if (node.else) {
			return unWrapLabeledBreak(evalClauseSync(context, node.else, scope, callStack), node.label);
		}
		return NULL;
	},
};
