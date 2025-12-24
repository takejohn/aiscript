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

export const orEvaluator: Evaluator<Ast.Node & { type: 'or' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'or' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const leftValue = await context._eval(node.left, scope, callStack);
		if (isControl(leftValue)) {
			return leftValue;
		}
		assertBoolean(leftValue);

		if (leftValue.value) {
			return leftValue;
		} else {
			const rightValue = await context._eval(node.right, scope, callStack);
			if (isControl(rightValue)) {
				return rightValue;
			}
			assertBoolean(rightValue);
			return rightValue;
		}
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'or' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const leftValue = context._evalSync(node.left, scope, callStack);
		if (isControl(leftValue)) {
			return leftValue;
		}
		assertBoolean(leftValue);

		if (leftValue.value) {
			return leftValue;
		} else {
			const rightValue = context._evalSync(node.right, scope, callStack);
			if (isControl(rightValue)) {
				return rightValue;
			}
			assertBoolean(rightValue);
			return rightValue;
		}
	},
};
