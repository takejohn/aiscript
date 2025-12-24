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

export const arrEvaluator: Evaluator<Ast.Node & { type: 'arr' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'arr' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const value = [];
		for (const item of node.value) {
			const valueItem = await context._eval(item, scope, callStack);
			if (isControl(valueItem)) {
				return valueItem;
			}
			value.push(valueItem);
		}
		return ARR(value);
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'arr' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const value = [];
		for (const item of node.value) {
			const valueItem = context._evalSync(item, scope, callStack);
			if (isControl(valueItem)) {
				return valueItem;
			}
			value.push(valueItem);
		}
		return ARR(value);
	},
};
