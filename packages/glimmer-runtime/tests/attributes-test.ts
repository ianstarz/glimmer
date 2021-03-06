import { Simple, Template, RenderResult, readDOMAttr } from "glimmer-runtime";
import { TestEnvironment, TestDynamicScope, equalTokens } from "glimmer-test-helpers";
import { PathReference } from "glimmer-reference";
import { UpdatableReference } from "glimmer-object-reference";
import { Opaque } from "glimmer-util";

let root: Simple.Element;
let env: TestEnvironment;
let self: UpdatableReference<any>;
let result: RenderResult;

function compile(template: string) {
  return env.compile(template);
}

function rootElement() {
  return env.getDOM().createElement('div');
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = rootElement();
  root.setAttribute('debug-root', 'true');
}

function render<T>(template: Template<T>, context = {}, view: PathReference<Opaque> = null) {
  self = new UpdatableReference(context);
  result = template.render(self, root, new TestDynamicScope());
  assertInvariants(result);
  return result;
}

function assertInvariants(result, msg?) {
  strictEqual(result.firstNode(), root.firstChild, `The firstNode of the result is the same as the root's firstChild${msg ? ': ' + msg : ''}`);
  strictEqual(result.lastNode(), root.lastChild, `The lastNode of the result is the same as the root's lastChild${msg ? ': ' + msg : ''}`);
}

function rerender(context: any = null) {
  if (context !== null) self.update(context);
  env.begin();
  result.rerender();
  env.commit();
}

QUnit.module("Attributes", {
  setup: commonSetup
});

test("helpers shadow self", () => {
  env.registerHelper('foo', function() {
    return "hello";
  });

  let template = compile('<div data-test="{{foo}}"></div>');

  let context = { foo: 'bye' };
  render(template, context);

  equalTokens(root, '<div data-test="hello"></div>');

  rerender();

  equalTokens(root, '<div data-test="hello"></div>');

  rerender({ foo: 'bar' });

  equalTokens(root, '<div data-test="hello"></div>');

  rerender({ foo: 'bye' });

  equalTokens(root, '<div data-test="hello"></div>');
});

test("a[href] marks javascript: protocol as unsafe", () => {
  let template = compile('<a href="{{foo}}"></a>');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');

  rerender();

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');
});

test("a[href] marks javascript: protocol as unsafe, http as safe", () => {
  let template = compile('<a href="{{foo}}"></a>');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');

  rerender({ foo: 'http://foo.bar' });

  equalTokens(root, '<a href="http://foo.bar"></a>');

  rerender({ foo: 'javascript:foo()' });

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');
});

test("a[href] marks vbscript: protocol as unsafe", () => {
  let template = compile('<a href="{{foo}}"></a>');

  let context = { foo: 'vbscript:foo()' };
  render(template, context);

  equalTokens(root, '<a href="unsafe:vbscript:foo()"></a>');

  rerender();

  equalTokens(root, '<a href="unsafe:vbscript:foo()"></a>');
});

test("div[href] is not not marked as unsafe", () => {
  let template = compile('<div href="{{foo}}"></div>');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<div href="javascript:foo()"></div>');

  rerender();

  equalTokens(root, '<div href="javascript:foo()"></div>');
});

test("triple curlies in attribute position", assert => {

  let template = compile('<div data-bar="bar" data-foo={{{rawString}}}>Hello</div>');

  render(template, { rawString: 'TRIPLE' });

  equalTokens(root, '<div data-foo="TRIPLE" data-bar="bar">Hello</div>', "initial render");

  rerender({ rawString: 'DOUBLE' });

  equalTokens(root, '<div data-foo="DOUBLE" data-bar="bar">Hello</div>', "initial render");
});

test('can read attributes', assert => {
  let template = compile('<div data-bar="bar"></div>');

  render(template);

  assert.equal(readDOMAttr(root.firstChild as Element, 'data-bar'), 'bar');
});

test('can read attributes from namespace elements', assert => {
  let template = compile('<svg viewBox="0 0 0 0"></svg>');

  render(template);

  assert.equal(readDOMAttr(root.firstChild as Element, 'viewBox'), '0 0 0 0');
});

test('can read properties', assert => {
  let template = compile('<input value="gnargnar" />');

  render(template);

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'gnargnar');
});

test('handles null input values', assert => {
  let template = compile('<input value={{isNull}} />');

  render(template, { isNull: null });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ isNull: 'hey' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'hey');

  rerender({ isNull: null });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');
});

test('handles undefined input values', assert => {
  let template = compile('<input value={{isUndefined}} />');

  render(template, { isUndefined: undefined });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ isUndefined: 'hey' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'hey');

  rerender({ isUndefined: undefined });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');
});

test('handles undefined `toString` input values', assert => {
  let obj = Object.create(null);
  let template = compile('<input value={{obj}} />');

  render(template, { obj });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ obj: 'hello' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'hello');

  rerender({ obj });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');
});

test('handles empty string textarea values', assert => {
  let template = compile('<textarea value={{name}} />');

  render(template, { name: '' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ name: 'Alex' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'Alex');

  rerender({ name: '' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');
});
