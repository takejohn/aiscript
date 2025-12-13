import { assert, describe, expect, test } from 'vitest';
import { utils } from '../src/index.js';
import { NUM, STR, NULL, ARR, OBJ, BOOL, TRUE, FALSE, ERROR ,FN_NATIVE } from '../src/interpreter/value.js';
import { AiScriptRuntimeError, AiScriptUnexpectedEOFError } from '../src/error.js';
import { exe, getMeta } from './testutils.js';

/*
 * General
 */
describe('terminator', () => {
	describe('top-level', () => {
		test.concurrent('newline', async () => {
			const res = await exe(`
			:: A {
				let x = 1
			}
			:: B {
				let x = 2
			}
			<: A:x
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('semi colon', async () => {
			const res = await exe(`
			::A{let x = 1};::B{let x = 2}
			<: A:x
			`);
			expect(res).toEqualValueOf(NUM(1));
		});

		test.concurrent('semi colon of the tail', async () => {
			const res = await exe(`
			::A{let x = 1};
			<: A:x
			`);
			expect(res).toEqualValueOf(NUM(1));
		});
	});

	describe('block', () => {
		test.concurrent('newline', async () => {
			const res = await exe(`
			eval {
				let x = 1
				let y = 2
				<: x + y
			}
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('semi colon', async () => {
			const res = await exe(`
			eval{let x=1;let y=2;<:x+y}
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('semi colon of the tail', async () => {
			const res = await exe(`
			eval{let x=1;<:x;}
			`);
			expect(res).toEqualValueOf(NUM(1));
		});
	});

	describe('namespace', () => {
		test.concurrent('newline', async () => {
			const res = await exe(`
			:: A {
				let x = 1
				let y = 2
			}
			<: A:x + A:y
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('semi colon', async () => {
			const res = await exe(`
			::A{let x=1;let y=2}
			<: A:x + A:y
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('semi colon of the tail', async () => {
			const res = await exe(`
			::A{let x=1;}
			<: A:x
			`);
			expect(res).toEqualValueOf(NUM(1));
		});
	});
});

describe('separator', () => {
	describe('match', () => {
		test.concurrent('multi line', async () => {
			const res = await exe(`
			let x = 1
			<: match x {
				case 1 => "a"
				case 2 => "b"
			}
			`);
			expect(res).toEqualValueOf(STR('a'));
		});

		test.concurrent('multi line with semi colon', async () => {
			const res = await exe(`
			let x = 1
			<: match x {
				case 1 => "a",
				case 2 => "b"
			}
			`);
			expect(res).toEqualValueOf(STR('a'));
		});

		test.concurrent('single line', async () => {
			const res = await exe(`
			let x = 1
			<:match x{case 1=>"a",case 2=>"b"}
			`);
			expect(res).toEqualValueOf(STR('a'));
		});

		test.concurrent('single line with tail semi colon', async () => {
			const res = await exe(`
			let x = 1
			<: match x{case 1=>"a",case 2=>"b",}
			`);
			expect(res).toEqualValueOf(STR('a'));
		});

		test.concurrent('multi line (default)', async () => {
			const res = await exe(`
			let x = 3
			<: match x {
				case 1 => "a"
				case 2 => "b"
				default => "c"
			}
			`);
			expect(res).toEqualValueOf(STR('c'));
		});

		test.concurrent('multi line with semi colon (default)', async () => {
			const res = await exe(`
			let x = 3
			<: match x {
				case 1 => "a",
				case 2 => "b",
				default => "c"
			}
			`);
			expect(res).toEqualValueOf(STR('c'));
		});

		test.concurrent('single line (default)', async () => {
			const res = await exe(`
			let x = 3
			<:match x{case 1=>"a",case 2=>"b",default=>"c"}
			`);
			expect(res).toEqualValueOf(STR('c'));
		});

		test.concurrent('single line with tail semi colon (default)', async () => {
			const res = await exe(`
			let x = 3
			<:match x{case 1=>"a",case 2=>"b",default=>"c",}
			`);
			expect(res).toEqualValueOf(STR('c'));
		});

		test.concurrent('no separator', async () => {
			await expect(async () => {
				await exe(`
				let x = 1
				<:match x{case 1=>"a" case 2=>"b"}
				`);
			}).rejects.toThrow();
		});

		test.concurrent('no separator (default)', async () => {
			await expect(async () => {
				await exe(`
				let x = 1
				<:match x{case 1=>"a" default=>"b"}
				`);
			}).rejects.toThrow();
		});
	});

	describe('call', () => {
		test.concurrent('multi line', async () => {
			const res = await exe(`
			@f(a, b, c) {
				a * b + c
			}
			<: f(
				2
				3
				1
			)
			`);
			expect(res).toEqualValueOf(NUM(7));
		});

		test.concurrent('multi line with comma', async () => {
			const res = await exe(`
			@f(a, b, c) {
				a * b + c
			}
			<: f(
				2,
				3,
				1
			)
			`);
			expect(res).toEqualValueOf(NUM(7));
		});

		test.concurrent('single line', async () => {
			const res = await exe(`
			@f(a, b, c) {
				a * b + c
			}
			<:f(2,3,1)
			`);
			expect(res).toEqualValueOf(NUM(7));
		});

		test.concurrent('single line with tail comma', async () => {
			const res = await exe(`
			@f(a, b, c) {
				a * b + c
			}
			<:f(2,3,1,)
			`);
			expect(res).toEqualValueOf(NUM(7));
		});
	});

	describe('obj', () => {
		test.concurrent('multi line', async () => {
			const res = await exe(`
			let x = {
				a: 1
				b: 2
			}
			<: x.b
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('multi line, multi newlines', async () => {
			const res = await exe(`
			let x = {

				a: 1

				b: 2

			}
			<: x.b
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('multi line with comma', async () => {
			const res = await exe(`
			let x = {
				a: 1,
				b: 2
			}
			<: x.b
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('single line', async () => {
			const res = await exe(`
			let x={a:1,b:2}
			<: x.b
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('single line with tail comma', async () => {
			const res = await exe(`
			let x={a:1,b:2,}
			<: x.b
			`);
			expect(res).toEqualValueOf(NUM(2));
		});
	});

	describe('arr', () => {
		test.concurrent('multi line', async () => {
			const res = await exe(`
			let x = [
				1
				2
			]
			<: x[1]
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('multi line, multi newlines', async () => {
			const res = await exe(`
			let x = [

				1

				2

			]
			<: x[1]
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('multi line with comma', async () => {
			const res = await exe(`
			let x = [
				1,
				2
			]
			<: x[1]
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('multi line with comma, multi newlines', async () => {
			const res = await exe(`
			let x = [

				1,

				2

			]
			<: x[1]
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('multi line with comma and tail comma', async () => {
			const res = await exe(`
			let x = [
				1,
				2,
			]
			<: x[1]
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('multi line with comma and tail comma, multi newlines', async () => {
			const res = await exe(`
			let x = [

				1,

				2,

			]
			<: x[1]
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('single line', async () => {
			const res = await exe(`
			let x=[1,2]
			<: x[1]
			`);
			expect(res).toEqualValueOf(NUM(2));
		});

		test.concurrent('single line with tail comma', async () => {
			const res = await exe(`
			let x=[1,2,]
			<: x[1]
			`);
			expect(res).toEqualValueOf(NUM(2));
		});
	});

	describe('function params', () => {
		test.concurrent('single line', async () => {
			const res = await exe(`
			@f(a, b) {
				a + b
			}
			<: f(1, 2)
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('single line with tail comma', async () => {
			const res = await exe(`
			@f(a, b, ) {
				a + b
			}
			<: f(1, 2)
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('multi line', async () => {
			const res = await exe(`
			@f(
				a
				b
			) {
				a + b
			}
			<: f(1, 2)
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('multi line with comma', async () => {
			const res = await exe(`
			@f(
				a,
				b
			) {
				a + b
			}
			<: f(1, 2)
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('multi line with tail comma', async () => {
			const res = await exe(`
			@f(
				a,
				b,
			) {
				a + b
			}
			<: f(1, 2)
			`);
			expect(res).toEqualValueOf(NUM(3));
		});

		test.concurrent('destructuring param', async () => {
			const res = await exe(`
			@f([a, b]) {
				a + b
			}
			<: f([1, 2])
			`);
			expect(res).toEqualValueOf(NUM(3));
		});
	});
});


describe('Comment', () => {
	test.concurrent('single line comment', async () => {
		const res = await exe(`
		// let a = ...
		let a = 42
		<: a
		`);
		expect(res).toEqualValueOf(NUM(42));
	});

	test.concurrent('multi line comment', async () => {
		const res = await exe(`
		/* variable declaration here...
			let a = ...
		*/
		let a = 42
		<: a
		`);
		expect(res).toEqualValueOf(NUM(42));
	});

	test.concurrent('multi line comment 2', async () => {
		const res = await exe(`
		/* variable declaration here...
			let a = ...
		*/
		let a = 42
		/*
			another comment here
		*/
		<: a
		`);
		expect(res).toEqualValueOf(NUM(42));
	});

	test.concurrent('// as string', async () => {
		const res = await exe('<: "//"');
		expect(res).toEqualValueOf(STR('//'));
	});

	test.concurrent('line tail', async () => {
		const res = await exe(`
		let x = 'a' // comment
		let y = 'b'
		<: x
		`);
		expect(res).toEqualValueOf(STR('a'));
	});

	test.concurrent('invalid EOF in multi line comment', async () => {
		await expect(() => exe(`
		/* comment
		`)).rejects.toThrow(AiScriptUnexpectedEOFError);
	});

	test.concurrent('invalid EOF in multi line comment 2', async () => {
		await expect(() => exe('/* comment *')).rejects.toThrow(AiScriptUnexpectedEOFError);
	});
});

describe('lang version', () => {
	test.concurrent('number', async () => {
		const res = utils.getLangVersion(`
		/// @2021
		@f(x) {
			x
		}
		`);
		assert.strictEqual(res, '2021');
	});

	test.concurrent('chars', async () => {
		const res = utils.getLangVersion(`
		/// @ canary
		const a = 1
		@f(x) {
			x
		}
		f(a)
		`);
		assert.strictEqual(res, 'canary');
	});

	test.concurrent('complex', async () => {
		const res = utils.getLangVersion(`
		/// @ 2.0-Alpha
		@f(x) {
			x
		}
		`);
		assert.strictEqual(res, '2.0-Alpha');
	});

	test.concurrent('no specified', async () => {
		const res = utils.getLangVersion(`
		@f(x) {
			x
		}
		`);
		assert.strictEqual(res, null);
	});
});

/*
 * Statements
 */
describe('Cannot put multiple statements in a line', () => {
	test.concurrent('var def', async () => {
		try {
			await exe(`
			let a = 42 let b = 11
			`);
		} catch (e) {
			assert.ok(true);
			return;
		}
		assert.fail();
	});

	test.concurrent('var def (op)', async () => {
		try {
			await exe(`
			let a = 13 + 75 let b = 24 + 146
			`);
		} catch (e) {
			assert.ok(true);
			return;
		}
		assert.fail();
	});

	test.concurrent('var def in block', async () => {
		try {
			await exe(`
			eval {
				let a = 42 let b = 11
			}
			`);
		} catch (e) {
			assert.ok(true);
			return;
		}
		assert.fail();
	});
});

describe('Variable declaration', () => {
	test.concurrent('let', async () => {
		const res = await exe(`
			let a = 42
			<: a
		`);
		expect(res).toEqualValueOf(NUM(42));
	});
	test.concurrent('Do not assign to let (issue #328)', async () => {
		const err = await exe(`
			let hoge = 33
			hoge = 4
		`).then(() => undefined).catch(err => err);

		assert.ok(err instanceof AiScriptRuntimeError);
	});
	test.concurrent('destructuring declaration', async () => {
		const res = await exe(`
			let [a, { value: b }] = [1, { value: 2 }]
			<: [a, b]
		`);
		expect(res).toEqualValueOf(ARR([NUM(1), NUM(2)]));
	});
	test.concurrent('empty function', async () => {
		const res = await exe(`
			@hoge() { }
			<: hoge()
		`);
		expect(res).toEqualValueOf(NULL);
	});
});

describe('Variable assignment', () => {
	test.concurrent('simple', async () => {
		expect(await exe(`
			var hoge = 25
			hoge = 7
			<: hoge
		`)).toEqualValueOf(NUM(7));
	});
	test.concurrent('destructuring assignment', async () => {
		expect(await exe(`
			var hoge = 'foo'
			var fuga = { value: 'bar' }
			[{ value: hoge }, fuga] = [fuga, hoge]
			<: [hoge, fuga]
		`)).toEqualValueOf(ARR([STR('bar'), STR('foo')]));
	});

	describe('eval left hand once', () => {
		test.concurrent('add', async () => {
			const res = await exe(`
			var index = -1
			let array = [0, 0]
			array[eval { index += 1; index }] += 1
			<: array
			`);
			expect(res).toEqualValueOf(ARR([NUM(1), NUM(0)]));
		});

		test.concurrent('sub', async () => {
			const res = await exe(`
			var index = -1
			let array = [0, 0]
			array[eval { index += 1; index }] -= 1
			<: array
			`);
			expect(res).toEqualValueOf(ARR([NUM(-1), NUM(0)]));
		});
	});
});

describe('for', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		var count = 0
		for (let i, 10) {
			count += i + 1
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(55));
	});

	test.concurrent('initial value', async () => {
		const res = await exe(`
		var count = 0
		for (let i = 2, 10) {
			count += i
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(65));
	});

	test.concurrent('wuthout iterator', async () => {
		const res = await exe(`
		var count = 0
		for (10) {
			count = (count + 1)
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(10));
	});

	test.concurrent('without brackets', async () => {
		const res = await exe(`
		var count = 0
		for let i, 10 {
			count = (count + i)
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(45));
	});

	test.concurrent('Break', async () => {
		const res = await exe(`
		var count = 0
		for (let i, 20) {
			if (i == 11) break
			count += i
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(55));
	});

	test.concurrent('continue', async () => {
		const res = await exe(`
		var count = 0
		for (let i, 10) {
			if (i == 5) continue
			count = (count + 1)
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(9));
	});

	test.concurrent('single statement', async () => {
		const res = await exe(`
		var count = 0
		for 10 count += 1
		<: count
		`);
		expect(res).toEqualValueOf(NUM(10));
	});

	test.concurrent('var name without space', async () => {
		try {
			await exe(`
			for (leti, 10) {
				<: i
			}
			`);
		} catch (e) {
			assert.ok(true);
			return;
		}
		assert.fail();
	});

	test.concurrent('scope', async () => {
		await expect(async () => {
			await exe(`
			for 1 let a = 1
			<: a
			`);
		}).rejects.toThrow();
	});

	test.concurrent('with label', async () => {
		const res = await exe(`
		var count = 0
		#label: for (let i, 10) {
			count += i + 1
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(55));
	});
});

describe('each', () => {
	test.concurrent('standard', async () => {
		const res = await exe(`
		let msgs = []
		each let item, ["ai", "chan", "kawaii"] {
			msgs.push([item, "!"].join())
		}
		<: msgs
		`);
		expect(res).toEqualValueOf(ARR([STR('ai!'), STR('chan!'), STR('kawaii!')]));
	});

	test.concurrent('destructuring declaration', async () => {
		const res = await exe(`
			each let { value: a }, [{ value: 1 }] {
				<: a
			}
		`);
		expect(res).toEqualValueOf(NUM(1));
	});

	test.concurrent('Break', async () => {
		const res = await exe(`
		let msgs = []
		each let item, ["ai", "chan", "kawaii", "yo"] {
			if (item == "kawaii") break
			msgs.push([item, "!"].join())
		}
		<: msgs
		`);
		expect(res).toEqualValueOf(ARR([STR('ai!'), STR('chan!')]));
	});

	test.concurrent('single statement', async () => {
		const res = await exe(`
		let msgs = []
		each let item, ["ai", "chan", "kawaii"] msgs.push([item, "!"].join())
		<: msgs
		`);
		expect(res).toEqualValueOf(ARR([STR('ai!'), STR('chan!'), STR('kawaii!')]));
	});

	test.concurrent('var name without space', async () => {
		try {
			await exe(`
			each letitem, ["ai", "chan", "kawaii"] {
				<: item
			}
			`);
		} catch (e) {
			assert.ok(true);
			return;
		}
		assert.fail();
	});

	test.concurrent('with label', async () => {
		const res = await exe(`
		let msgs = []
		#label: each let item, ["ai", "chan", "kawaii"] {
			msgs.push([item, "!"].join())
		}
		<: msgs
		`);
		expect(res).toEqualValueOf(ARR([STR('ai!'), STR('chan!'), STR('kawaii!')]));
	});
});

describe('while', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		var count = 0
		while count < 42 {
			count += 1
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(42));
	});

	test.concurrent('start false', async () => {
		const res = await exe(`
		while false {
			<: 'hoge'
		}
		`);
		expect(res).toEqualValueOf(NULL);
	});

	test.concurrent('with label', async () => {
		const res = await exe(`
		var count = 0
		#label: while count < 42 {
			count += 1
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(42));
	});
});

describe('do-while', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		var count = 0
		do {
			count += 1
		} while count < 42
		<: count
		`);
		expect(res).toEqualValueOf(NUM(42));
	});

	test.concurrent('start false', async () => {
		const res = await exe(`
		do {
			<: 'hoge'
		} while false
		`);
		expect(res).toEqualValueOf(STR('hoge'));
	});

	test.concurrent('with label', async () => {
		const res = await exe(`
		var count = 0
		do {
			count += 1
		} while count < 42
		<: count
		`);
		expect(res).toEqualValueOf(NUM(42));
	});
});

describe('loop', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		var count = 0
		loop {
			if (count == 10) break
			count = (count + 1)
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(10));
	});

	test.concurrent('with continue', async () => {
		const res = await exe(`
		var a = ["ai", "chan", "kawaii", "yo", "!"]
		var b = []
		loop {
			var x = a.shift()
			if (x == "chan") continue
			if (x == "yo") break
			b.push(x)
		}
		<: b
		`);
		expect(res).toEqualValueOf(ARR([STR('ai'), STR('kawaii')]));
	});

	test.concurrent('with label', async () => {
		const res = await exe(`
		var count = 0
		#label: loop {
			if (count == 10) break
			count = (count + 1)
		}
		<: count
		`);
		expect(res).toEqualValueOf(NUM(10));
	});
});

/*
 * Global statements
 */
describe('meta', () => {
	test.concurrent('default meta', async () => {
		const res = getMeta(`
		### { a: 1, b: 2, c: 3, }
		`);
		expect(res).toStrictEqual(new Map([
			[null, {
				a: 1,
				b: 2,
				c: 3,
			}]
		]));
		expect(res!.get(null)).toStrictEqual({
			a: 1,
			b: 2,
			c: 3,
		});
	});

	describe('String', () => {
		test.concurrent('valid', async () => {
			const res = getMeta(`
			### x "hoge"
			`);
			expect(res).toStrictEqual(new Map([
				['x', 'hoge']
			]));
		});
	});

	describe('Number', () => {
		test.concurrent('valid', async () => {
			const res = getMeta(`
			### x 42
			`);
			expect(res).toStrictEqual(new Map([
				['x', 42]
			]));
		});
	});

	describe('Boolean', () => {
		test.concurrent('valid', async () => {
			const res = getMeta(`
			### x true
			`);
			expect(res).toStrictEqual(new Map([
				['x', true]
			]));
		});
	});

	describe('Null', () => {
		test.concurrent('valid', async () => {
			const res = getMeta(`
			### x null
			`);
			expect(res).toStrictEqual(new Map([
				['x', null]
			]));
		});
	});

	describe('Array', () => {
		test.concurrent('valid', async () => {
			const res = getMeta(`
			### x [1, 2, 3]
			`);
			expect(res).toStrictEqual(new Map([
				['x', [1, 2, 3]]
			]));
		});

		test.concurrent('invalid', async () => {
			try {
				getMeta(`
				### x [1, (2 + 2), 3]
				`);
			} catch (e) {
				assert.ok(true);
				return;
			}
			assert.fail();
		});
	});

	describe('Object', () => {
		test.concurrent('valid', async () => {
			const res = getMeta(`
			### x { a: 1, b: 2, c: 3, }
			`);
			expect(res).toStrictEqual(new Map([
				['x', {
					a: 1,
					b: 2,
					c: 3,
				}]
			]));
		});

		test.concurrent('invalid', async () => {
			try {
				getMeta(`
				### x { a: 1, b: (2 + 2), c: 3, }
				`);
			} catch (e) {
				assert.ok(true);
				return;
			}
			assert.fail();
		});
	});

	describe('Template', () => {
		test.concurrent('invalid', async () => {
			try {
				getMeta(`
				### x \`foo {bar} baz\`
				`);
			} catch (e) {
				assert.ok(true);
				return;
			}
			assert.fail();
		});
	});

	describe('Expression', () => {
		test.concurrent('invalid', async () => {
			try {
				getMeta(`
				### x (1 + 1)
				`);
			} catch (e) {
				assert.ok(true);
				return;
			}
			assert.fail();
		});
	});

	describe('Labeled expression', () => {
		test.concurrent('invalid', async () => {
			expect(() => getMeta(`
			### x #label: eval { 1 }
			`)).toThrow();
		});
	});
});

describe('namespace', () => {
	test.concurrent('standard', async () => {
		const res = await exe(`
		<: Foo:bar()

		:: Foo {
			@bar() { "ai" }
		}
		`);
		expect(res).toEqualValueOf(STR('ai'));
	});

	test.concurrent('self ref', async () => {
		const res = await exe(`
		<: Foo:bar()

		:: Foo {
			let ai = "kawaii"
			@bar() { ai }
		}
		`);
		expect(res).toEqualValueOf(STR('kawaii'));
	});

	test.concurrent('cannot declare mutable variable', async () => {
		try {
			await exe(`
			:: Foo {
				var ai = "kawaii"
			}
			`);
		} catch (e) {
			assert.ok(true);
			return;
		}
		assert.fail();
	});

	test.concurrent('cannot destructuring declaration', async () => {
		try {
			await exe(`
			:: Foo {
				let [a, b] = [1, 2]
			}
			`);
		} catch {
			assert.ok(true);
			return;
		}
		assert.fail();
	});

	test.concurrent('nested', async () => {
		const res = await exe(`
		<: Foo:Bar:baz()

		:: Foo {
			:: Bar {
				@baz() { "ai" }
			}
		}
		`);
		expect(res).toEqualValueOf(STR('ai'));
	});

	test.concurrent('nested ref', async () => {
		const res = await exe(`
		<: Foo:baz

		:: Foo {
			let baz = Bar:ai
			:: Bar {
				let ai = "kawaii"
			}
		}
		`);
		expect(res).toEqualValueOf(STR('kawaii'));
	});
});

describe('operators', () => {
	test.concurrent('==', async () => {
		expect(await exe('<: (1 == 1)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (1 == 2)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (Core:type == Core:type)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (Core:type == Core:gt)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (@(){} == @(){})')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (Core:eq == @(){})')).toEqualValueOf(BOOL(false));
		expect(await exe(`
			let f = @(){}
			let g = f

			<: (f == g)
		`)).toEqualValueOf(BOOL(true));
	});

	test.concurrent('!=', async () => {
		expect(await exe('<: (1 != 2)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (1 != 1)')).toEqualValueOf(BOOL(false));
	});

	test.concurrent('&&', async () => {
		expect(await exe('<: (true && true)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (true && false)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (false && true)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (false && false)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (false && null)')).toEqualValueOf(BOOL(false));
		try {
			await exe('<: (true && null)');
		} catch (e) {
			assert.ok(e instanceof AiScriptRuntimeError);
			return;
		}

		expect(await exe(`
				var tmp = null

				@func() {
					tmp = true
					return true
				}

				false && func()

				<: tmp
			`)).toEqualValueOf(NULL)

		expect(await exe(`
				var tmp = null

				@func() {
					tmp = true
					return true
				}

				true && func()

				<: tmp
			`)).toEqualValueOf(BOOL(true))

		assert.fail();
	});

	test.concurrent('||', async () => {
		expect(await exe('<: (true || true)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (true || false)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (false || true)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (false || false)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (true || null)')).toEqualValueOf(BOOL(true));
		try {
			await exe('<: (false || null)');
		} catch (e) {
			assert.ok(e instanceof AiScriptRuntimeError);
			return;
		}

		expect(await exe(`
				var tmp = null

				@func() {
					tmp = true
					return true
				}

				true || func()

				<: tmp
			`)).toEqualValueOf(NULL)

		expect(await exe(`
				var tmp = null

				@func() {
					tmp = true
					return true
				}

				false || func()

				<: tmp
			`)).toEqualValueOf(BOOL(true))

		assert.fail();
	});

	test.concurrent('+', async () => {
		expect(await exe('<: (1 + 1)')).toEqualValueOf(NUM(2));
	});

	test.concurrent('-', async () => {
		expect(await exe('<: (1 - 1)')).toEqualValueOf(NUM(0));
	});

	test.concurrent('*', async () => {
		expect(await exe('<: (1 * 1)')).toEqualValueOf(NUM(1));
	});

	test.concurrent('^', async () => {
		expect(await exe('<: (1 ^ 0)')).toEqualValueOf(NUM(1));
	});

	test.concurrent('/', async () => {
		expect(await exe('<: (1 / 1)')).toEqualValueOf(NUM(1));
	});

	test.concurrent('%', async () => {
		expect(await exe('<: (1 % 1)')).toEqualValueOf(NUM(0));
	});

	test.concurrent('>', async () => {
		expect(await exe('<: (2 > 1)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (1 > 1)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (0 > 1)')).toEqualValueOf(BOOL(false));
	});

	test.concurrent('<', async () => {
		expect(await exe('<: (2 < 1)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (1 < 1)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (0 < 1)')).toEqualValueOf(BOOL(true));
	});

	test.concurrent('>=', async () => {
		expect(await exe('<: (2 >= 1)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (1 >= 1)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (0 >= 1)')).toEqualValueOf(BOOL(false));
	});

	test.concurrent('<=', async () => {
		expect(await exe('<: (2 <= 1)')).toEqualValueOf(BOOL(false));
		expect(await exe('<: (1 <= 1)')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (0 <= 1)')).toEqualValueOf(BOOL(true));
	});

	test.concurrent('precedence', async () => {
		expect(await exe('<: 1 + 2 * 3 + 4')).toEqualValueOf(NUM(11));
		expect(await exe('<: 1 + 4 / 4 + 1')).toEqualValueOf(NUM(3));
		expect(await exe('<: 1 + 1 == 2 && 2 * 2 == 4')).toEqualValueOf(BOOL(true));
		expect(await exe('<: (1 + 1) * 2')).toEqualValueOf(NUM(4));
	});

	test.concurrent('negative numbers', async () => {
		expect(await exe('<: 1+-1')).toEqualValueOf(NUM(0));
		expect(await exe('<: 1--1')).toEqualValueOf(NUM(2));//反直観的、禁止される可能性がある？
		expect(await exe('<: -1*-1')).toEqualValueOf(NUM(1));
		expect(await exe('<: -1==-1')).toEqualValueOf(BOOL(true));
		expect(await exe('<: 1>-1')).toEqualValueOf(BOOL(true));
		expect(await exe('<: -1<1')).toEqualValueOf(BOOL(true));
	});

});

describe('plus', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		let a = 1
		<: +a
		`);
		expect(res).toEqualValueOf(NUM(1));
	})
})

describe('minus', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		let a = 1
		<: -a
		`);
		expect(res).toEqualValueOf(NUM(-1));
	})
})

describe('not', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		<: !true
		`);
		expect(res).toEqualValueOf(BOOL(false));
	});
});

describe('Infix expression', () => {
	test.concurrent('simple infix expression', async () => {
		expect(await exe('<: 0 < 1')).toEqualValueOf(BOOL(true));
		expect(await exe('<: 1 + 1')).toEqualValueOf(NUM(2));
	});

	test.concurrent('combination', async () => {
		expect(await exe('<: 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10')).toEqualValueOf(NUM(55));
		expect(await exe('<: Core:add(1, 3) * Core:mul(2, 5)')).toEqualValueOf(NUM(40));
	});

	test.concurrent('use parentheses to distinguish expr', async () => {
		expect(await exe('<: (1 + 10) * (2 + 5)')).toEqualValueOf(NUM(77));
	});

	test.concurrent('syntax symbols vs infix operators', async () => {
		const res = await exe(`
		<: match true {
			case 1 == 1 => "true"
			case 1 < 1 => "false"
		}
		`);
		expect(res).toEqualValueOf(STR('true'));
	});

	test.concurrent('number + if expression', async () => {
		expect(await exe('<: 1 + if true 1 else 2')).toEqualValueOf(NUM(2));
	});

	test.concurrent('number + match expression', async () => {
		const res = await exe(`
			<: 1 + match 2 == 2 {
				case true => 3
				case false => 4
			}
		`);
		expect(res).toEqualValueOf(NUM(4));
	});

	test.concurrent('eval + eval', async () => {
		expect(await exe('<: eval { 1 } + eval { 1 }')).toEqualValueOf(NUM(2));
	});

	test.concurrent('disallow line break', async () => {
		try {
			await exe(`
			<: 1 +
			1 + 1
			`);
		} catch (e) {
			assert.ok(true);
			return;
		}
		assert.fail();
	});

	test.concurrent('escaped line break', async () => {
		expect(await exe(`
			<: 1 + \\
			1 + 1
		`)).toEqualValueOf(NUM(3));
	});

	test.concurrent('infix-to-fncall on namespace', async () => {
		expect(await exe(`
				:: Hoge {
					@add(x, y) {
						x + y
					}
				}
				<: Hoge:add(1, 2)
			`)).toEqualValueOf(NUM(3));
	});
});

describe('if', () => {
	test.concurrent('if', async () => {
		const res1 = await exe(`
		var msg = "ai"
		if true {
			msg = "kawaii"
		}
		<: msg
		`);
		expect(res1).toEqualValueOf(STR('kawaii'));

		const res2 = await exe(`
		var msg = "ai"
		if false {
			msg = "kawaii"
		}
		<: msg
		`);
		expect(res2).toEqualValueOf(STR('ai'));
	});

	test.concurrent('else', async () => {
		const res1 = await exe(`
		var msg = null
		if true {
			msg = "ai"
		} else {
			msg = "kawaii"
		}
		<: msg
		`);
		expect(res1).toEqualValueOf(STR('ai'));

		const res2 = await exe(`
		var msg = null
		if false {
			msg = "ai"
		} else {
			msg = "kawaii"
		}
		<: msg
		`);
		expect(res2).toEqualValueOf(STR('kawaii'));
	});

	test.concurrent('elif', async () => {
		const res1 = await exe(`
		var msg = "bebeyo"
		if false {
			msg = "ai"
		} elif true {
			msg = "kawaii"
		}
		<: msg
		`);
		expect(res1).toEqualValueOf(STR('kawaii'));

		const res2 = await exe(`
		var msg = "bebeyo"
		if false {
			msg = "ai"
		} elif false {
			msg = "kawaii"
		}
		<: msg
		`);
		expect(res2).toEqualValueOf(STR('bebeyo'));
	});

	test.concurrent('if ~ elif ~ else', async () => {
		const res1 = await exe(`
		var msg = null
		if false {
			msg = "ai"
		} elif true {
			msg = "chan"
		} else {
			msg = "kawaii"
		}
		<: msg
		`);
		expect(res1).toEqualValueOf(STR('chan'));

		const res2 = await exe(`
		var msg = null
		if false {
			msg = "ai"
		} elif false {
			msg = "chan"
		} else {
			msg = "kawaii"
		}
		<: msg
		`);
		expect(res2).toEqualValueOf(STR('kawaii'));
	});

	test.concurrent('expr', async () => {
		const res1 = await exe(`
		<: if true "ai" else "kawaii"
		`);
		expect(res1).toEqualValueOf(STR('ai'));

		const res2 = await exe(`
		<: if false "ai" else "kawaii"
		`);
		expect(res2).toEqualValueOf(STR('kawaii'));
	});

	test.concurrent('scope', async () => {
		await expect(async () => {
			await exe(`
			if true let a = 1
			<: a
			`);
		}).rejects.toThrow();
		await expect(async () => {
			await exe(`
			if false null elif true let a = 1
			<: a
			`);
		}).rejects.toThrow();
		await expect(async () => {
			await exe(`
			if false null else let a = 1
			<: a
			`);
		}).rejects.toThrow();
	});
});

describe('eval', () => {
	test.concurrent('returns value', async () => {
		const res = await exe(`
		let foo = eval {
			let a = 1
			let b = 2
			(a + b)
		}

		<: foo
		`);
		expect(res).toEqualValueOf(NUM(3));
	});
});

describe('match', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		<: match 2 {
			case 1 => "a"
			case 2 => "b"
			case 3 => "c"
		}
		`);
		expect(res).toEqualValueOf(STR('b'));
	});

	test.concurrent('When default not provided, returns null', async () => {
		const res = await exe(`
		<: match 42 {
			case 1 => "a"
			case 2 => "b"
			case 3 => "c"
		}
		`);
		expect(res).toEqualValueOf(NULL);
	});

	test.concurrent('With default', async () => {
		const res = await exe(`
		<: match 42 {
			case 1 => "a"
			case 2 => "b"
			case 3 => "c"
			default => "d"
		}
		`);
		expect(res).toEqualValueOf(STR('d'));
	});

	test.concurrent('With block', async () => {
		const res = await exe(`
		<: match 2 {
			case 1 => 1
			case 2 => {
				let a = 1
				let b = 2
				(a + b)
			}
			case 3 => 3
		}
		`);
		expect(res).toEqualValueOf(NUM(3));
	});

	test.concurrent('With return', async () => {
		const res = await exe(`
		@f(x) {
			match x {
				case 1 => {
					return "ai"
				}
			}
			"foo"
		}
		<: f(1)
		`);
		expect(res).toEqualValueOf(STR('ai'));
	});

	test.concurrent('scope', async () => {
		await expect(async () => {
			await exe(`
			match 1 { case 1 => let a = 1 }
			<: a
			`);
		}).rejects.toThrow();
		await expect(async () => {
			await exe(`
			match 1 { default => let a = 1 }
			<: a
			`);
		}).rejects.toThrow();
	});
});

describe('exists', () => {
	test.concurrent('Basic', async () => {
		const res = await exe(`
		let foo = null
		<: [(exists foo), (exists bar)]
		`);
		expect(res).toEqualValueOf(ARR([BOOL(true), BOOL(false)]));
	});
});

