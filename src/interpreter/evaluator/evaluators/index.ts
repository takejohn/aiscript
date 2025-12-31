import { AiScriptIndexOutOfRangeError, AiScriptRuntimeError } from '../../../error.js';
import { isControl, type Control } from '../../control.js';
import { assertNumber, assertString, isObject, isArray, reprValue } from '../../util.js';
import { NULL } from '../../value.js';
import type { Scope } from '../../scope.js';
import type * as Ast from '../../../node.js';
import type { Value } from '../../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../context.js';

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
