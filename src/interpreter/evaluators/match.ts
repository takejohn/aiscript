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
