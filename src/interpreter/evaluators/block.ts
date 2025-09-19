import { unWrapLabeledBreak } from '../control.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationStepResult } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Scope } from '../scope.js';

function evalBlock(node: Ast.Block, scope: Scope): EvaluationStepResult {
	return instructions.run(node.statements, scope.createChildScope(), (value) => {
		return instructions.end(unWrapLabeledBreak(value, node.label));
	});
}

export const BlockEvaluator = evaluationStepsToEvaluator(evalBlock);
