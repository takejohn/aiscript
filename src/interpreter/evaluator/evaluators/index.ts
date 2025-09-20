import { NULL } from '../../value.js';
import { isControl } from '../../control.js';
import { assertNumber, assertString, isArray, isObject, reprValue } from '../../util.js';
import { AiScriptIndexOutOfRangeError, AiScriptRuntimeError } from '../../../error.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { Control } from '../../control.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Value } from '../../value.js';
import type { Scope } from '../../scope.js';

function evalIndex(node: Ast.Index, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.target, scope, (target) => {
		if (isControl(target)) {
			return instructions.end(target);
		}
		return instructions.eval<Value | Control>(node.index, scope, (i) => {
			if (isControl(i)) {
				return instructions.end(i);
			}
			return instructions.end(getIndex(target, i));
		});
	});
}

function getIndex(target: Value, i: Value): Value {
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

export const IndexEvaluator = evaluationStepsToEvaluator(evalIndex);
