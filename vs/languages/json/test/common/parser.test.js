define(["require", "exports", 'assert', 'vs/languages/json/common/parser/jsonParser'], function (require, exports, assert, Parser) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    suite('JSON - Parsing', function () {
        function isValid(json) {
            var parser = new Parser.JSONParser();
            var result = parser.parse(json);
            assert.equal(result.errors.length, 0);
        }
        function isInvalid(json) {
            var parser = new Parser.JSONParser();
            var result = parser.parse(json);
            assert.ok(result.errors.length > 0);
            // these should be caught by the parser, not the last-ditch guard
            assert.notEqual(result.errors[0].message, 'Invalid JSON');
        }
        test('Invalid body', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('*');
            assert.equal(result.errors.length, 1);
            isInvalid('{}[]');
        });
        test('Trailing Whitespace', function () {
            isValid('{}\n\n');
        });
        test('Objects', function () {
            isValid('{}');
            isValid('{"key": "value"}');
            isValid('{"key1": true, "key2": 3, "key3": [null], "key4": { "nested": {}}}');
            isInvalid('{');
            isInvalid('{3:3}');
            isInvalid('{\'key\': 3}');
            isInvalid('{"key" 3}');
            isInvalid('{"key":3 "key2": 4}');
            isInvalid('{"key":42, }');
            isInvalid('{"key:42');
        });
        test('Arrays', function () {
            isValid('[]');
            isValid('[1, 2]');
            isValid('[1, "string", false, {}, [null]]');
            isInvalid('[');
            isInvalid('[,]');
            isInvalid('[1 2]');
            isInvalid('[true false]');
            isInvalid('[1, ]');
            isInvalid('[[]');
            isInvalid('["something"');
            isInvalid('[magic]');
        });
        test('Strings', function () {
            isValid('["string"]');
            isValid('["\\"\\\\\\/\\b\\f\\n\\r\\t\\u1234\\u12AB"]');
            isValid('["\\\\"]');
            isInvalid('["');
            isInvalid('["]');
            isInvalid('["\\z"]');
            isInvalid('["\\u"]');
            isInvalid('["\\u123"]');
            isInvalid('["\\u123Z"]');
            isInvalid('[\'string\']');
        });
        test('Numbers', function () {
            isValid('[0, -1, 186.1, 0.123, -1.583e+4, 1.583E-4, 5e8]');
            isInvalid('[+1]');
            isInvalid('[01]');
            isInvalid('[1.]');
            isInvalid('[1.1+3]');
            isInvalid('[1.4e]');
            isInvalid('[-A]');
        });
        test('Simple AST', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('{}');
            assert.strictEqual(result.errors.length, 0);
            var node = result.getNodeFromOffset(1);
            assert.equal(node.type, 'object');
            assert.deepEqual(node.getNodeLocation().getSegments(), []);
            assert.strictEqual(result.getNodeFromOffset(2), null);
            result = parser.parse('[null]');
            assert.strictEqual(result.errors.length, 0);
            node = result.getNodeFromOffset(2);
            assert.equal(node.type, 'null');
            assert.deepEqual(node.getNodeLocation().getSegments(), ['0']);
            result = parser.parse('{"a":true}');
            assert.strictEqual(result.errors.length, 0);
            node = result.getNodeFromOffset(3);
            assert.equal(node.type, 'string');
            assert.equal(node.isKey, true);
            assert.deepEqual(node.getNodeLocation().getSegments(), ['a']);
            node = result.getNodeFromOffset(4);
            assert.equal(node.type, 'property');
            node = result.getNodeFromOffset(0);
            assert.equal(node.type, 'object');
            node = result.getNodeFromOffset(10);
            assert.equal(node, null);
            node = result.getNodeFromOffset(5);
            assert.equal(node.type, 'boolean');
            assert.deepEqual(node.getNodeLocation().getSegments(), ['a']);
        });
        test('Nested AST', function () {
            var parser = new Parser.JSONParser();
            var content = '{\n\t"key" : {\n\t"key2": 42\n\t}\n}';
            var result = parser.parse(content);
            assert.strictEqual(result.errors.length, 0);
            var node = result.getNodeFromOffset(content.indexOf('key2') + 2);
            var location = node.getNodeLocation();
            assert.deepEqual(location.getSegments(), ['key', 'key2']);
            node = result.getNodeFromOffset(content.indexOf('42') + 1);
            location = node.getNodeLocation();
            assert.deepEqual(location.getSegments(), ['key', 'key2']);
        });
        test('Nested AST in Array', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('{"key":[{"key2":42}]}');
            assert.strictEqual(result.errors.length, 0);
            var node = result.getNodeFromOffset(17);
            var location = node.getNodeLocation();
            assert.deepEqual(location.getSegments(), ['key', '0', 'key2']);
        });
        test('Multiline', function () {
            var parser = new Parser.JSONParser();
            var content = '{\n\t\n}';
            var result = parser.parse(content);
            assert.strictEqual(result.errors.length, 0);
            var node = result.getNodeFromOffset(content.indexOf('\t') + 1);
            assert.notEqual(node, null);
            content = '{\n"first":true\n\n}';
            result = parser.parse(content);
            node = result.getNodeFromOffset(content.length - 2);
            assert.equal(node.type, 'object');
            node = result.getNodeFromOffset(content.length - 4);
            assert.equal(node.type, 'boolean');
        });
        test('Expand errors to entire tokens', function () {
            var parser = new Parser.JSONParser();
            var content = '{\n"key":32,\nerror\n}';
            var result = parser.parse(content);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].location.start, content.indexOf('error'));
            assert.equal(result.errors[0].location.end, content.indexOf('error') + 5);
        });
        test('Getting keys out of an object', function () {
            var parser = new Parser.JSONParser();
            var content = '{\n"key":32,\n\n"key2":45}';
            var result = parser.parse(content);
            assert.equal(result.errors.length, 0);
            var node = result.getNodeFromOffset(content.indexOf('32,\n') + 4);
            assert.equal(node.type, 'object');
            var keyList = node.getKeyList();
            assert.deepEqual(keyList, ['key', 'key2']);
        });
        test('Validate types', function () {
            var parser = new Parser.JSONParser();
            var str = '{"number": 3.4, "integer": 42, "string": "some string", "boolean":true, "null":null, "object":{}, "array":[1, 2]}';
            var result = parser.parse(str);
            assert.strictEqual(result.errors.length, 0);
            result.validate({
                type: 'object'
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse(str);
            result.validate({
                type: 'array'
            });
            assert.strictEqual(result.warnings.length, 1);
            result = parser.parse(str);
            result.validate({
                type: 'object',
                properties: {
                    "number": {
                        type: 'number'
                    },
                    "integer": {
                        type: 'integer'
                    },
                    "string": {
                        type: 'string'
                    },
                    "boolean": {
                        type: 'boolean'
                    },
                    "null": {
                        type: 'null'
                    },
                    "object": {
                        type: 'object'
                    },
                    "array": {
                        type: 'array'
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse(str);
            result.validate({
                type: 'object',
                properties: {
                    "number": {
                        type: 'array'
                    },
                    "integer": {
                        type: 'string'
                    },
                    "string": {
                        type: 'object'
                    },
                    "boolean": {
                        type: 'null'
                    },
                    "null": {
                        type: 'integer'
                    },
                    "object": {
                        type: 'boolean'
                    },
                    "array": {
                        type: 'number'
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 7);
            result = parser.parse(str);
            result.validate({
                type: 'object',
                properties: {
                    "number": {
                        type: 'integer'
                    },
                }
            });
            assert.strictEqual(result.warnings.length, 1);
            result = parser.parse(str);
            result.validate({
                type: 'object',
                properties: {
                    "integer": {
                        type: 'number'
                    },
                }
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse(str);
            result.validate({
                type: 'object',
                properties: {
                    "array": {
                        type: 'array',
                        items: {
                            type: 'integer'
                        }
                    },
                }
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse(str);
            result.validate({
                type: 'object',
                properties: {
                    "array": {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                }
            });
            assert.strictEqual(result.warnings.length, 2);
        });
        test('Required properties', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('{"integer": 42, "string": "some string", "boolean":true}');
            assert.strictEqual(result.errors.length, 0);
            result.validate({
                type: 'object',
                required: ['string']
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse('{"integer": 42, "string": "some string", "boolean":true}');
            result.validate({
                type: 'object',
                required: ['notpresent']
            });
            assert.strictEqual(result.warnings.length, 1);
        });
        test('Arrays', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('[1, 2, 3]');
            assert.strictEqual(result.errors.length, 0);
            result.validate({
                type: 'array',
                items: {
                    type: 'number'
                },
                minItems: 1,
                maxItems: 5
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse('[1, 2, 3]');
            result.validate({
                type: 'array',
                items: {
                    type: 'number'
                },
                minItems: 10
            });
            assert.strictEqual(result.warnings.length, 1);
            result = parser.parse('[1, 2, 3]');
            result.validate({
                type: 'array',
                items: {
                    type: 'number'
                },
                maxItems: 2
            });
            assert.strictEqual(result.warnings.length, 1);
        });
        test('Strings', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('{"one":"test"}');
            assert.strictEqual(result.errors.length, 0);
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'string',
                        minLength: 1,
                        maxLength: 10
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse('{"one":"test"}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'string',
                        minLength: 10,
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 1);
            result = parser.parse('{"one":"test"}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'string',
                        maxLength: 3,
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 1);
            result = parser.parse('{"one":"test"}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'string',
                        pattern: '^test$'
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse('{"one":"test"}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'string',
                        pattern: 'fail'
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 1);
        });
        test('Numbers', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('{"one": 13.45e+1}');
            assert.strictEqual(result.errors.length, 0);
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'number',
                        minimum: 1,
                        maximum: 135
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 0);
            result = parser.parse('{"one": 13.45e+1}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'number',
                        minimum: 200,
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 1, 'below minimum');
            result = parser.parse('{"one": 13.45e+1}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'number',
                        maximum: 130,
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 1, 'above maximum');
            result = parser.parse('{"one": 13.45e+1}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'number',
                        minimum: 134.5,
                        exclusiveMinimum: true
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 1, 'at exclusive mininum');
            result = parser.parse('{"one": 13.45e+1}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'number',
                        maximum: 134.5,
                        exclusiveMaximum: true
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 1, 'at exclusive maximum');
            result = parser.parse('{"one": 13.45e+1}');
            result.validate({
                type: 'object',
                properties: {
                    "one": {
                        type: 'number',
                        minimum: 134.5,
                        maximum: 134.5
                    }
                }
            });
            assert.strictEqual(result.warnings.length, 0, 'equal to min and max');
        });
        test('getNodeFromOffset', function () {
            var parser = new Parser.JSONParser();
            var content = '{"a": 1,\n\n"d": 2}';
            var doc = parser.parse(content);
            assert.strictEqual(doc.errors.length, 0);
            var node = doc.getNodeFromOffset(content.indexOf(': 2') + 1);
            assert.strictEqual(node.type, 'property');
        });
        test('Duplicate keys', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"a": 1, "a": 2}');
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1, 'Keys should not be the same');
            var doc = parser.parse('{"a": { "a": 2, "a": 3}}');
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1, 'Keys should not be the same');
            var doc = parser.parse('[{ "a": 2, "a": 3}]');
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1, 'Keys should not be the same');
        });
        test('allOf', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop1": 42, "prop2": true}');
            var schema = {
                id: 'main',
                allOf: [
                    {
                        type: 'object'
                    },
                    {
                        properties: {
                            'prop1': {
                                type: 'number'
                            }
                        }
                    },
                    {
                        properties: {
                            'prop2': {
                                type: 'boolean'
                            }
                        }
                    }
                ]
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop1": 42, "prop2": 123}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('anyOf', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop1": 42, "prop2": true}');
            var schema = {
                id: 'main',
                anyOf: [
                    {
                        properties: {
                            'prop1': {
                                type: 'number'
                            }
                        }
                    },
                    {
                        properties: {
                            'prop2': {
                                type: 'boolean'
                            }
                        }
                    }
                ]
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop1": 42, "prop2": 123}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop1": "a string", "prop2": 123}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('oneOf', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop1": 42, "prop2": true}');
            var schema = {
                id: 'main',
                oneOf: [
                    {
                        properties: {
                            'prop1': {
                                type: 'number'
                            }
                        }
                    },
                    {
                        properties: {
                            'prop2': {
                                type: 'boolean'
                            }
                        }
                    }
                ]
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
            doc = parser.parse('{"prop1": 42, "prop2": 123}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop1": "a string", "prop2": 123}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('not', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop1": 42, "prop2": true}');
            var schema = {
                id: 'main',
                not: {
                    properties: {
                        'prop1': {
                            type: 'number'
                        }
                    }
                }
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
            doc = parser.parse('{"prop1": "test"}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
        });
        test('minProperties', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop1": 42, "prop2": true}');
            var schema = {
                minProperties: 2
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            schema.minProperties = 1;
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            schema.minProperties = 3;
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('maxProperties', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop1": 42, "prop2": true}');
            var schema = {
                maxProperties: 2
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            schema.maxProperties = 3;
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            schema.maxProperties = 1;
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('patternProperties', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop1": 42, "prop2": 42}');
            var schema = {
                id: 'main',
                patternProperties: {
                    '^prop\\d$': {
                        type: 'number'
                    }
                }
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop1": 42, "prop2": true}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
            doc = parser.parse('{"prop1": 42, "prop2": 123, "aprop3": true}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
        });
        test('additionalProperties', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop1": 42, "prop2": 42}');
            var schema = {
                additionalProperties: {
                    type: 'number'
                }
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop1": 42, "prop2": true}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
            schema = {
                properties: {
                    "prop1": {
                        type: 'boolean'
                    }
                },
                additionalProperties: {
                    type: 'number'
                }
            };
            doc = parser.parse('{"prop1": true, "prop2": 42}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            schema = {
                properties: {
                    "prop1": {
                        type: 'boolean'
                    }
                },
                additionalProperties: false
            };
            doc = parser.parse('{"prop1": true, "prop2": 42}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
            doc = parser.parse('{"prop1": true}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
        });
        //only support enums for string and number values
        test('enum', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop": "harmonica"}');
            var schema = {
                properties: {
                    'prop': {
                        enum: ['violin', 'harmonica', 'banjo']
                    }
                }
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop": "harp"}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
            schema = {
                properties: {
                    'prop': {
                        enum: [1, 42, 999]
                    }
                }
            };
            doc = parser.parse('{"prop": 42}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop": 1337}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('uniqueItems', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('[1, 2, 3]');
            var schema = {
                type: 'array',
                uniqueItems: true
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('[1, 2, 3, 2]');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
            doc = parser.parse('[1, 2, "string", 52, "string"]');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('items as array', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('[1, true, "string"]');
            var schema = {
                type: 'array',
                items: [
                    {
                        type: 'integer'
                    },
                    {
                        type: 'boolean'
                    },
                    {
                        type: 'string'
                    }
                ]
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('["string", 1, true]');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 3);
            doc = parser.parse('[1, true, "string", "another", 42]');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
        });
        test('additionalItems', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('[1, true, "string"]');
            var schema = {
                type: 'array',
                items: [
                    {
                        type: 'integer'
                    },
                    {
                        type: 'boolean'
                    },
                    {
                        type: 'string'
                    }
                ],
                additionalItems: false
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('[1, true, "string", 42]');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('multipleOf', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('[42]');
            var schema = {
                type: 'array',
                items: {
                    type: 'integer',
                    multipleOf: 2
                }
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('[43]');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('dependencies with array', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"a":true, "b":42}');
            var schema = {
                type: 'object',
                properties: {
                    a: {
                        type: 'boolean'
                    }
                },
                dependencies: {
                    a: ['b']
                }
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"a":true}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('dependencies with schema', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"a":true, "b":42}');
            var schema = {
                type: 'object',
                properties: {
                    a: {
                        type: 'boolean'
                    }
                },
                dependencies: {
                    a: {
                        properties: {
                            b: {
                                type: 'integer'
                            }
                        }
                    }
                }
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"a":true}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"a":true, "b": "string"}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('type as array', function () {
            var parser = new Parser.JSONParser();
            var doc = parser.parse('{"prop": 42}');
            var schema = {
                type: 'object',
                properties: {
                    'prop': {
                        type: ['number', 'string']
                    }
                }
            };
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop": "string"}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 0);
            doc = parser.parse('{"prop": true}');
            doc.validate(schema);
            assert.strictEqual(doc.errors.length, 0);
            assert.strictEqual(doc.warnings.length, 1);
        });
        test('Strings with spaces', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('{"key1":"first string", "key2":["second string"]}');
            assert.strictEqual(result.errors.length, 0);
            var node = result.getNodeFromOffset(9);
            assert.strictEqual(node.getValue(), 'first string');
            node = result.getNodeFromOffset(34);
            assert.strictEqual(node.getValue(), 'second string');
        });
        test('Schema information on node', function () {
            var parser = new Parser.JSONParser();
            var result = parser.parse('{"key":42}');
            assert.strictEqual(result.errors.length, 0);
            var schema = {
                type: 'object',
                properties: {
                    'key': {
                        oneOf: [{
                                type: 'number',
                                description: 'this is a number'
                            }, {
                                type: 'string',
                                description: 'this is a string'
                            }]
                    }
                }
            };
            var matchingSchemas = [];
            result.validate(schema, matchingSchemas);
            var node = result.getNodeFromOffset(7);
            assert.strictEqual(node.type, 'number');
            assert.strictEqual(node.getValue(), 42);
            var schemas = matchingSchemas.filter(function (s) { return s.node === node && !s.inverted; }).map(function (s) { return s.schema; });
            assert.ok(Array.isArray(schemas));
            // 0 is the most specific schema,
            // 1 is the schema that contained the "oneOf" clause,
            assert.strictEqual(schemas.length, 2);
            assert.strictEqual(schemas[0].description, 'this is a number');
        });
        test('parse with comments', function () {
            function parse(v) {
                var p = new Parser.JSONParser();
                var result = p.parse(v);
                assert.equal(result.errors.length, 0);
                return result.root.getValue();
            }
            var value = parse('// comment\n{\n"far": "boo"\n}');
            assert.equal(value.far, 'boo');
            var value = parse('/* comm\nent\nent */\n{\n"far": "boo"\n}');
            assert.equal(value.far, 'boo');
            var value = parse('{\n"far": "boo"\n}');
            assert.equal(value.far, 'boo');
        });
    });
});
//# sourceMappingURL=parser.test.js.map