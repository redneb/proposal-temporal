// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plaindatetime
includes: [compareArray.js]
---*/

const expected = [
  "valueOf year",
  "valueOf month",
];
const actual = [];
const args = [
  { valueOf() { actual.push("valueOf year"); return 1; } },
  { valueOf() { actual.push("valueOf month"); return 1; } },
];

assert.throws(RangeError, () => new Temporal.PlainDateTime(...args));
assert.compareArray(actual, expected, "order of operations");
