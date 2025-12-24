import { autobind } from '../../utils/mini-autobind.js';
import { AiScriptError, NonAiScriptError, AiScriptNamespaceError, AiScriptIndexOutOfRangeError, AiScriptRuntimeError, AiScriptHostsideError } from '../../error.js';
import * as Ast from '../../node.js';
import { nodeToJs } from '../../utils/node-to-js.js';
import { Scope } from '../scope.js';
import { std } from '../lib/std.js';
import { RETURN, unWrapRet, BREAK, CONTINUE, assertValue, isControl, type Control, unWrapLabeledBreak } from '../control.js';
import { assertNumber, assertString, assertFunction, assertBoolean, assertObject, assertArray, eq, isObject, isArray, expectAny, reprValue, isFunction } from '../util.js';
import { NULL, FN_NATIVE, BOOL, NUM, STR, ARR, OBJ, FN, ERROR } from '../value.js';
import { getPrimProp } from '../primitive-props.js';
import { Variable } from '../variable.js';
import { Reference } from '../reference.js';
import type { JsValue } from '../util.js';
import type { Value, VFn, VUserFn } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

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
