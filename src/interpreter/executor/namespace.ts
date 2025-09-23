import { AiScriptNamespaceError } from '../../error.js';
import type { Ast, Scope } from '../../index.js';

export type ImmutableIdentifierDefinition = Ast.Definition & { dest: Ast.Identifier, mut: false };

type State = {
	readonly members: Iterator<Ast.Namespace['members'][number]>;
	readonly scope: Scope;
	readonly definitions: Ast.Definition[];
};

export function* iterateDefinitionsInNamespaces(script: Ast.Node[], scope: Scope): IterableIterator<[ImmutableIdentifierDefinition, Scope]> {
	for (const node of script) {
		if (node.type === 'ns') {
			yield* iterateDefinitionsInNamespace(node, scope.createChildNamespaceScope(node.name));
		}
	}
}

function* iterateDefinitionsInNamespace(ns: Ast.Namespace, nsScope: Scope): IterableIterator<[ImmutableIdentifierDefinition, Scope]> {
	const stack: State[] = [{ members: ns.members.values(), scope: nsScope, definitions: [] }];
	while (stack.length > 0) {
		const { members, scope, definitions } = stack.at(-1)!;
		const memberResult = members.next();

		if (memberResult.done) {
			for (const definition of definitions) {
				assertImmutableIdentifierDefinition(definition);
				yield [definition, scope];
			}
			stack.pop();
			continue;
		}

		const member = memberResult.value;
		switch (member.type) {
			case 'ns': {
				stack.push({
					members: member.members.values(),
					scope: scope.createChildNamespaceScope(member.name),
					definitions: [],
				});
				break;
			}

			case 'def': {
				definitions.push(member);
				break;
			}

			default: {
				// exhaustiveness check
				const n: never = member;
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
