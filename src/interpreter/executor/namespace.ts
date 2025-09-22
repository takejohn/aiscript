import { AiScriptNamespaceError } from '../../error.js';
import type { Ast, Scope } from '../../index.js';

export type ImmutableIdentifierDefinition = Ast.Definition & { dest: Ast.Identifier, mut: false };

export function* iterateNs(script: Ast.Node[], scope: Scope): IterableIterator<[ImmutableIdentifierDefinition, Scope]> {
	for (const node of script) {
		switch (node.type) {
			case 'ns': {
				yield* iterateNsMembers(node, scope);
				break;
			}

			default: {
				// nop
			}
		}
	}
}

function* iterateNsMembers(ns: Ast.Namespace, scope: Scope): IterableIterator<[ImmutableIdentifierDefinition, Scope]> {
	const nsScope = scope.createChildNamespaceScope(ns.name);

	yield* iterateNs(ns.members, nsScope);

	for (const node of ns.members) {
		switch (node.type) {
			case 'def': {
				assertImmutableIdentifierDefinition(node);
				yield [node, nsScope];
				break;
			}

			case 'ns': {
				break; // nop
			}

			default: {
				// exhaustiveness check
				const n: never = node;
				const nd = n as Ast.Node;
				throw new AiScriptNamespaceError('invalid ns member type: ' + nd.type, nd.loc.start);
			}
		}
	}
}

function assertImmutableIdentifierDefinition(node: Ast.Definition): asserts node is ImmutableIdentifierDefinition {
	if (node.dest.type !== 'identifier') {
		throw new AiScriptNamespaceError('Destructuring assignment is invalid in namespace declarations.', node.loc.start);
	}
	if (node.mut) {
		throw new AiScriptNamespaceError('No "var" in namespace declaration: ' + node.dest.name, node.loc.start);
	}
}
