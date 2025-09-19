import { evaluationStepsToEvaluator } from '../evaluator.js';
import type { Ast } from '../../index.js';

function evalNever(): never {
	throw new Error('invalid node type');
}

export const NeverEvaluator = evaluationStepsToEvaluator<Ast.Node>(evalNever);
