import { NULL } from '../../value.js';
import { isControl } from '../../control.js';
import { isObject } from '../../util.js';
import { getPrimProp } from '../../primitive-props.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { Control } from '../../control.js';
import type { Value } from '../../value.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

function evalProp(node: Ast.Prop, scope: Scope): EvaluationStepResult {
	return instructions.eval<Value | Control>(node.target, scope, (target) => {
		if (isControl(target)) {
			return instructions.end(target);
		}
		if (isObject(target)) {
			if (target.value.has(node.name)) {
				return instructions.end(target.value.get(node.name)!);
			} else {
				return instructions.end(NULL);
			}
		} else {
			return instructions.end(getPrimProp(target, node.name));
		}
	});
}

export const PropEvaluator = evaluationStepsToEvaluator(evalProp);
