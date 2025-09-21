import { NULL } from '../../value.js';
import { assertValue, isControl } from '../../control.js';
import { defineByDefinitionNode } from '../../define.js';
import { instructions } from '../step.js';
import type { EvaluationDoneResult, EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Value } from '../../value.js';
import type { Scope } from '../../scope.js';

export function evalDefinition(node: Ast.Definition, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.expr, scope, (value) => {
		if (isControl(value)) {
			return instructions.end(value);
		}

		const defineValue = (): EvaluationDoneResult => {
			defineByDefinitionNode(node, scope, value);
			return instructions.end(NULL);
		};

		const defineWithAttrs = (attrs: NonNullable<Value['attr']>, attrIterator: Iterator<Ast.Attribute>): EvaluationStepResult => {
			const nAttrResult = attrIterator.next();
			if (nAttrResult.done) {
				value.attr = attrs;
				return defineValue();
			}
			const nAttr = nAttrResult.value;
			return instructions.eval(nAttr.value, scope, (value) => {
				assertValue(value);
				attrs.push({
					name: nAttr.name,
					value,
				});
				return defineWithAttrs(attrs, attrIterator);
			});
		};

		if (node.attr.length > 0) {
			const attrs: NonNullable<Value['attr']> = [];
			const attrIterator = node.attr.values();
			return defineWithAttrs(attrs, attrIterator);
		}

		return defineValue();
	});
}

