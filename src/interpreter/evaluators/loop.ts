import { NULL } from '../value.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationStepResult } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Scope } from '../scope.js';

function evalLoop(node: Ast.Loop, scope: Scope): EvaluationStepResult {
	return instructions.run(node.statements, scope.createChildScope(), (v) => {
		if (v.type === 'break') {
			if (v.label != null && v.label !== node.label) {
				return instructions.end(v);
			}
			return instructions.end(NULL);
		} else if (v.type === 'continue') {
			if (v.label != null && v.label !== node.label) {
				return instructions.end(v);
			}
		} else if (v.type === 'return') {
			return instructions.end(v);
		}
		return evalLoop(node, scope);
	});
}

export const LoopEvaluator = evaluationStepsToEvaluator(evalLoop);
