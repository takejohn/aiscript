import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationStepResult } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Scope } from '../scope.js';

function evalIdentifier(node: Ast.Identifier, scope: Scope): EvaluationStepResult {
	return instructions.end(scope.get(node.name));
}

export const IdentifierEvaluator = evaluationStepsToEvaluator(evalIdentifier);
