// Copyright (C) 2020 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.timezone.prototype.getplaindatetimefor
includes: [compareArray.js]
---*/

const actual = [];
const expected = [
  "get timeZone.getOffsetNanosecondsFor",
  "call timeZone.getOffsetNanosecondsFor",
];

const instant = Temporal.Instant.from("1975-02-02T14:25:36.123456789Z");
const timeZone = new Proxy({
  getOffsetNanosecondsFor(instantArg) {
    actual.push("call timeZone.getOffsetNanosecondsFor");
    assert.sameValue(instantArg, instant);
    return 9876543210123;
  },
}, {
  has(target, property) {
    actual.push(`has timeZone.${property}`);
    return property in target;
  },
  get(target, property) {
    actual.push(`get timeZone.${property}`);
    return target[property];
  },
});

const result = Temporal.TimeZone.prototype.getPlainDateTimeFor.call(timeZone, instant);
assert.sameValue(result.year, 1975);
assert.sameValue(result.month, 2);
assert.sameValue(result.day, 2);
assert.sameValue(result.hour, 17);
assert.sameValue(result.minute, 10);
assert.sameValue(result.second, 12);
assert.sameValue(result.millisecond, 666);
assert.sameValue(result.microsecond, 666);
assert.sameValue(result.nanosecond, 912);
assert.sameValue(result.toString(), "1975-02-02T17:10:12.666666912");
assert.compareArray(actual, expected);
