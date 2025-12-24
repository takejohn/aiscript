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

export const indexEvaluator: Evaluator<Ast.Node & { type: 'index' }> = {
	async evalAsync(context: AsyncEvaluationContext, node: Ast.Node & { type: 'index' }, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const target = await context._eval(node.target, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const i = await context._eval(node.index, scope, callStack);
		if (isControl(i)) {
			return i;
		}
		if (isArray(target)) {
			assertNumber(i);
			const item = target.value[i.value];
			if (item === undefined) {
				throw new AiScriptIndexOutOfRangeError(`Index out of range. index: ${i.value} max: ${target.value.length - 1}`);
			}
			return item;
		} else if (isObject(target)) {
			assertString(i);
			if (target.value.has(i.value)) {
				return target.value.get(i.value)!;
			} else {
				return NULL;
			}
		} else {
			throw new AiScriptRuntimeError(`Cannot read prop (${reprValue(i)}) of ${target.type}.`);
		}
	},

	evalSync(context: SyncEvaluationContext, node: Ast.Node & { type: 'index' }, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const target = context._evalSync(node.target, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const i = context._evalSync(node.index, scope, callStack);
		if (isControl(i)) {
			return i;
		}
		if (isArray(target)) {
			assertNumber(i);
			const item = target.value[i.value];
			if (item === undefined) {
				throw new AiScriptIndexOutOfRangeError(`Index out of range. index: ${i.value} max: ${target.value.length - 1}`);
			}
			return item;
		} else if (isObject(target)) {
			assertString(i);
			if (target.value.has(i.value)) {
				return target.value.get(i.value)!;
			} else {
				return NULL;
			}
		} else {
			throw new AiScriptRuntimeError(`Cannot read prop (${reprValue(i)}) of ${target.type}.`);
		}
	},
};
