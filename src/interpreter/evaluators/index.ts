import { NULL } from '../value.js';
import { isControl, type Control } from '../control.js';
import { assertNumber, assertString, isArray, isObject, reprValue } from '../util.js';
import { AiScriptIndexOutOfRangeError, AiScriptRuntimeError } from '../../error.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from '../context.js';
import type { CallInfo, Evaluator } from '../types.js';

export class IndexEvaluator implements Evaluator<Ast.Index> {
	async evalAsync(context: AsyncEvaluatorContext, node: Ast.Index, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
		const target = await context.eval(node.target, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const i = await context.eval(node.index, scope, callStack);
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
	}

	evalSync(context: SyncEvaluatorContext, node: Ast.Index, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
		const target = context.eval(node.target, scope, callStack);
		if (isControl(target)) {
			return target;
		}
		const i = context.eval(node.index, scope, callStack);
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
	}
};
