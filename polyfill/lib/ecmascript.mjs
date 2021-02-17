const ArrayIsArray = Array.isArray;
const ArrayPrototypeIndexOf = Array.prototype.indexOf;
const ArrayPrototypePush = Array.prototype.push;
const IntlDateTimeFormat = globalThis.Intl.DateTimeFormat;
const MathMin = Math.min;
const MathMax = Math.max;
const MathAbs = Math.abs;
const MathFloor = Math.floor;
const MathSign = Math.sign;
const MathTrunc = Math.trunc;
const NumberIsNaN = Number.isNaN;
const NumberIsFinite = Number.isFinite;
const NumberMaxSafeInteger = Number.MAX_SAFE_INTEGER;
const NumberIsInteger = Number.isInteger;
const ObjectAssign = Object.assign;
const ObjectCreate = Object.create;
const ObjectIs = Object.is;
const ObjectEntries = Object.entries;

import bigInt from 'big-integer';
import Call from 'es-abstract/2020/Call.js';
import SpeciesConstructor from 'es-abstract/2020/SpeciesConstructor.js';
import IsInteger from 'es-abstract/2020/IsInteger.js';
import ToInteger from 'es-abstract/2020/ToInteger.js';
import ToLength from 'es-abstract/2020/ToLength.js';
import ToNumber from 'es-abstract/2020/ToNumber.js';
import ToPrimitive from 'es-abstract/2020/ToPrimitive.js';
import ToString from 'es-abstract/2020/ToString.js';
import Type from 'es-abstract/2020/Type.js';

import { GetIntrinsic } from './intrinsicclass.mjs';
import {
  GetSlot,
  HasSlot,
  EPOCHNANOSECONDS,
  TIMEZONE_ID,
  CALENDAR_ID,
  INSTANT,
  ISO_YEAR,
  ISO_MONTH,
  ISO_DAY,
  ISO_HOUR,
  ISO_MINUTE,
  ISO_SECOND,
  ISO_MILLISECOND,
  ISO_MICROSECOND,
  ISO_NANOSECOND,
  DATE_BRAND,
  YEAR_MONTH_BRAND,
  MONTH_DAY_BRAND,
  TIME_ZONE,
  CALENDAR,
  YEARS,
  MONTHS,
  WEEKS,
  DAYS,
  HOURS,
  MINUTES,
  SECONDS,
  MILLISECONDS,
  MICROSECONDS,
  NANOSECONDS
} from './slots.mjs';

const DAYMILLIS = 86400000;
const NS_MIN = bigInt(-86400).multiply(1e17);
const NS_MAX = bigInt(86400).multiply(1e17);
const YEAR_MIN = -271821;
const YEAR_MAX = 275760;
const BEFORE_FIRST_DST = bigInt(-388152).multiply(1e13); // 1847-01-01T00:00:00Z

const ToPositiveInteger = (value, property) => {
  value = ToInteger(value);
  if (value < 1) {
    if (property !== undefined) {
      throw new RangeError(`property '${property}' cannot be a a number less than one`);
    }
    throw new RangeError('Cannot convert a number less than one to a positive integer');
  }
  return value;
};

const BUILTIN_CASTS = new Map([
  ['year', ToInteger],
  ['month', ToPositiveInteger],
  ['monthCode', ToString],
  ['day', ToPositiveInteger],
  ['hour', ToInteger],
  ['minute', ToInteger],
  ['second', ToInteger],
  ['millisecond', ToInteger],
  ['microsecond', ToInteger],
  ['nanosecond', ToInteger],
  ['years', ToInteger],
  ['months', ToInteger],
  ['weeks', ToInteger],
  ['days', ToInteger],
  ['hours', ToInteger],
  ['minutes', ToInteger],
  ['seconds', ToInteger],
  ['milliseconds', ToInteger],
  ['microseconds', ToInteger],
  ['nanoseconds', ToInteger],
  ['era', ToString],
  ['eraYear', ToInteger],
  ['offset', ToString]
]);

import * as PARSE from './regex.mjs';

const ES2020 = {
  Call,
  SpeciesConstructor,
  IsInteger,
  ToInteger,
  ToLength,
  ToNumber,
  ToPrimitive,
  ToString,
  Type
};

export const ES = ObjectAssign({}, ES2020, {
  ToPositiveInteger: ToPositiveInteger,
  IsTemporalInstant: (item) => HasSlot(item, EPOCHNANOSECONDS) && !HasSlot(item, TIME_ZONE, CALENDAR),
  IsTemporalTimeZone: (item) => HasSlot(item, TIMEZONE_ID),
  IsTemporalCalendar: (item) => HasSlot(item, CALENDAR_ID),
  IsTemporalDuration: (item) =>
    HasSlot(item, YEARS, MONTHS, DAYS, HOURS, MINUTES, SECONDS, MILLISECONDS, MICROSECONDS, NANOSECONDS),
  IsTemporalDate: (item) => HasSlot(item, DATE_BRAND),
  IsTemporalTime: (item) =>
    HasSlot(item, ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND) &&
    !HasSlot(item, ISO_YEAR, ISO_MONTH, ISO_DAY),
  IsTemporalDateTime: (item) =>
    HasSlot(
      item,
      ISO_YEAR,
      ISO_MONTH,
      ISO_DAY,
      ISO_HOUR,
      ISO_MINUTE,
      ISO_SECOND,
      ISO_MILLISECOND,
      ISO_MICROSECOND,
      ISO_NANOSECOND
    ),
  IsTemporalYearMonth: (item) => HasSlot(item, YEAR_MONTH_BRAND),
  IsTemporalMonthDay: (item) => HasSlot(item, MONTH_DAY_BRAND),
  IsTemporalZonedDateTime: (item) => HasSlot(item, EPOCHNANOSECONDS, TIME_ZONE, CALENDAR),
  TemporalTimeZoneFromString: (stringIdent) => {
    let { ianaName, offset, z } = ES.ParseTemporalTimeZoneString(stringIdent);
    if (z) ianaName = 'UTC';
    const result = ES.GetCanonicalTimeZoneIdentifier(ianaName || offset);
    if (offset && ianaName && ianaName !== offset) {
      const ns = ES.ParseTemporalInstant(stringIdent);
      const offsetNs = ES.GetIANATimeZoneOffsetNanoseconds(ns, result);
      if (ES.FormatTimeZoneOffsetString(offsetNs) !== offset) {
        throw new RangeError(`invalid offset ${offset}[${ianaName}]`);
      }
    }
    return result;
  },
  FormatCalendarAnnotation: (id, showCalendar) => {
    if (showCalendar === 'never') return '';
    if (showCalendar === 'auto' && id === 'iso8601') return '';
    return `[u-ca-${id}]`;
  },
  ParseISODateTime: (isoString, { zoneRequired }) => {
    const regex = zoneRequired ? PARSE.instant : PARSE.datetime;
    const match = regex.exec(isoString);
    if (!match) throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
    let yearString = match[1];
    if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
    const year = ES.ToInteger(yearString);
    const month = ES.ToInteger(match[2] || match[4]);
    const day = ES.ToInteger(match[3] || match[5]);
    const hour = ES.ToInteger(match[6]);
    const minute = ES.ToInteger(match[7] || match[10]);
    let second = ES.ToInteger(match[8] || match[11]);
    if (second === 60) second = 59;
    const fraction = (match[9] || match[12]) + '000000000';
    const millisecond = ES.ToInteger(fraction.slice(0, 3));
    const microsecond = ES.ToInteger(fraction.slice(3, 6));
    const nanosecond = ES.ToInteger(fraction.slice(6, 9));
    let offset, z;
    if (match[13]) {
      offset = '+00:00';
      z = 'Z';
    } else if (match[14] && match[15]) {
      const offsetSign = match[14] === '-' || match[14] === '\u2212' ? '-' : '+';
      const offsetHours = match[15] || '00';
      const offsetMinutes = match[16] || '00';
      const offsetSeconds = match[17] || '00';
      let offsetFraction = match[18] || '0';
      offset = `${offsetSign}${offsetHours}:${offsetMinutes}`;
      if (+offsetFraction) {
        while (offsetFraction.endsWith('0')) offsetFraction = offsetFraction.slice(0, -1);
        offset += `:${offsetSeconds}.${offsetFraction}`;
      } else if (+offsetSeconds) {
        offset += `:${offsetSeconds}`;
      }
      if (offset === '-00:00') offset = '+00:00';
    }
    let ianaName = match[19];
    if (ianaName) {
      try {
        // Canonicalize name if it is an IANA link name or is capitalized wrong
        ianaName = ES.GetCanonicalTimeZoneIdentifier(ianaName).toString();
      } catch {
        // Not an IANA name, may be a custom ID, pass through unchanged
      }
    }
    const calendar = match[20];
    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      ianaName,
      offset,
      z,
      calendar
    };
  },
  ParseTemporalInstantString: (isoString) => {
    return ES.ParseISODateTime(isoString, { zoneRequired: true });
  },
  ParseTemporalZonedDateTimeString: (isoString) => {
    return ES.ParseISODateTime(isoString, { zoneRequired: true });
  },
  ParseTemporalDateTimeString: (isoString) => {
    return ES.ParseISODateTime(isoString, { zoneRequired: false });
  },
  ParseTemporalDateString: (isoString) => {
    return ES.ParseISODateTime(isoString, { zoneRequired: false });
  },
  ParseTemporalTimeString: (isoString) => {
    const match = PARSE.time.exec(isoString);
    let hour, minute, second, millisecond, microsecond, nanosecond, calendar;
    if (match) {
      hour = ES.ToInteger(match[1]);
      minute = ES.ToInteger(match[2] || match[5]);
      second = ES.ToInteger(match[3] || match[6]);
      if (second === 60) second = 59;
      const fraction = (match[4] || match[7]) + '000000000';
      millisecond = ES.ToInteger(fraction.slice(0, 3));
      microsecond = ES.ToInteger(fraction.slice(3, 6));
      nanosecond = ES.ToInteger(fraction.slice(6, 9));
      calendar = match[15];
    } else {
      ({ hour, minute, second, millisecond, microsecond, nanosecond, calendar } = ES.ParseISODateTime(isoString, {
        zoneRequired: false
      }));
    }
    return { hour, minute, second, millisecond, microsecond, nanosecond, calendar };
  },
  ParseTemporalYearMonthString: (isoString) => {
    const match = PARSE.yearmonth.exec(isoString);
    let year, month, calendar, referenceISODay;
    if (match) {
      let yearString = match[1];
      if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
      year = ES.ToInteger(yearString);
      month = ES.ToInteger(match[2]);
      calendar = match[3];
    } else {
      ({ year, month, calendar, day: referenceISODay } = ES.ParseISODateTime(isoString, { zoneRequired: false }));
    }
    return { year, month, calendar, referenceISODay };
  },
  ParseTemporalMonthDayString: (isoString) => {
    const match = PARSE.monthday.exec(isoString);
    let month, day, calendar, referenceISOYear;
    if (match) {
      month = ES.ToInteger(match[1]);
      day = ES.ToInteger(match[2]);
    } else {
      ({ month, day, calendar, year: referenceISOYear } = ES.ParseISODateTime(isoString, { zoneRequired: false }));
    }
    return { month, day, calendar, referenceISOYear };
  },
  ParseTemporalTimeZoneString: (stringIdent) => {
    try {
      let canonicalIdent = ES.GetCanonicalTimeZoneIdentifier(stringIdent);
      if (canonicalIdent) {
        canonicalIdent = canonicalIdent.toString();
        if (ES.ParseOffsetString(canonicalIdent) !== null) return { offset: canonicalIdent };
        return { ianaName: canonicalIdent };
      }
    } catch {
      // fall through
    }
    try {
      // Try parsing ISO string instead
      return ES.ParseISODateTime(stringIdent, { zoneRequired: true });
    } catch {
      throw new RangeError(`Invalid time zone: ${stringIdent}`);
    }
  },
  ParseTemporalDurationString: (isoString) => {
    const match = PARSE.duration.exec(isoString);
    if (!match) throw new RangeError(`invalid duration: ${isoString}`);
    if (match.slice(2).every((element) => element === undefined)) {
      throw new RangeError(`invalid duration: ${isoString}`);
    }
    const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : 1;
    const years = ES.ToInteger(match[2]) * sign;
    const months = ES.ToInteger(match[3]) * sign;
    const weeks = ES.ToInteger(match[4]) * sign;
    const days = ES.ToInteger(match[5]) * sign;
    const hours = ES.ToInteger(match[6]) * sign;
    let fHours = match[7];
    let minutes = ES.ToInteger(match[8]) * sign;
    let fMinutes = match[9];
    let seconds = ES.ToInteger(match[10]) * sign;
    let fSeconds = match[11] + '000000000';
    let milliseconds = ES.ToInteger(fSeconds.slice(0, 3)) * sign;
    let microseconds = ES.ToInteger(fSeconds.slice(3, 6)) * sign;
    let nanoseconds = ES.ToInteger(fSeconds.slice(6, 9)) * sign;

    fHours = fHours ? (sign * ES.ToInteger(fHours)) / 10 ** fHours.length : 0;
    fMinutes = fMinutes ? (sign * ES.ToInteger(fMinutes)) / 10 ** fMinutes.length : 0;

    ({ minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.DurationHandleFractions(
      fHours,
      minutes,
      fMinutes,
      seconds,
      0,
      milliseconds,
      0,
      microseconds,
      0,
      nanoseconds,
      0
    ));
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  ParseTemporalInstant: (isoString) => {
    const {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      offset
    } = ES.ParseTemporalInstantString(isoString);

    const epochNs = ES.GetEpochFromParts(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
    if (epochNs === null) throw new RangeError('DateTime outside of supported range');
    if (!offset) throw new RangeError('Temporal.Instant requires a time zone offset');
    const offsetNs = ES.ParseOffsetString(offset);
    return epochNs.subtract(offsetNs);
  },
  RegulateDateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, overflow) => {
    switch (overflow) {
      case 'reject':
        ES.RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
        break;
      case 'constrain':
        ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainDateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        ));
        break;
    }
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  RegulateDate: (year, month, day, overflow) => {
    switch (overflow) {
      case 'reject':
        ES.RejectDate(year, month, day);
        break;
      case 'constrain':
        ({ year, month, day } = ES.ConstrainDate(year, month, day));
        break;
    }
    return { year, month, day };
  },
  RegulateTime: (hour, minute, second, millisecond, microsecond, nanosecond, overflow) => {
    switch (overflow) {
      case 'reject':
        ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
        break;
      case 'constrain':
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        ));
        break;
    }
    return { hour, minute, second, millisecond, microsecond, nanosecond };
  },
  RegulateYearMonth: (year, month, overflow) => {
    const referenceISODay = 1;
    switch (overflow) {
      case 'reject':
        ES.RejectDate(year, month, referenceISODay);
        break;
      case 'constrain':
        ({ year, month } = ES.ConstrainDate(year, month));
        break;
    }
    return { year, month };
  },
  RegulateMonthDay: (month, day, overflow) => {
    const referenceISOYear = 1972;
    switch (overflow) {
      case 'reject':
        ES.RejectDate(referenceISOYear, month, day);
        break;
      case 'constrain':
        ({ month, day } = ES.ConstrainDate(referenceISOYear, month, day));
        break;
    }
    return { month, day };
  },
  DurationHandleFractions: (
    fHours,
    minutes,
    fMinutes,
    seconds,
    fSeconds,
    milliseconds,
    fMilliseconds,
    microseconds,
    fMicroseconds,
    nanoseconds,
    fNanoseconds
  ) => {
    if (fHours !== 0) {
      [
        minutes,
        fMinutes,
        seconds,
        fSeconds,
        milliseconds,
        fMilliseconds,
        microseconds,
        fMicroseconds,
        nanoseconds,
        fNanoseconds
      ].forEach((val) => {
        if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
      });
      let mins = fHours * 60;
      minutes = MathTrunc(mins);
      fMinutes = mins % 1;
    }

    if (fMinutes !== 0) {
      [seconds, fSeconds, milliseconds, fMilliseconds, microseconds, fMicroseconds, nanoseconds, fNanoseconds].forEach(
        (val) => {
          if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
        }
      );
      let secs = fMinutes * 60;
      seconds = MathTrunc(secs);
      fSeconds = secs % 1;
    }

    if (fSeconds !== 0) {
      [milliseconds, fMilliseconds, microseconds, fMicroseconds, nanoseconds, fNanoseconds].forEach((val) => {
        if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
      });
      let mils = fSeconds * 1000;
      milliseconds = MathTrunc(mils);
      fMilliseconds = mils % 1;
    }

    if (fMilliseconds !== 0) {
      [microseconds, fMicroseconds, nanoseconds, fNanoseconds].forEach((val) => {
        if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
      });
      let mics = fMilliseconds * 1000;
      microseconds = MathTrunc(mics);
      fMicroseconds = mics % 1;
    }

    if (fMicroseconds !== 0) {
      [nanoseconds, fNanoseconds].forEach((val) => {
        if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
      });
      let nans = fMicroseconds * 1000;
      nanoseconds = MathTrunc(nans);
    }

    return { minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  ToTemporalDurationRecord: (item) => {
    if (ES.IsTemporalDuration(item)) {
      return {
        years: GetSlot(item, YEARS),
        months: GetSlot(item, MONTHS),
        weeks: GetSlot(item, WEEKS),
        days: GetSlot(item, DAYS),
        hours: GetSlot(item, HOURS),
        minutes: GetSlot(item, MINUTES),
        seconds: GetSlot(item, SECONDS),
        milliseconds: GetSlot(item, MILLISECONDS),
        microseconds: GetSlot(item, MICROSECONDS),
        nanoseconds: GetSlot(item, NANOSECONDS)
      };
    }
    const props = ES.ToPartialRecord(
      item,
      [
        'days',
        'hours',
        'microseconds',
        'milliseconds',
        'minutes',
        'months',
        'nanoseconds',
        'seconds',
        'weeks',
        'years'
      ],
      (v) => {
        v = ES.ToNumber(v);
        if (MathFloor(v) !== v) {
          throw new RangeError(`unsupported fractional value ${v}`);
        }
        return v;
      }
    );
    if (!props) throw new TypeError('invalid duration-like');
    let {
      years = 0,
      months = 0,
      weeks = 0,
      days = 0,
      hours = 0,
      minutes = 0,
      seconds = 0,
      milliseconds = 0,
      microseconds = 0,
      nanoseconds = 0
    } = props;
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  ToLimitedTemporalDuration: (item, disallowedProperties = []) => {
    let record;
    if (ES.Type(item) === 'Object') {
      record = ES.ToTemporalDurationRecord(item);
    } else {
      const str = ES.ToString(item);
      record = ES.ParseTemporalDurationString(str);
    }
    const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = record;
    ES.RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    for (const property of disallowedProperties) {
      if (record[property] !== 0) {
        throw new RangeError(
          `Duration field ${property} not supported by Temporal.Instant. Try Temporal.ZonedDateTime instead.`
        );
      }
    }
    return record;
  },
  ToTemporalDurationOverflow: (options) => {
    return ES.GetOption(options, 'overflow', ['constrain', 'balance'], 'constrain');
  },
  ToTemporalOverflow: (options) => {
    return ES.GetOption(options, 'overflow', ['constrain', 'reject'], 'constrain');
  },
  ToTemporalDisambiguation: (options) => {
    return ES.GetOption(options, 'disambiguation', ['compatible', 'earlier', 'later', 'reject'], 'compatible');
  },
  ToTemporalRoundingMode: (options, fallback) => {
    return ES.GetOption(options, 'roundingMode', ['ceil', 'floor', 'trunc', 'nearest'], fallback);
  },
  NegateTemporalRoundingMode: (roundingMode) => {
    switch (roundingMode) {
      case 'ceil':
        return 'floor';
      case 'floor':
        return 'ceil';
      default:
        return roundingMode;
    }
  },
  ToTemporalOffset: (options, fallback) => {
    return ES.GetOption(options, 'offset', ['prefer', 'use', 'ignore', 'reject'], fallback);
  },
  ToShowCalendarOption: (options) => {
    return ES.GetOption(options, 'calendarName', ['auto', 'always', 'never'], 'auto');
  },
  ToShowTimeZoneNameOption: (options) => {
    return ES.GetOption(options, 'timeZoneName', ['auto', 'never'], 'auto');
  },
  ToShowOffsetOption: (options) => {
    return ES.GetOption(options, 'offset', ['auto', 'never'], 'auto');
  },
  ToTemporalRoundingIncrement: (options, dividend, inclusive) => {
    let maximum = Infinity;
    if (dividend !== undefined) maximum = dividend;
    if (!inclusive && dividend !== undefined) maximum = dividend > 1 ? dividend - 1 : 1;
    const increment = ES.GetNumberOption(options, 'roundingIncrement', 1, maximum, 1);
    if (dividend !== undefined && dividend % increment !== 0) {
      throw new RangeError(`Rounding increment must divide evenly into ${dividend}`);
    }
    return increment;
  },
  ToTemporalDateTimeRoundingIncrement: (options, smallestUnit) => {
    const maximumIncrements = {
      years: undefined,
      months: undefined,
      weeks: undefined,
      days: undefined,
      hours: 24,
      minutes: 60,
      seconds: 60,
      milliseconds: 1000,
      microseconds: 1000,
      nanoseconds: 1000
    };
    return ES.ToTemporalRoundingIncrement(options, maximumIncrements[smallestUnit], false);
  },
  ToSecondsStringPrecision: (options) => {
    const singular = new Map([
      ['minutes', 'minute'],
      ['seconds', 'second'],
      ['milliseconds', 'millisecond'],
      ['microseconds', 'microsecond'],
      ['nanoseconds', 'nanosecond']
    ]);
    const allowed = new Set(['minute', 'second', 'millisecond', 'microsecond', 'nanosecond']);
    let smallestUnit = ES.GetOption(options, 'smallestUnit', [...allowed, ...singular.keys()], undefined);
    if (singular.has(smallestUnit)) smallestUnit = singular.get(smallestUnit);
    switch (smallestUnit) {
      case 'minute':
        return { precision: 'minute', unit: 'minute', increment: 1 };
      case 'second':
        return { precision: 0, unit: 'second', increment: 1 };
      case 'millisecond':
        return { precision: 3, unit: 'millisecond', increment: 1 };
      case 'microsecond':
        return { precision: 6, unit: 'microsecond', increment: 1 };
      case 'nanosecond':
        return { precision: 9, unit: 'nanosecond', increment: 1 };
      default: // fall through if option not given
    }
    let digits = options.fractionalSecondDigits;
    if (digits === undefined || digits === 'auto') return { precision: 'auto', unit: 'nanosecond', increment: 1 };
    digits = ES.ToNumber(digits);
    if (NumberIsNaN(digits) || digits < 0 || digits > 9) {
      throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${digits}`);
    }
    const precision = MathFloor(digits);
    switch (precision) {
      case 0:
        return { precision, unit: 'second', increment: 1 };
      case 1:
      case 2:
      case 3:
        return { precision, unit: 'millisecond', increment: 10 ** (3 - precision) };
      case 4:
      case 5:
      case 6:
        return { precision, unit: 'microsecond', increment: 10 ** (6 - precision) };
      case 7:
      case 8:
      case 9:
        return { precision, unit: 'nanosecond', increment: 10 ** (9 - precision) };
    }
  },
  ToDurationSecondsStringPrecision: (options) => {
    const plural = new Map([
      ['second', 'seconds'],
      ['millisecond', 'milliseconds'],
      ['microsecond', 'microseconds'],
      ['nanosecond', 'nanoseconds']
    ]);
    const allowed = new Set(['seconds', 'milliseconds', 'microseconds', 'nanoseconds']);
    let smallestUnit = ES.GetOption(options, 'smallestUnit', [...allowed, ...plural.keys()], undefined);
    if (plural.has(smallestUnit)) smallestUnit = plural.get(smallestUnit);
    switch (smallestUnit) {
      case 'seconds':
        return { precision: 0, unit: 'seconds', increment: 1 };
      case 'milliseconds':
        return { precision: 3, unit: 'milliseconds', increment: 1 };
      case 'microseconds':
        return { precision: 6, unit: 'microseconds', increment: 1 };
      case 'nanoseconds':
        return { precision: 9, unit: 'nanoseconds', increment: 1 };
      default: // fall through if option not given
    }
    let digits = options.fractionalSecondDigits;
    if (digits === undefined || digits === 'auto') return { precision: 'auto', unit: 'nanoseconds', increment: 1 };
    digits = ES.ToNumber(digits);
    if (NumberIsNaN(digits) || digits < 0 || digits > 9) {
      throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${digits}`);
    }
    const precision = MathFloor(digits);
    switch (precision) {
      case 0:
        return { precision, unit: 'seconds', increment: 1 };
      case 1:
      case 2:
      case 3:
        return { precision, unit: 'milliseconds', increment: 10 ** (3 - precision) };
      case 4:
      case 5:
      case 6:
        return { precision, unit: 'microseconds', increment: 10 ** (6 - precision) };
      case 7:
      case 8:
      case 9:
        return { precision, unit: 'nanoseconds', increment: 10 ** (9 - precision) };
    }
  },
  ToLargestTemporalUnit: (options, fallback, disallowedStrings = []) => {
    const plural = new Map(
      [
        ['year', 'years'],
        ['month', 'months'],
        ['day', 'days'],
        ['hour', 'hours'],
        ['minute', 'minutes'],
        ['second', 'seconds'],
        ['millisecond', 'milliseconds'],
        ['microsecond', 'microseconds'],
        ['nanosecond', 'nanoseconds']
      ].filter(([, pl]) => !disallowedStrings.includes(pl))
    );
    const allowed = new Set([
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
      'seconds',
      'milliseconds',
      'microseconds',
      'nanoseconds'
    ]);
    for (const s of disallowedStrings) {
      allowed.delete(s);
    }
    const retval = ES.GetOption(options, 'largestUnit', ['auto', ...allowed, ...plural.keys()], 'auto');
    if (retval === 'auto') return fallback;
    if (plural.has(retval)) return plural.get(retval);
    return retval;
  },
  ToSmallestTemporalUnit: (options, disallowedStrings = []) => {
    const singular = new Map(
      [
        ['days', 'day'],
        ['hours', 'hour'],
        ['minutes', 'minute'],
        ['seconds', 'second'],
        ['milliseconds', 'millisecond'],
        ['microseconds', 'microsecond'],
        ['nanoseconds', 'nanosecond']
      ].filter(([, sing]) => !disallowedStrings.includes(sing))
    );
    const allowed = new Set(['day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond']);
    for (const s of disallowedStrings) {
      allowed.delete(s);
    }
    const value = ES.GetOption(options, 'smallestUnit', [...allowed, ...singular.keys()], undefined);
    if (value === undefined) throw new RangeError('smallestUnit option is required');
    if (singular.has(value)) return singular.get(value);
    return value;
  },
  ToSmallestTemporalDurationUnit: (options, fallback, disallowedStrings = []) => {
    const plural = new Map(
      [
        ['year', 'years'],
        ['month', 'months'],
        ['day', 'days'],
        ['hour', 'hours'],
        ['minute', 'minutes'],
        ['second', 'seconds'],
        ['millisecond', 'milliseconds'],
        ['microsecond', 'microseconds'],
        ['nanosecond', 'nanoseconds']
      ].filter(([, pl]) => !disallowedStrings.includes(pl))
    );
    const allowed = new Set([
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
      'seconds',
      'milliseconds',
      'microseconds',
      'nanoseconds'
    ]);
    for (const s of disallowedStrings) {
      allowed.delete(s);
    }
    const value = ES.GetOption(options, 'smallestUnit', [...allowed, ...plural.keys()], fallback);
    if (plural.has(value)) return plural.get(value);
    return value;
  },
  ToTemporalDurationTotalUnit: (options) => {
    // This AO is identical to ToSmallestTemporalDurationUnit, except:
    // - default is always `undefined` (caller will throw if omitted)
    // - option is named `unit` (not `smallestUnit`)
    // - all units are valid (no `disallowedStrings`)
    const plural = new Map([
      ['year', 'years'],
      ['month', 'months'],
      ['day', 'days'],
      ['hour', 'hours'],
      ['minute', 'minutes'],
      ['second', 'seconds'],
      ['millisecond', 'milliseconds'],
      ['microsecond', 'microseconds'],
      ['nanosecond', 'nanoseconds']
    ]);
    // "week" doesn't exist in Temporal as a non-plural unit, so don't allow it
    const value = ES.GetOption(options, 'unit', [...plural.values(), ...plural.keys(), 'weeks'], undefined);
    if (plural.has(value)) return plural.get(value);
    return value;
  },
  ToRelativeTemporalObject: (options) => {
    const relativeTo = options.relativeTo;
    if (relativeTo === undefined) return relativeTo;

    let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, timeZone, offset;
    if (ES.Type(relativeTo) === 'Object') {
      if (ES.IsTemporalZonedDateTime(relativeTo) || ES.IsTemporalDateTime(relativeTo)) return relativeTo;
      calendar = relativeTo.calendar;
      if (calendar === undefined) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
      const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
      const fields = ES.ToTemporalDateTimeFields(relativeTo, fieldNames);
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      } = ES.InterpretTemporalDateTimeFields(calendar, fields, { overflow: 'constrain' }));
      offset = relativeTo.offset;
      timeZone = relativeTo.timeZone;
    } else {
      let ianaName;
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        calendar,
        ianaName,
        offset
      } = ES.ParseISODateTime(ES.ToString(relativeTo), { zoneRequired: false }));
      if (ianaName) timeZone = ianaName;
      if (!calendar) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
    }
    if (timeZone) {
      timeZone = ES.ToTemporalTimeZone(timeZone);
      let offsetNs = null;
      if (offset) offsetNs = ES.ParseOffsetString(ES.ToString(offset));
      const epochNanoseconds = ES.InterpretTemporalZonedDateTimeOffset(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        offsetNs,
        timeZone,
        'compatible',
        'reject'
      );
      const TemporalZonedDateTime = GetIntrinsic('%Temporal.ZonedDateTime%');
      return new TemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
    }
    const TemporalDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    return new TemporalDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar);
  },
  ValidateTemporalUnitRange: (largestUnit, smallestUnit) => {
    const validUnits = [
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
      'seconds',
      'milliseconds',
      'microseconds',
      'nanoseconds'
    ];
    if (validUnits.indexOf(largestUnit) > validUnits.indexOf(smallestUnit)) {
      throw new RangeError(`largestUnit ${largestUnit} cannot be smaller than smallestUnit ${smallestUnit}`);
    }
  },
  DefaultTemporalLargestUnit: (
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds
  ) => {
    for (const [prop, v] of ObjectEntries({
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    })) {
      if (v !== 0) return prop;
    }
    return 'nanoseconds';
  },
  LargerOfTwoTemporalDurationUnits: (unit1, unit2) => {
    const validUnits = [
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
      'seconds',
      'milliseconds',
      'microseconds',
      'nanoseconds'
    ];
    if (validUnits.indexOf(unit1) > validUnits.indexOf(unit2)) return unit2;
    return unit1;
  },
  CastIfDefined: (value, cast) => {
    if (value !== undefined) {
      return cast(value);
    }
    return value;
  },
  ToPartialRecord: (bag, fields, callerCast) => {
    if (ES.Type(bag) !== 'Object') return false;
    let any;
    for (const property of fields) {
      const value = bag[property];
      if (value !== undefined) {
        any = any || {};
        if (callerCast === undefined && BUILTIN_CASTS.has(property)) {
          any[property] = BUILTIN_CASTS.get(property)(value, property);
        } else if (callerCast !== undefined) {
          any[property] = callerCast(value);
        } else {
          any[property] = value;
        }
      }
    }
    return any ? any : false;
  },
  PrepareTemporalFields: (bag, fields) => {
    if (ES.Type(bag) !== 'Object') return false;
    const result = {};
    let any = false;
    for (const fieldRecord of fields) {
      const [property, defaultValue] = fieldRecord;
      let value = bag[property];
      if (value === undefined) {
        if (fieldRecord.length === 1) {
          throw new TypeError(`required property '${property}' missing or undefined`);
        }
        value = defaultValue;
      } else {
        any = true;
        if (BUILTIN_CASTS.has(property)) {
          value = BUILTIN_CASTS.get(property)(value, property);
        }
      }
      result[property] = value;
    }
    if (!any) {
      throw new TypeError('no supported properties found');
    }
    if ((result['era'] === undefined) !== (result['eraYear'] === undefined)) {
      throw new RangeError("properties 'era' and 'eraYear' must be provided together");
    }
    return result;
  },
  // field access in the following operations is intentionally alphabetical
  ToTemporalDateFields: (bag, fieldNames) => {
    const entries = [
      ['day', undefined],
      ['month', undefined],
      ['monthCode', undefined],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },
  ToTemporalDateTimeFields: (bag, fieldNames) => {
    const entries = [
      ['day', undefined],
      ['hour', 0],
      ['microsecond', 0],
      ['millisecond', 0],
      ['minute', 0],
      ['month', undefined],
      ['monthCode', undefined],
      ['nanosecond', 0],
      ['second', 0],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },
  ToTemporalMonthDayFields: (bag, fieldNames) => {
    const entries = [
      ['day', undefined],
      ['month', undefined],
      ['monthCode', undefined],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },
  ToTemporalTimeRecord: (bag) => {
    return ES.PrepareTemporalFields(bag, [
      ['hour', 0],
      ['microsecond', 0],
      ['millisecond', 0],
      ['minute', 0],
      ['nanosecond', 0],
      ['second', 0]
    ]);
  },
  ToTemporalYearMonthFields: (bag, fieldNames) => {
    const entries = [
      ['month', undefined],
      ['monthCode', undefined],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },
  ToTemporalZonedDateTimeFields: (bag, fieldNames) => {
    const entries = [
      ['day', undefined],
      ['hour', 0],
      ['microsecond', 0],
      ['millisecond', 0],
      ['minute', 0],
      ['month', undefined],
      ['monthCode', undefined],
      ['nanosecond', 0],
      ['offset', undefined],
      ['second', 0],
      ['timeZone'],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },

  ToTemporalDate: (item, constructor, options = {}) => {
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalDate(item)) return item;
      if (ES.IsTemporalDateTime(item)) return ES.TemporalDateTimeToDate(item);
      if (ES.IsTemporalZonedDateTime(item)) {
        const dt = ES.GetTemporalDateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, INSTANT), GetSlot(item, CALENDAR));
        return ES.TemporalDateTimeToDate(dt);
      }
      let calendar = item.calendar;
      if (calendar === undefined) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
      const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
      const fields = ES.ToTemporalDateFields(item, fieldNames);
      return ES.DateFromFields(calendar, fields, constructor, options);
    }
    ES.ToTemporalOverflow(options); // validate and ignore
    let { year, month, day, calendar } = ES.ParseTemporalDateString(ES.ToString(item));
    ES.RejectDate(year, month, day);
    if (calendar === undefined) calendar = ES.GetISO8601Calendar();
    calendar = ES.ToTemporalCalendar(calendar);
    let result = new constructor(year, month, day, calendar);
    if (!ES.IsTemporalDate(result)) throw new TypeError('invalid result');
    return result;
  },
  InterpretTemporalDateTimeFields: (calendar, fields, options) => {
    const TemporalDate = GetIntrinsic('%Temporal.PlainDate%');
    const date = ES.DateFromFields(calendar, fields, TemporalDate, options);
    const year = GetSlot(date, ISO_YEAR);
    const month = GetSlot(date, ISO_MONTH);
    const day = GetSlot(date, ISO_DAY);
    let { hour, minute, second, millisecond, microsecond, nanosecond } = ES.ToTemporalTimeRecord(fields);
    const overflow = ES.ToTemporalOverflow(options);
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      overflow
    ));
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  ToTemporalDateTime: (item, constructor, options = {}) => {
    let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar;
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalDateTime(item)) return item;

      calendar = item.calendar;
      if (calendar === undefined) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);

      const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
      const fields = ES.ToTemporalDateTimeFields(item, fieldNames);
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      } = ES.InterpretTemporalDateTimeFields(calendar, fields, options));
    } else {
      ES.ToTemporalOverflow(options); // validate and ignore
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        calendar
      } = ES.ParseTemporalDateTimeString(ES.ToString(item)));
      ES.RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
      if (calendar === undefined) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
    }
    const result = new constructor(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
    if (!ES.IsTemporalDateTime(result)) throw new TypeError('invalid result');
    return result;
  },
  ToTemporalDuration: (item, constructor) => {
    let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalDuration(item)) return item;
      ({
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      } = ES.ToTemporalDurationRecord(item));
    } else {
      ({
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      } = ES.ParseTemporalDurationString(ES.ToString(item)));
    }
    const result = new constructor(
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    );
    if (!ES.IsTemporalDuration(result)) throw new TypeError('invalid result');
    return result;
  },
  ToTemporalInstant: (item, constructor) => {
    if (ES.IsTemporalInstant(item)) return item;
    const ns = ES.ParseTemporalInstant(ES.ToString(item));
    const result = new constructor(bigIntIfAvailable(ns));
    if (!ES.IsTemporalInstant(result)) throw new TypeError('invalid result');
    return result;
  },
  ToTemporalMonthDay: (item, constructor, options = {}) => {
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalMonthDay(item)) return item;
      let calendar = item.calendar;
      let calendarAbsent = calendar === undefined;
      if (calendar === undefined) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
      const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
      const fields = ES.ToTemporalMonthDayFields(item, fieldNames);
      // Callers who omit the calendar are not writing calendar-independent
      // code. In that case, `monthCode`/`year` can be omitted; `month` and
      // `day` are sufficient. Add a `year` to satisfy calendar validation.
      if (calendarAbsent && fields.month !== undefined && fields.monthCode === undefined && fields.year === undefined) {
        fields.year = 1972;
      }
      return ES.MonthDayFromFields(calendar, fields, constructor, options);
    }

    ES.ToTemporalOverflow(options); // validate and ignore
    let { month, day, referenceISOYear, calendar } = ES.ParseTemporalMonthDayString(ES.ToString(item));
    if (calendar === undefined) calendar = ES.GetISO8601Calendar();
    calendar = ES.ToTemporalCalendar(calendar);

    if (referenceISOYear === undefined) {
      ES.RejectDate(1972, month, day);
      const result = new constructor(month, day, calendar);
      if (!ES.IsTemporalMonthDay(result)) throw new TypeError('invalid result');
      return result;
    }
    const PlainMonthDay = GetIntrinsic('%Temporal.PlainMonthDay%');
    const result = new PlainMonthDay(month, day, calendar, referenceISOYear);
    return ES.MonthDayFromFields(calendar, result, constructor, {});
  },
  ToTemporalTime: (item, constructor, overflow = 'constrain') => {
    let hour, minute, second, millisecond, microsecond, nanosecond, calendar;
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalTime(item)) return item;
      calendar = item.calendar;
      if (calendar) {
        calendar = ES.ToTemporalCalendar(calendar);
        if (ES.ToString(calendar) !== 'iso8601') {
          throw new RangeError('PlainTime can only have iso8601 calendar');
        }
      }
      ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ToTemporalTimeRecord(item));
      ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        overflow
      ));
    } else {
      ({ hour, minute, second, millisecond, microsecond, nanosecond, calendar } = ES.ParseTemporalTimeString(
        ES.ToString(item)
      ));
      ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
      if (calendar !== undefined && calendar !== 'iso8601') {
        throw new RangeError('PlainTime can only have iso8601 calendar');
      }
    }
    let result = new constructor(hour, minute, second, millisecond, microsecond, nanosecond);
    if (!ES.IsTemporalTime(result)) throw new TypeError('invalid result');
    return result;
  },
  ToTemporalYearMonth: (item, constructor, options = {}) => {
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalYearMonth(item)) return item;
      let calendar = item.calendar;
      if (calendar === undefined) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
      const fieldNames = ES.CalendarFields(calendar, ['month', 'monthCode', 'year']);
      const fields = ES.ToTemporalYearMonthFields(item, fieldNames);
      return ES.YearMonthFromFields(calendar, fields, constructor, options);
    }

    ES.ToTemporalOverflow(options); // validate and ignore
    let { year, month, referenceISODay, calendar } = ES.ParseTemporalYearMonthString(ES.ToString(item));
    if (calendar === undefined) calendar = ES.GetISO8601Calendar();
    calendar = ES.ToTemporalCalendar(calendar);

    if (referenceISODay === undefined) {
      ES.RejectDate(year, month, 1);
      const result = new constructor(year, month, calendar);
      if (!ES.IsTemporalYearMonth(result)) throw new TypeError('invalid result');
      return result;
    }
    const PlainYearMonth = GetIntrinsic('%Temporal.PlainYearMonth%');
    const result = new PlainYearMonth(year, month, calendar, referenceISODay);
    return ES.YearMonthFromFields(calendar, result, constructor, {});
  },
  InterpretTemporalZonedDateTimeOffset: (
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    offsetNs,
    timeZone,
    disambiguation,
    offsetOpt
  ) => {
    const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const dt = new DateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);

    if (offsetNs === null || offsetOpt === 'ignore') {
      // Simple case: ISO string without a TZ offset (or caller wants to ignore
      // the offset), so just convert DateTime to Instant in the given time zone
      const instant = ES.GetTemporalInstantFor(timeZone, dt, disambiguation);
      return GetSlot(instant, EPOCHNANOSECONDS);
    }

    // The caller wants the offset to always win ('use') OR the caller is OK
    // with the offset winning ('prefer' or 'reject') as long as it's valid
    // for this timezone and date/time.
    if (offsetOpt === 'use') {
      // Calculate the instant for the input's date/time and offset
      const epochNs = ES.GetEpochFromParts(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      );
      if (epochNs === null) throw new RangeError('ZonedDateTime outside of supported range');
      return epochNs.minus(offsetNs);
    }

    // "prefer" or "reject"
    const possibleInstants = timeZone.getPossibleInstantsFor(dt);
    for (const candidate of possibleInstants) {
      const candidateOffset = ES.GetOffsetNanosecondsFor(timeZone, candidate);
      if (candidateOffset === offsetNs) return GetSlot(candidate, EPOCHNANOSECONDS);
    }

    // the user-provided offset doesn't match any instants for this time
    // zone and date/time.
    if (offsetOpt === 'reject') {
      const offsetStr = ES.FormatTimeZoneOffsetString(offsetNs);
      throw new RangeError(`Offset ${offsetStr} is invalid for ${dt} in ${timeZone}`);
    }
    // fall through: offsetOpt === 'prefer', but the offset doesn't match
    // so fall back to use the time zone instead.
    const instant = ES.GetTemporalInstantFor(timeZone, dt, disambiguation);
    return GetSlot(instant, EPOCHNANOSECONDS);
  },
  ToTemporalZonedDateTime: (item, constructor, options = {}) => {
    let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, timeZone, offset, calendar;
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalZonedDateTime(item)) return item;
      calendar = item.calendar;
      if (calendar === undefined) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
      const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'year']);
      const fields = ES.ToTemporalZonedDateTimeFields(item, fieldNames);
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      } = ES.InterpretTemporalDateTimeFields(calendar, fields, options));
      timeZone = ES.ToTemporalTimeZone(fields.timeZone);
      offset = fields.offset;
      if (offset !== undefined) offset = ES.ToString(offset);
    } else {
      ES.ToTemporalOverflow(options); // validate and ignore
      let ianaName;
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        ianaName,
        offset,
        calendar
      } = ES.ParseTemporalZonedDateTimeString(ES.ToString(item)));
      if (!ianaName) throw new RangeError('time zone ID required in brackets');
      timeZone = ES.TimeZoneFrom(ianaName);
      if (!calendar) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
    }
    let offsetNs = null;
    if (offset) offsetNs = ES.ParseOffsetString(offset);
    const disambiguation = ES.ToTemporalDisambiguation(options);
    const offsetOpt = ES.ToTemporalOffset(options, 'reject');
    const epochNanoseconds = ES.InterpretTemporalZonedDateTimeOffset(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      offsetNs,
      timeZone,
      disambiguation,
      offsetOpt
    );
    const result = new constructor(epochNanoseconds, timeZone, calendar);
    if (!ES.IsTemporalZonedDateTime(result)) throw new TypeError('invalid result');
    return result;
  },

  GetISO8601Calendar: () => {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    return new TemporalCalendar('iso8601');
  },
  CalendarFrom: (calendarLike) => {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    let from = TemporalCalendar.from;
    if (from === undefined) {
      from = GetIntrinsic('%Temporal.Calendar.from%');
    }
    const calendar = ES.Call(from, TemporalCalendar, [calendarLike]);
    if (ES.Type(calendar) !== 'Object') {
      throw new TypeError('Temporal.Calendar.from should return an object');
    }
    return calendar;
  },
  CalendarFields: (calendar, fieldNames) => {
    let fields = calendar.fields;
    if (fields !== undefined) fieldNames = ES.Call(fields, calendar, [fieldNames]);
    return ES.CreateListFromArrayLike(fieldNames, ['String']);
  },
  CalendarMergeFields: (calendar, fields, additionalFields) => {
    let mergeFields = calendar.mergeFields;
    if (mergeFields === undefined) return { ...fields, ...additionalFields };
    return ES.Call(mergeFields, calendar, [fields, additionalFields]);
  },

  ToTemporalCalendar: (calendarLike) => {
    if (ES.Type(calendarLike) === 'Object') {
      return calendarLike;
    }
    const identifier = ES.ToString(calendarLike);
    return ES.CalendarFrom(identifier);
  },
  CalendarCompare: (one, two) => {
    const cal1 = ES.ToString(one);
    const cal2 = ES.ToString(two);
    return cal1 < cal2 ? -1 : cal1 > cal2 ? 1 : 0;
  },
  CalendarEquals: (one, two) => {
    const cal1 = ES.ToString(one);
    const cal2 = ES.ToString(two);
    return cal1 === cal2;
  },
  ConsolidateCalendars: (one, two) => {
    const sOne = ES.ToString(one);
    const sTwo = ES.ToString(two);
    if (sOne === sTwo || sOne === 'iso8601') {
      return two;
    } else if (sTwo === 'iso8601') {
      return one;
    } else {
      throw new RangeError('irreconcilable calendars');
    }
  },
  DateFromFields: (calendar, fields, constructor, options) => {
    const result = calendar.dateFromFields(fields, options, constructor);
    if (!ES.IsTemporalDate(result)) throw new TypeError('invalid result');
    return result;
  },
  YearMonthFromFields: (calendar, fields, constructor, options) => {
    const result = calendar.yearMonthFromFields(fields, options, constructor);
    if (!ES.IsTemporalYearMonth(result)) throw new TypeError('invalid result');
    return result;
  },
  MonthDayFromFields: (calendar, fields, constructor, options) => {
    const result = calendar.monthDayFromFields(fields, options, constructor);
    if (!ES.IsTemporalMonthDay(result)) throw new TypeError('invalid result');
    return result;
  },
  TimeZoneFrom: (temporalTimeZoneLike) => {
    const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
    let from = TemporalTimeZone.from;
    if (from === undefined) {
      from = GetIntrinsic('%Temporal.TimeZone.from%');
    }
    return ES.Call(from, TemporalTimeZone, [temporalTimeZoneLike]);
  },
  ToTemporalTimeZone: (temporalTimeZoneLike) => {
    if (ES.Type(temporalTimeZoneLike) === 'Object') {
      return temporalTimeZoneLike;
    }
    const identifier = ES.ToString(temporalTimeZoneLike);
    return ES.TimeZoneFrom(identifier);
  },
  TimeZoneCompare: (one, two) => {
    const tz1 = ES.ToString(one);
    const tz2 = ES.ToString(two);
    return tz1 < tz2 ? -1 : tz1 > tz2 ? 1 : 0;
  },
  TimeZoneEquals: (one, two) => {
    const tz1 = ES.ToString(one);
    const tz2 = ES.ToString(two);
    return tz1 === tz2;
  },
  TemporalDateTimeToDate: (dateTime) => {
    const Date = GetIntrinsic('%Temporal.PlainDate%');
    return new Date(
      GetSlot(dateTime, ISO_YEAR),
      GetSlot(dateTime, ISO_MONTH),
      GetSlot(dateTime, ISO_DAY),
      GetSlot(dateTime, CALENDAR)
    );
  },
  TemporalDateTimeToTime: (dateTime) => {
    const Time = GetIntrinsic('%Temporal.PlainTime%');
    return new Time(
      GetSlot(dateTime, ISO_HOUR),
      GetSlot(dateTime, ISO_MINUTE),
      GetSlot(dateTime, ISO_SECOND),
      GetSlot(dateTime, ISO_MILLISECOND),
      GetSlot(dateTime, ISO_MICROSECOND),
      GetSlot(dateTime, ISO_NANOSECOND),
      GetSlot(dateTime, CALENDAR)
    );
  },
  GetOffsetNanosecondsFor: (timeZone, instant) => {
    let getOffsetNanosecondsFor = timeZone.getOffsetNanosecondsFor;
    if (getOffsetNanosecondsFor === undefined) {
      getOffsetNanosecondsFor = GetIntrinsic('%Temporal.TimeZone.prototype.getOffsetNanosecondsFor%');
    }
    const offsetNs = ES.Call(getOffsetNanosecondsFor, timeZone, [instant]);
    if (typeof offsetNs !== 'number') {
      throw new TypeError('bad return from getOffsetNanosecondsFor');
    }
    if (!NumberIsInteger(offsetNs) || MathAbs(offsetNs) > 86400e9) {
      throw new RangeError('out-of-range return from getOffsetNanosecondsFor');
    }
    return offsetNs;
  },
  GetOffsetStringFor: (timeZone, instant) => {
    let getOffsetStringFor = timeZone.getOffsetStringFor;
    if (getOffsetStringFor === undefined) {
      getOffsetStringFor = GetIntrinsic('%Temporal.TimeZone.prototype.getOffsetStringFor%');
    }
    return ES.ToString(ES.Call(getOffsetStringFor, timeZone, [instant]));
  },
  GetTemporalDateTimeFor: (timeZone, instant, calendar) => {
    let getPlainDateTimeFor = timeZone.getPlainDateTimeFor;
    if (getPlainDateTimeFor === undefined) {
      getPlainDateTimeFor = GetIntrinsic('%Temporal.TimeZone.prototype.getPlainDateTimeFor%');
    }
    const dateTime = ES.Call(getPlainDateTimeFor, timeZone, [instant, calendar]);
    if (!ES.IsTemporalDateTime(dateTime)) {
      throw new TypeError('Unexpected result from getPlainDateTimeFor');
    }
    return dateTime;
  },
  GetTemporalInstantFor: (timeZone, dateTime, disambiguation) => {
    let getInstantFor = timeZone.getInstantFor;
    if (getInstantFor === undefined) {
      getInstantFor = GetIntrinsic('%Temporal.TimeZone.prototype.getInstantFor%');
    }
    return ES.Call(getInstantFor, timeZone, [dateTime, { disambiguation }]);
  },
  ISOYearString: (year) => {
    let yearString;
    if (year < 1000 || year > 9999) {
      let sign = year < 0 ? '-' : '+';
      let yearNumber = MathAbs(year);
      yearString = sign + `000000${yearNumber}`.slice(-6);
    } else {
      yearString = `${year}`;
    }
    return yearString;
  },
  ISODateTimePartString: (part) => `00${part}`.slice(-2),
  FormatSecondsStringPart: (second, millisecond, microsecond, nanosecond, precision) => {
    if (precision === 'minute') return '';

    const secs = `:${ES.ISODateTimePartString(second)}`;
    let fraction = millisecond * 1e6 + microsecond * 1e3 + nanosecond;

    if (precision === 'auto') {
      if (fraction === 0) return secs;
      fraction = `${fraction}`.padStart(9, '0');
      while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
    } else {
      if (precision === 0) return secs;
      fraction = `${fraction}`.padStart(9, '0').slice(0, precision);
    }
    return `${secs}.${fraction}`;
  },
  TemporalInstantToString: (instant, timeZone, precision) => {
    let outputTimeZone = timeZone;
    if (outputTimeZone === undefined) {
      const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
      outputTimeZone = new TemporalTimeZone('UTC');
    }
    const dateTime = ES.GetTemporalDateTimeFor(outputTimeZone, instant, 'iso8601');
    const year = ES.ISOYearString(GetSlot(dateTime, ISO_YEAR));
    const month = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MONTH));
    const day = ES.ISODateTimePartString(GetSlot(dateTime, ISO_DAY));
    const hour = ES.ISODateTimePartString(GetSlot(dateTime, ISO_HOUR));
    const minute = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MINUTE));
    const seconds = ES.FormatSecondsStringPart(
      GetSlot(dateTime, ISO_SECOND),
      GetSlot(dateTime, ISO_MILLISECOND),
      GetSlot(dateTime, ISO_MICROSECOND),
      GetSlot(dateTime, ISO_NANOSECOND),
      precision
    );
    const timeZoneString = timeZone === undefined ? 'Z' : ES.GetOffsetStringFor(outputTimeZone, instant);
    return `${year}-${month}-${day}T${hour}:${minute}${seconds}${timeZoneString}`;
  },
  TemporalDurationToString: (duration, precision, options = undefined) => {
    function formatNumber(num) {
      if (num <= NumberMaxSafeInteger) return num.toString(10);
      return bigInt(num).toString();
    }

    const years = GetSlot(duration, YEARS);
    const months = GetSlot(duration, MONTHS);
    const weeks = GetSlot(duration, WEEKS);
    const days = GetSlot(duration, DAYS);
    const hours = GetSlot(duration, HOURS);
    const minutes = GetSlot(duration, MINUTES);
    let seconds = GetSlot(duration, SECONDS);
    let ms = GetSlot(duration, MILLISECONDS);
    let µs = GetSlot(duration, MICROSECONDS);
    let ns = GetSlot(duration, NANOSECONDS);
    const sign = ES.DurationSign(years, months, weeks, days, hours, minutes, seconds, ms, µs, ns);

    if (options) {
      const { unit, increment, roundingMode } = options;
      ({ seconds, milliseconds: ms, microseconds: µs, nanoseconds: ns } = ES.RoundDuration(
        0,
        0,
        0,
        0,
        0,
        0,
        seconds,
        ms,
        µs,
        ns,
        increment,
        unit,
        roundingMode
      ));
    }

    const dateParts = [];
    if (years) dateParts.push(`${formatNumber(MathAbs(years))}Y`);
    if (months) dateParts.push(`${formatNumber(MathAbs(months))}M`);
    if (weeks) dateParts.push(`${formatNumber(MathAbs(weeks))}W`);
    if (days) dateParts.push(`${formatNumber(MathAbs(days))}D`);

    const timeParts = [];
    if (hours) timeParts.push(`${formatNumber(MathAbs(hours))}H`);
    if (minutes) timeParts.push(`${formatNumber(MathAbs(minutes))}M`);

    const secondParts = [];
    let total = ES.TotalDurationNanoseconds(0, 0, 0, seconds, ms, µs, ns, 0);
    ({ quotient: total, remainder: ns } = total.divmod(1000));
    ({ quotient: total, remainder: µs } = total.divmod(1000));
    ({ quotient: seconds, remainder: ms } = total.divmod(1000));
    let fraction = MathAbs(ms.toJSNumber()) * 1e6 + MathAbs(µs.toJSNumber()) * 1e3 + MathAbs(ns.toJSNumber());
    let decimalPart;
    if (precision === 'auto') {
      if (fraction !== 0) {
        decimalPart = `${fraction}`.padStart(9, '0');
        while (decimalPart[decimalPart.length - 1] === '0') {
          decimalPart = decimalPart.slice(0, -1);
        }
      }
    } else if (precision !== 0) {
      decimalPart = `${fraction}`.slice(0, precision).padStart(precision, '0');
    }
    if (decimalPart) secondParts.unshift('.', decimalPart);
    if (!seconds.isZero() || secondParts.length) secondParts.unshift(seconds.abs().toString());
    if (secondParts.length) timeParts.push(`${secondParts.join('')}S`);
    if (timeParts.length) timeParts.unshift('T');
    if (!dateParts.length && !timeParts.length) return 'PT0S';
    return `${sign < 0 ? '-' : ''}P${dateParts.join('')}${timeParts.join('')}`;
  },

  ParseOffsetString: (string) => {
    const match = OFFSET.exec(String(string));
    if (!match) return null;
    const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : +1;
    const hours = +match[2];
    const minutes = +(match[3] || 0);
    const seconds = +(match[4] || 0);
    const nanoseconds = +((match[5] || 0) + '000000000').slice(0, 9);
    return sign * (((hours * 60 + minutes) * 60 + seconds) * 1e9 + nanoseconds);
  },
  GetCanonicalTimeZoneIdentifier: (timeZoneIdentifier) => {
    const offsetNs = ES.ParseOffsetString(timeZoneIdentifier);
    if (offsetNs !== null) return ES.FormatTimeZoneOffsetString(offsetNs);
    const formatter = new IntlDateTimeFormat('en-us', {
      timeZone: String(timeZoneIdentifier),
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    return formatter.resolvedOptions().timeZone;
  },
  GetIANATimeZoneOffsetNanoseconds: (epochNanoseconds, id) => {
    const {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    } = ES.GetIANATimeZoneDateTimeParts(epochNanoseconds, id);
    const utc = ES.GetEpochFromParts(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
    if (utc === null) throw new RangeError('Date outside of supported range');
    return +utc.minus(epochNanoseconds);
  },
  FormatTimeZoneOffsetString: (offsetNanoseconds) => {
    const sign = offsetNanoseconds < 0 ? '-' : '+';
    offsetNanoseconds = MathAbs(offsetNanoseconds);
    const nanoseconds = offsetNanoseconds % 1e9;
    const seconds = MathFloor(offsetNanoseconds / 1e9) % 60;
    const minutes = MathFloor(offsetNanoseconds / 60e9) % 60;
    const hours = MathFloor(offsetNanoseconds / 3600e9);

    const hourString = ES.ISODateTimePartString(hours);
    const minuteString = ES.ISODateTimePartString(minutes);
    const secondString = ES.ISODateTimePartString(seconds);
    let post = '';
    if (nanoseconds) {
      let fraction = `${nanoseconds}`.padStart(9, '0');
      while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
      post = `:${secondString}.${fraction}`;
    } else if (seconds) {
      post = `:${secondString}`;
    }
    return `${sign}${hourString}:${minuteString}${post}`;
  },
  GetEpochFromParts: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    // Note: Date.UTC() interprets one and two-digit years as being in the
    // 20th century, so don't use it
    const legacyDate = new Date();
    legacyDate.setUTCHours(hour, minute, second, millisecond);
    legacyDate.setUTCFullYear(year, month - 1, day);
    const ms = legacyDate.getTime();
    if (NumberIsNaN(ms)) return null;
    let ns = bigInt(ms).multiply(1e6);
    ns = ns.plus(bigInt(microsecond).multiply(1e3));
    ns = ns.plus(bigInt(nanosecond));
    if (ns.lesser(NS_MIN) || ns.greater(NS_MAX)) return null;
    return ns;
  },
  GetPartsFromEpoch: (epochNanoseconds) => {
    const { quotient, remainder } = bigInt(epochNanoseconds).divmod(1e6);
    let epochMilliseconds = +quotient;
    let nanos = +remainder;
    if (nanos < 0) {
      nanos += 1e6;
      epochMilliseconds -= 1;
    }
    const microsecond = MathFloor(nanos / 1e3) % 1e3;
    const nanosecond = nanos % 1e3;

    const item = new Date(epochMilliseconds);
    const year = item.getUTCFullYear();
    const month = item.getUTCMonth() + 1;
    const day = item.getUTCDate();
    const hour = item.getUTCHours();
    const minute = item.getUTCMinutes();
    const second = item.getUTCSeconds();
    const millisecond = item.getUTCMilliseconds();

    return { epochMilliseconds, year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  GetIANATimeZoneDateTimeParts: (epochNanoseconds, id) => {
    const { epochMilliseconds, millisecond, microsecond, nanosecond } = ES.GetPartsFromEpoch(epochNanoseconds);
    const { year, month, day, hour, minute, second } = ES.GetFormatterParts(id, epochMilliseconds);
    return ES.BalanceDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  },
  GetIANATimeZoneNextTransition: (epochNanoseconds, id) => {
    const uppercap = ES.SystemUTCEpochNanoSeconds() + 366 * DAYMILLIS * 1e6;
    let leftNanos = epochNanoseconds;
    let leftOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(leftNanos, id);
    let rightNanos = leftNanos;
    let rightOffsetNs = leftOffsetNs;
    while (leftOffsetNs === rightOffsetNs && bigInt(leftNanos).compare(uppercap) === -1) {
      rightNanos = bigInt(leftNanos).plus(2 * 7 * DAYMILLIS * 1e6);
      rightOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(rightNanos, id);
      if (leftOffsetNs === rightOffsetNs) {
        leftNanos = rightNanos;
      }
    }
    if (leftOffsetNs === rightOffsetNs) return null;
    const result = bisect(
      (epochNs) => ES.GetIANATimeZoneOffsetNanoseconds(epochNs, id),
      leftNanos,
      rightNanos,
      leftOffsetNs,
      rightOffsetNs
    );
    return result;
  },
  GetIANATimeZonePreviousTransition: (epochNanoseconds, id) => {
    const lowercap = BEFORE_FIRST_DST; // 1847-01-01T00:00:00Z
    let rightNanos = bigInt(epochNanoseconds).minus(1);
    let rightOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(rightNanos, id);
    let leftNanos = rightNanos;
    let leftOffsetNs = rightOffsetNs;
    while (rightOffsetNs === leftOffsetNs && bigInt(rightNanos).compare(lowercap) === 1) {
      leftNanos = bigInt(rightNanos).minus(2 * 7 * DAYMILLIS * 1e6);
      leftOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(leftNanos, id);
      if (rightOffsetNs === leftOffsetNs) {
        rightNanos = leftNanos;
      }
    }
    if (rightOffsetNs === leftOffsetNs) return null;
    const result = bisect(
      (epochNs) => ES.GetIANATimeZoneOffsetNanoseconds(epochNs, id),
      leftNanos,
      rightNanos,
      leftOffsetNs,
      rightOffsetNs
    );
    return result;
  },
  GetFormatterParts: (timeZone, epochMilliseconds) => {
    const formatter = new IntlDateTimeFormat('en-us', {
      timeZone,
      hour12: false,
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    // FIXME: can this use formatToParts instead?
    const datetime = formatter.format(new Date(epochMilliseconds));
    const [date, fullYear, time] = datetime.split(/,\s+/);
    const [month, day] = date.split(' ');
    const [year, era] = fullYear.split(' ');
    const [hour, minute, second] = time.split(':');
    return {
      year: era === 'BC' ? -year + 1 : +year,
      month: +month,
      day: +day,
      hour: hour === '24' ? 0 : +hour, // bugs.chromium.org/p/chromium/issues/detail?id=1045791
      minute: +minute,
      second: +second
    };
  },
  GetIANATimeZoneEpochValue: (id, year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    let ns = ES.GetEpochFromParts(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
    if (ns === null) throw new RangeError('DateTime outside of supported range');
    const dayNanos = bigInt(DAYMILLIS).multiply(1e6);
    let nsEarlier = ns.minus(dayNanos);
    if (nsEarlier.lesser(NS_MIN)) nsEarlier = ns;
    let nsLater = ns.plus(dayNanos);
    if (nsLater.greater(NS_MAX)) nsLater = ns;
    const earliest = ES.GetIANATimeZoneOffsetNanoseconds(nsEarlier, id);
    const latest = ES.GetIANATimeZoneOffsetNanoseconds(nsLater, id);
    const found = earliest === latest ? [earliest] : [earliest, latest];
    return found
      .map((offsetNanoseconds) => {
        const epochNanoseconds = bigInt(ns).minus(offsetNanoseconds);
        const parts = ES.GetIANATimeZoneDateTimeParts(epochNanoseconds, id);
        if (
          year !== parts.year ||
          month !== parts.month ||
          day !== parts.day ||
          hour !== parts.hour ||
          minute !== parts.minute ||
          second !== parts.second ||
          millisecond !== parts.millisecond ||
          microsecond !== parts.microsecond ||
          nanosecond !== parts.nanosecond
        ) {
          return undefined;
        }
        return epochNanoseconds;
      })
      .filter((x) => x !== undefined);
  },
  LeapYear: (year) => {
    if (undefined === year) return false;
    const isDiv4 = year % 4 === 0;
    const isDiv100 = year % 100 === 0;
    const isDiv400 = year % 400 === 0;
    return isDiv4 && (!isDiv100 || isDiv400);
  },
  DaysInMonth: (year, month) => {
    const DoM = {
      standard: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
      leapyear: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    return DoM[ES.LeapYear(year) ? 'leapyear' : 'standard'][month - 1];
  },
  DayOfWeek: (year, month, day) => {
    const m = month + (month < 3 ? 10 : -2);
    const Y = year - (month < 3 ? 1 : 0);

    const c = MathFloor(Y / 100);
    const y = Y - c * 100;
    const d = day;

    const pD = d;
    const pM = MathFloor(2.6 * m - 0.2);
    const pY = y + MathFloor(y / 4);
    const pC = MathFloor(c / 4) - 2 * c;

    const dow = (pD + pM + pY + pC) % 7;

    return dow + (dow <= 0 ? 7 : 0);
  },
  DayOfYear: (year, month, day) => {
    let days = day;
    for (let m = month - 1; m > 0; m--) {
      days += ES.DaysInMonth(year, m);
    }
    return days;
  },
  WeekOfYear: (year, month, day) => {
    let doy = ES.DayOfYear(year, month, day);
    let dow = ES.DayOfWeek(year, month, day) || 7;
    let doj = ES.DayOfWeek(year, 1, 1);

    const week = MathFloor((doy - dow + 10) / 7);

    if (week < 1) {
      if (doj === (ES.LeapYear(year) ? 5 : 6)) {
        return 53;
      } else {
        return 52;
      }
    }
    if (week === 53) {
      if ((ES.LeapYear(year) ? 366 : 365) - doy < 4 - dow) {
        return 1;
      }
    }

    return week;
  },
  DurationSign: (y, mon, w, d, h, min, s, ms, µs, ns) => {
    for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
      if (prop !== 0) return prop < 0 ? -1 : 1;
    }
    return 0;
  },

  BalanceYearMonth: (year, month) => {
    if (!NumberIsFinite(year) || !NumberIsFinite(month)) throw new RangeError('infinity is out of range');
    month -= 1;
    year += MathFloor(month / 12);
    month %= 12;
    if (month < 0) month += 12;
    month += 1;
    return { year, month };
  },
  BalanceDate: (year, month, day) => {
    if (!NumberIsFinite(day)) throw new RangeError('infinity is out of range');
    ({ year, month } = ES.BalanceYearMonth(year, month));
    let daysInYear = 0;
    let testYear = month > 2 ? year : year - 1;
    while (((daysInYear = ES.LeapYear(testYear) ? 366 : 365), day < -daysInYear)) {
      year -= 1;
      testYear -= 1;
      day += daysInYear;
    }
    testYear += 1;
    while (((daysInYear = ES.LeapYear(testYear) ? 366 : 365), day > daysInYear)) {
      year += 1;
      testYear += 1;
      day -= daysInYear;
    }

    while (day < 1) {
      ({ year, month } = ES.BalanceYearMonth(year, month - 1));
      day += ES.DaysInMonth(year, month);
    }
    while (day > ES.DaysInMonth(year, month)) {
      day -= ES.DaysInMonth(year, month);
      ({ year, month } = ES.BalanceYearMonth(year, month + 1));
    }

    return { year, month, day };
  },
  BalanceDateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    let deltaDays;
    ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.BalanceTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    ));
    ({ year, month, day } = ES.BalanceDate(year, month, day + deltaDays));
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  BalanceTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
    if (
      !NumberIsFinite(hour) ||
      !NumberIsFinite(minute) ||
      !NumberIsFinite(second) ||
      !NumberIsFinite(millisecond) ||
      !NumberIsFinite(microsecond) ||
      !NumberIsFinite(nanosecond)
    ) {
      throw new RangeError('infinity is out of range');
    }

    microsecond += MathFloor(nanosecond / 1000);
    nanosecond = ES.NonNegativeModulo(nanosecond, 1000);

    millisecond += MathFloor(microsecond / 1000);
    microsecond = ES.NonNegativeModulo(microsecond, 1000);

    second += MathFloor(millisecond / 1000);
    millisecond = ES.NonNegativeModulo(millisecond, 1000);

    minute += MathFloor(second / 60);
    second = ES.NonNegativeModulo(second, 60);

    hour += MathFloor(minute / 60);
    minute = ES.NonNegativeModulo(minute, 60);

    let deltaDays = MathFloor(hour / 24);
    hour = ES.NonNegativeModulo(hour, 24);

    return { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  TotalDurationNanoseconds: (days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, offsetShift) => {
    if (days !== 0) nanoseconds = bigInt(nanoseconds).subtract(offsetShift);
    hours = bigInt(hours).add(bigInt(days).multiply(24));
    minutes = bigInt(minutes).add(hours.multiply(60));
    seconds = bigInt(seconds).add(minutes.multiply(60));
    milliseconds = bigInt(milliseconds).add(seconds.multiply(1000));
    microseconds = bigInt(microseconds).add(milliseconds.multiply(1000));
    return bigInt(nanoseconds).add(microseconds.multiply(1000));
  },
  NanosecondsToDays: (nanoseconds, relativeTo) => {
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const sign = MathSign(nanoseconds);
    nanoseconds = bigInt(nanoseconds);
    let dayLengthNs = 86400e9;
    if (sign === 0) return { days: 0, nanoseconds: bigInt.zero, dayLengthNs };
    if (!ES.IsTemporalZonedDateTime(relativeTo)) {
      let days;
      ({ quotient: days, remainder: nanoseconds } = nanoseconds.divmod(dayLengthNs));
      days = days.toJSNumber();
      return { days, nanoseconds, dayLengthNs: sign * dayLengthNs };
    }

    const startNs = GetSlot(relativeTo, EPOCHNANOSECONDS);
    const start = GetSlot(relativeTo, INSTANT);
    const endNs = startNs.add(nanoseconds);
    const end = new TemporalInstant(endNs);
    const timeZone = GetSlot(relativeTo, TIME_ZONE);
    const calendar = GetSlot(relativeTo, CALENDAR);

    // Find the difference in days only.
    const dtStart = ES.GetTemporalDateTimeFor(timeZone, start, calendar);
    const dtEnd = ES.GetTemporalDateTimeFor(timeZone, end, calendar);
    let { days } = ES.DifferenceDateTime(
      GetSlot(dtStart, ISO_YEAR),
      GetSlot(dtStart, ISO_MONTH),
      GetSlot(dtStart, ISO_DAY),
      GetSlot(dtStart, ISO_HOUR),
      GetSlot(dtStart, ISO_MINUTE),
      GetSlot(dtStart, ISO_SECOND),
      GetSlot(dtStart, ISO_MILLISECOND),
      GetSlot(dtStart, ISO_MICROSECOND),
      GetSlot(dtStart, ISO_NANOSECOND),
      GetSlot(dtEnd, ISO_YEAR),
      GetSlot(dtEnd, ISO_MONTH),
      GetSlot(dtEnd, ISO_DAY),
      GetSlot(dtEnd, ISO_HOUR),
      GetSlot(dtEnd, ISO_MINUTE),
      GetSlot(dtEnd, ISO_SECOND),
      GetSlot(dtEnd, ISO_MILLISECOND),
      GetSlot(dtEnd, ISO_MICROSECOND),
      GetSlot(dtEnd, ISO_NANOSECOND),
      calendar,
      'days'
    );
    let intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, 0, 0, 0, days, 0, 0, 0, 0, 0, 0);
    // may disambiguate

    // If clock time after addition was in the middle of a skipped period, the
    // endpoint was disambiguated to a later clock time. So it's possible that
    // the resulting disambiguated result is later than endNs. If so, then back
    // up one day and try again. Repeat if necessary (some transitions are
    // > 24 hours) until either there's zero days left or the date duration is
    // back inside the period where it belongs. Note that this case only can
    // happen for positive durations because the only direction that
    // `disambiguation: 'compatible'` can change clock time is forwards.
    if (sign === 1) {
      while (days > 0 && intermediateNs.greater(endNs)) {
        --days;
        intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, 0, 0, 0, days, 0, 0, 0, 0, 0, 0);
        // may do disambiguation
      }
    }
    nanoseconds = endNs.subtract(intermediateNs);

    let isOverflow = false;
    let relativeInstant = new TemporalInstant(intermediateNs);
    do {
      // calculate length of the next day (day that contains the time remainder)
      const oneDayFartherNs = ES.AddZonedDateTime(relativeInstant, timeZone, calendar, 0, 0, 0, sign, 0, 0, 0, 0, 0, 0);
      const relativeNs = GetSlot(relativeInstant, EPOCHNANOSECONDS);
      dayLengthNs = oneDayFartherNs.subtract(relativeNs).toJSNumber();
      isOverflow = nanoseconds.subtract(dayLengthNs).multiply(sign).geq(0);
      if (isOverflow) {
        nanoseconds = nanoseconds.subtract(dayLengthNs);
        relativeInstant = new TemporalInstant(oneDayFartherNs);
        days += sign;
      }
    } while (isOverflow);
    return { days, nanoseconds, dayLengthNs };
  },
  BalanceDuration: (
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    largestUnit,
    relativeTo = undefined
  ) => {
    if (ES.IsTemporalZonedDateTime(relativeTo)) {
      const endNs = ES.AddZonedDateTime(
        GetSlot(relativeTo, INSTANT),
        GetSlot(relativeTo, TIME_ZONE),
        GetSlot(relativeTo, CALENDAR),
        0,
        0,
        0,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      );
      const startNs = GetSlot(relativeTo, EPOCHNANOSECONDS);
      nanoseconds = endNs.subtract(startNs);
    } else {
      nanoseconds = ES.TotalDurationNanoseconds(
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        0
      );
    }
    if (largestUnit === 'years' || largestUnit === 'months' || largestUnit === 'weeks' || largestUnit === 'days') {
      ({ days, nanoseconds } = ES.NanosecondsToDays(nanoseconds, relativeTo));
    } else {
      days = 0;
    }

    const sign = nanoseconds.lesser(0) ? -1 : 1;
    nanoseconds = nanoseconds.abs();
    microseconds = milliseconds = seconds = minutes = hours = bigInt.zero;

    switch (largestUnit) {
      case 'years':
      case 'months':
      case 'weeks':
      case 'days':
      case 'hours':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
        ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
        ({ quotient: minutes, remainder: seconds } = seconds.divmod(60));
        ({ quotient: hours, remainder: minutes } = minutes.divmod(60));
        break;
      case 'minutes':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
        ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
        ({ quotient: minutes, remainder: seconds } = seconds.divmod(60));
        break;
      case 'seconds':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
        ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
        break;
      case 'milliseconds':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
        break;
      case 'microseconds':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        break;
      case 'nanoseconds':
        break;
      default:
        throw new Error('assert not reached');
    }

    hours = hours.toJSNumber() * sign;
    minutes = minutes.toJSNumber() * sign;
    seconds = seconds.toJSNumber() * sign;
    milliseconds = milliseconds.toJSNumber() * sign;
    microseconds = microseconds.toJSNumber() * sign;
    nanoseconds = nanoseconds.toJSNumber() * sign;

    return { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  UnbalanceDurationRelative: (years, months, weeks, days, largestUnit, relativeTo) => {
    const TemporalDate = GetIntrinsic('%Temporal.PlainDate%');
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    const sign = ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);

    let calendar;
    if (relativeTo) {
      if (!(ES.IsTemporalDateTime(relativeTo) || ES.IsTemporalZonedDateTime(relativeTo))) {
        throw new TypeError('starting point must be PlainDateTime or ZonedDateTime');
      }
      calendar = GetSlot(relativeTo, CALENDAR);
    }

    const oneYear = new TemporalDuration(sign);
    const oneMonth = new TemporalDuration(0, sign);
    const oneWeek = new TemporalDuration(0, 0, sign);

    switch (largestUnit) {
      case 'years':
        // no-op
        break;
      case 'months':
        if (!calendar) throw new RangeError('a starting point is required for months balancing');
        // balance years down to months
        while (MathAbs(years) > 0) {
          const newRelativeTo = calendar.dateAdd(relativeTo, oneYear, {}, TemporalDate);
          const oneYearMonths = calendar.dateUntil(relativeTo, newRelativeTo, { largestUnit: 'months' }).months;
          relativeTo = newRelativeTo;
          months += oneYearMonths;
          years -= sign;
        }
        break;
      case 'weeks':
        if (!calendar) throw new RangeError('a starting point is required for weeks balancing');
        // balance years down to days
        while (MathAbs(years) > 0) {
          let oneYearDays;
          ({ relativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
          days += oneYearDays;
          years -= sign;
        }

        // balance months down to days
        while (MathAbs(months) > 0) {
          let oneMonthDays;
          ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
          days += oneMonthDays;
          months -= sign;
        }
        break;
      default:
        // balance years down to days
        while (MathAbs(years) > 0) {
          if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
          let oneYearDays;
          ({ relativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
          days += oneYearDays;
          years -= sign;
        }

        // balance months down to days
        while (MathAbs(months) > 0) {
          if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
          let oneMonthDays;
          ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
          days += oneMonthDays;
          months -= sign;
        }

        // balance weeks down to days
        while (MathAbs(weeks) > 0) {
          if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
          let oneWeekDays;
          ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
          days += oneWeekDays;
          weeks -= sign;
        }
        break;
    }

    return { years, months, weeks, days };
  },
  BalanceDurationRelative: (years, months, weeks, days, largestUnit, relativeTo) => {
    const TemporalDate = GetIntrinsic('%Temporal.PlainDate%');
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    const sign = ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
    if (sign === 0) return { years, months, weeks, days };

    let calendar;
    if (relativeTo) {
      if (!(ES.IsTemporalDateTime(relativeTo) || ES.IsTemporalZonedDateTime(relativeTo))) {
        throw new TypeError('starting point must be PlainDateTime or ZonedDateTime');
      }
      calendar = GetSlot(relativeTo, CALENDAR);
    }

    const oneYear = new TemporalDuration(sign);
    const oneMonth = new TemporalDuration(0, sign);
    const oneWeek = new TemporalDuration(0, 0, sign);

    switch (largestUnit) {
      case 'years': {
        if (!calendar) throw new RangeError('a starting point is required for years balancing');
        // balance days up to years
        let newRelativeTo, oneYearDays;
        ({ relativeTo: newRelativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
        while (MathAbs(days) >= MathAbs(oneYearDays)) {
          days -= oneYearDays;
          years += sign;
          relativeTo = newRelativeTo;
          ({ relativeTo: newRelativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
        }

        // balance days up to months
        let oneMonthDays;
        ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        while (MathAbs(days) >= MathAbs(oneMonthDays)) {
          days -= oneMonthDays;
          months += sign;
          relativeTo = newRelativeTo;
          ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        }

        // balance months up to years
        newRelativeTo = calendar.dateAdd(relativeTo, oneYear, {}, TemporalDate);
        let oneYearMonths = calendar.dateUntil(relativeTo, newRelativeTo, { largestUnit: 'months' }).months;
        while (MathAbs(months) >= MathAbs(oneYearMonths)) {
          months -= oneYearMonths;
          years += sign;
          relativeTo = newRelativeTo;
          newRelativeTo = calendar.dateAdd(relativeTo, oneYear, {}, TemporalDate);
          oneYearMonths = calendar.dateUntil(relativeTo, newRelativeTo, { largestUnit: 'months' }).months;
        }
        break;
      }
      case 'months': {
        if (!calendar) throw new RangeError('a starting point is required for months balancing');
        // balance days up to months
        let newRelativeTo, oneMonthDays;
        ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        while (MathAbs(days) >= MathAbs(oneMonthDays)) {
          days -= oneMonthDays;
          months += sign;
          relativeTo = newRelativeTo;
          ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        }
        break;
      }
      case 'weeks': {
        if (!calendar) throw new RangeError('a starting point is required for weeks balancing');
        // balance days up to weeks
        let newRelativeTo, oneWeekDays;
        ({ relativeTo: newRelativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
        while (MathAbs(days) >= MathAbs(oneWeekDays)) {
          days -= oneWeekDays;
          weeks += sign;
          relativeTo = newRelativeTo;
          ({ relativeTo: newRelativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
        }
        break;
      }
      default:
        // no-op
        break;
    }

    return { years, months, weeks, days };
  },
  CalculateOffsetShift: (relativeTo, y, mon, w, d, h, min, s, ms, µs, ns) => {
    if (ES.IsTemporalZonedDateTime(relativeTo)) {
      const instant = GetSlot(relativeTo, INSTANT);
      const timeZone = GetSlot(relativeTo, TIME_ZONE);
      const calendar = GetSlot(relativeTo, CALENDAR);
      const offsetBefore = ES.GetOffsetNanosecondsFor(timeZone, instant);
      const after = ES.AddZonedDateTime(instant, timeZone, calendar, y, mon, w, d, h, min, s, ms, µs, ns);
      const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
      const instantAfter = new TemporalInstant(after);
      const offsetAfter = ES.GetOffsetNanosecondsFor(timeZone, instantAfter);
      return offsetAfter - offsetBefore;
    }
    return 0;
  },

  ConstrainToRange: (value, min, max) => MathMin(max, MathMax(min, value)),
  ConstrainDate: (year, month, day) => {
    month = ES.ConstrainToRange(month, 1, 12);
    day = ES.ConstrainToRange(day, 1, ES.DaysInMonth(year, month));
    return { year, month, day };
  },
  ConstrainTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
    hour = ES.ConstrainToRange(hour, 0, 23);
    minute = ES.ConstrainToRange(minute, 0, 59);
    second = ES.ConstrainToRange(second, 0, 59);
    millisecond = ES.ConstrainToRange(millisecond, 0, 999);
    microsecond = ES.ConstrainToRange(microsecond, 0, 999);
    nanosecond = ES.ConstrainToRange(nanosecond, 0, 999);
    return { hour, minute, second, millisecond, microsecond, nanosecond };
  },
  ConstrainDateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    ({ year, month, day } = ES.ConstrainDate(year, month, day));
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    ));
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },

  RejectToRange: (value, min, max) => {
    if (value < min || value > max) throw new RangeError(`value out of range: ${min} <= ${value} <= ${max}`);
  },
  RejectDate: (year, month, day) => {
    ES.RejectToRange(month, 1, 12);
    ES.RejectToRange(day, 1, ES.DaysInMonth(year, month));
  },
  RejectDateRange: (year, month, day) => {
    // Noon avoids trouble at edges of DateTime range (excludes midnight)
    ES.RejectDateTimeRange(year, month, day, 12, 0, 0, 0, 0, 0);
  },
  RejectTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
    ES.RejectToRange(hour, 0, 23);
    ES.RejectToRange(minute, 0, 59);
    ES.RejectToRange(second, 0, 59);
    ES.RejectToRange(millisecond, 0, 999);
    ES.RejectToRange(microsecond, 0, 999);
    ES.RejectToRange(nanosecond, 0, 999);
  },
  RejectDateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    ES.RejectDate(year, month, day);
    ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
  },
  RejectDateTimeRange: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    ES.RejectToRange(year, YEAR_MIN, YEAR_MAX);
    // Reject any DateTime 24 hours or more outside the Instant range
    if (
      (year === YEAR_MIN &&
        null ==
          ES.GetEpochFromParts(year, month, day + 1, hour, minute, second, millisecond, microsecond, nanosecond - 1)) ||
      (year === YEAR_MAX &&
        null ==
          ES.GetEpochFromParts(year, month, day - 1, hour, minute, second, millisecond, microsecond, nanosecond + 1))
    ) {
      throw new RangeError('DateTime outside of supported range');
    }
  },
  RejectInstantRange: (epochNanoseconds) => {
    if (epochNanoseconds.lesser(NS_MIN) || epochNanoseconds.greater(NS_MAX)) {
      throw new RangeError('Instant outside of supported range');
    }
  },
  RejectYearMonthRange: (year, month) => {
    ES.RejectToRange(year, YEAR_MIN, YEAR_MAX);
    if (year === YEAR_MIN) {
      ES.RejectToRange(month, 4, 12);
    } else if (year === YEAR_MAX) {
      ES.RejectToRange(month, 1, 9);
    }
  },
  RejectDurationSign: (y, mon, w, d, h, min, s, ms, µs, ns) => {
    const sign = ES.DurationSign(y, mon, w, d, h, min, s, ms, µs, ns);
    for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
      const propSign = MathSign(prop);
      if (propSign !== 0 && propSign !== sign) throw new RangeError('mixed-sign values not allowed as duration fields');
    }
  },
  RejectDuration: (y, mon, w, d, h, min, s, ms, µs, ns) => {
    const sign = ES.DurationSign(y, mon, w, d, h, min, s, ms, µs, ns);
    for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
      if (!NumberIsFinite(prop)) throw new RangeError('infinite values not allowed as duration fields');
      const propSign = MathSign(prop);
      if (propSign !== 0 && propSign !== sign) throw new RangeError('mixed-sign values not allowed as duration fields');
    }
  },

  DifferenceDate: (y1, m1, d1, y2, m2, d2, largestUnit = 'days') => {
    switch (largestUnit) {
      case 'years':
      case 'months': {
        const sign = -ES.CompareTemporalDate(y1, m1, d1, y2, m2, d2);
        if (sign === 0) return { years: 0, months: 0, weeks: 0, days: 0 };

        const start = { year: y1, month: m1, day: d1 };
        const end = { year: y2, month: m2, day: d2 };

        let years = end.year - start.year;
        let mid = ES.AddDate(y1, m1, d1, years, 0, 0, 0, 'constrain');
        let midSign = -ES.CompareTemporalDate(mid.year, mid.month, mid.day, y2, m2, d2);
        if (midSign === 0) {
          return largestUnit === 'years'
            ? { years, months: 0, weeks: 0, days: 0 }
            : { years: 0, months: years * 12, weeks: 0, days: 0 };
        }
        let months = end.month - start.month;
        if (midSign !== sign) {
          years -= sign;
          months += sign * 12;
        }
        mid = ES.AddDate(y1, m1, d1, years, months, 0, 0, 'constrain');
        midSign = -ES.CompareTemporalDate(mid.year, mid.month, mid.day, y2, m2, d2);
        if (midSign === 0) {
          return largestUnit === 'years'
            ? { years, months, weeks: 0, days: 0 }
            : { years: 0, months: months + years * 12, weeks: 0, days: 0 };
        }
        if (midSign !== sign) {
          // The end date is later in the month than mid date (or earlier for
          // negative durations). Back up one month.
          months -= sign;
          if (months === -sign) {
            years -= sign;
            months = 11 * sign;
          }
          mid = ES.AddDate(y1, m1, d1, years, months, 0, 0, 'constrain');
          midSign = -ES.CompareTemporalDate(y1, m1, d1, mid.year, mid.month, mid.day);
        }

        let days = 0;
        // If we get here, months and years are correct (no overflow), and `mid`
        // is within the range from `start` to `end`. To count the days between
        // `mid` and `end`, there are 3 cases:
        // 1) same month: use simple subtraction
        // 2) end is previous month from intermediate (negative duration)
        // 3) end is next month from intermediate (positive duration)
        if (mid.month === end.month && mid.year === end.year) {
          // 1) same month: use simple subtraction
          days = end.day - mid.day;
        } else if (sign < 0) {
          // 2) end is previous month from intermediate (negative duration)
          // Example: intermediate: Feb 1, end: Jan 30, DaysInMonth = 31, days = -2
          days = -mid.day - (ES.DaysInMonth(end.year, end.month) - end.day);
        } else {
          // 3) end is next month from intermediate (positive duration)
          // Example: intermediate: Jan 29, end: Feb 1, DaysInMonth = 31, days = 3
          days = end.day + (ES.DaysInMonth(mid.year, mid.month) - mid.day);
        }

        if (largestUnit === 'months') {
          months += years * 12;
          years = 0;
        }
        return { years, months, weeks: 0, days };
      }
      case 'weeks':
      case 'days': {
        let larger, smaller, sign;
        if (ES.CompareTemporalDate(y1, m1, d1, y2, m2, d2) < 0) {
          smaller = { year: y1, month: m1, day: d1 };
          larger = { year: y2, month: m2, day: d2 };
          sign = 1;
        } else {
          smaller = { year: y2, month: m2, day: d2 };
          larger = { year: y1, month: m1, day: d1 };
          sign = -1;
        }
        let years = larger.year - smaller.year;
        let days =
          ES.DayOfYear(larger.year, larger.month, larger.day) - ES.DayOfYear(smaller.year, smaller.month, smaller.day);
        while (years > 0) {
          days += ES.LeapYear(smaller.year + years - 1) ? 366 : 365;
          years -= 1;
        }
        let weeks = 0;
        if (largestUnit === 'weeks') {
          weeks = MathFloor(days / 7);
          days %= 7;
        }
        weeks *= sign;
        days *= sign;
        return { years: 0, months: 0, weeks, days };
      }
      default:
        throw new Error('assert not reached');
    }
  },
  DifferenceTime: (h1, min1, s1, ms1, µs1, ns1, h2, min2, s2, ms2, µs2, ns2) => {
    let hours = h2 - h1;
    let minutes = min2 - min1;
    let seconds = s2 - s1;
    let milliseconds = ms2 - ms1;
    let microseconds = µs2 - µs1;
    let nanoseconds = ns2 - ns1;

    const sign = ES.DurationSign(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    hours *= sign;
    minutes *= sign;
    seconds *= sign;
    milliseconds *= sign;
    microseconds *= sign;
    nanoseconds *= sign;

    let deltaDays = 0;
    ({
      deltaDays,
      hour: hours,
      minute: minutes,
      second: seconds,
      millisecond: milliseconds,
      microsecond: microseconds,
      nanosecond: nanoseconds
    } = ES.BalanceTime(hours, minutes, seconds, milliseconds, microseconds, nanoseconds));

    deltaDays *= sign;
    hours *= sign;
    minutes *= sign;
    seconds *= sign;
    milliseconds *= sign;
    microseconds *= sign;
    nanoseconds *= sign;

    return { deltaDays, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  DifferenceInstant(ns1, ns2, increment, unit, roundingMode) {
    const diff = ns2.minus(ns1);

    const remainder = diff.mod(86400e9);
    const wholeDays = diff.minus(remainder);
    const roundedRemainder = ES.RoundNumberToIncrement(remainder, nsPerTimeUnit[unit] * increment, roundingMode);
    const roundedDiff = wholeDays.plus(roundedRemainder);

    const nanoseconds = +roundedDiff.mod(1e3);
    const microseconds = +roundedDiff.divide(1e3).mod(1e3);
    const milliseconds = +roundedDiff.divide(1e6).mod(1e3);
    const seconds = +roundedDiff.divide(1e9);
    return { seconds, milliseconds, microseconds, nanoseconds };
  },
  DifferenceDateTime: (
    y1,
    mon1,
    d1,
    h1,
    min1,
    s1,
    ms1,
    µs1,
    ns1,
    y2,
    mon2,
    d2,
    h2,
    min2,
    s2,
    ms2,
    µs2,
    ns2,
    calendar,
    largestUnit,
    options = {}
  ) => {
    const TemporalDate = GetIntrinsic('%Temporal.PlainDate%');
    let { deltaDays, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceTime(
      h1,
      min1,
      s1,
      ms1,
      µs1,
      ns1,
      h2,
      min2,
      s2,
      ms2,
      µs2,
      ns2
    );
    ({ year: y1, month: mon1, day: d1 } = ES.BalanceDate(y1, mon1, d1 + deltaDays));
    const date1 = new TemporalDate(y1, mon1, d1, calendar);
    const date2 = new TemporalDate(y2, mon2, d2, calendar);
    const dateLargestUnit = ES.LargerOfTwoTemporalDurationUnits('days', largestUnit);
    const untilOptions = { ...options, largestUnit: dateLargestUnit };
    let { years, months, weeks, days } = calendar.dateUntil(date1, date2, untilOptions);
    // Signs of date part and time part may not agree; balance them together
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      largestUnit
    ));
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  DifferenceZonedDateTime: (ns1, ns2, timeZone, calendar, largestUnit, options) => {
    const nsDiff = ns2.subtract(ns1);
    if (nsDiff.isZero()) {
      return {
        years: 0,
        months: 0,
        weeks: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
        microseconds: 0,
        nanoseconds: 0
      };
    }

    // Find the difference in dates only.
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const start = new TemporalInstant(ns1);
    const end = new TemporalInstant(ns2);
    const dtStart = ES.GetTemporalDateTimeFor(timeZone, start, calendar);
    const dtEnd = ES.GetTemporalDateTimeFor(timeZone, end, calendar);
    let { years, months, weeks, days } = ES.DifferenceDateTime(
      GetSlot(dtStart, ISO_YEAR),
      GetSlot(dtStart, ISO_MONTH),
      GetSlot(dtStart, ISO_DAY),
      GetSlot(dtStart, ISO_HOUR),
      GetSlot(dtStart, ISO_MINUTE),
      GetSlot(dtStart, ISO_SECOND),
      GetSlot(dtStart, ISO_MILLISECOND),
      GetSlot(dtStart, ISO_MICROSECOND),
      GetSlot(dtStart, ISO_NANOSECOND),
      GetSlot(dtEnd, ISO_YEAR),
      GetSlot(dtEnd, ISO_MONTH),
      GetSlot(dtEnd, ISO_DAY),
      GetSlot(dtEnd, ISO_HOUR),
      GetSlot(dtEnd, ISO_MINUTE),
      GetSlot(dtEnd, ISO_SECOND),
      GetSlot(dtEnd, ISO_MILLISECOND),
      GetSlot(dtEnd, ISO_MICROSECOND),
      GetSlot(dtEnd, ISO_NANOSECOND),
      calendar,
      largestUnit,
      options
    );
    let intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, years, months, weeks, 0, 0, 0, 0, 0, 0, 0);
    // may disambiguate
    let timeRemainderNs = ns2.subtract(intermediateNs);
    const TemporalZonedDateTime = GetIntrinsic('%Temporal.ZonedDateTime%');
    const intermediate = new TemporalZonedDateTime(intermediateNs, timeZone, calendar);
    ({ nanoseconds: timeRemainderNs, days } = ES.NanosecondsToDays(timeRemainderNs, intermediate));

    // Finally, merge the date and time durations and return the merged result.
    let { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
      0,
      0,
      0,
      0,
      0,
      0,
      timeRemainderNs,
      'hours'
    );
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  AddDate: (year, month, day, years, months, weeks, days, overflow) => {
    year += years;
    month += months;
    ({ year, month } = ES.BalanceYearMonth(year, month));
    ({ year, month, day } = ES.RegulateDate(year, month, day, overflow));
    days += 7 * weeks;
    day += days;
    ({ year, month, day } = ES.BalanceDate(year, month, day));
    return { year, month, day };
  },
  AddTime: (
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds
  ) => {
    hour += hours;
    minute += minutes;
    second += seconds;
    millisecond += milliseconds;
    microsecond += microseconds;
    nanosecond += nanoseconds;
    let deltaDays = 0;
    ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.BalanceTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    ));
    return { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  SubtractDate: (year, month, day, years, months, weeks, days, overflow) => {
    days += 7 * weeks;
    day -= days;
    ({ year, month, day } = ES.BalanceDate(year, month, day));
    month -= months;
    year -= years;
    ({ year, month } = ES.BalanceYearMonth(year, month));
    ({ year, month, day } = ES.RegulateDate(year, month, day, overflow));
    return { year, month, day };
  },
  AddDuration: (
    y1,
    mon1,
    w1,
    d1,
    h1,
    min1,
    s1,
    ms1,
    µs1,
    ns1,
    y2,
    mon2,
    w2,
    d2,
    h2,
    min2,
    s2,
    ms2,
    µs2,
    ns2,
    relativeTo
  ) => {
    const largestUnit1 = ES.DefaultTemporalLargestUnit(y1, mon1, w1, d1, h1, min1, s1, ms1, µs1, ns1);
    const largestUnit2 = ES.DefaultTemporalLargestUnit(y2, mon2, w2, d2, h2, min2, s2, ms2, µs2, ns2);
    const largestUnit = ES.LargerOfTwoTemporalDurationUnits(largestUnit1, largestUnit2);

    let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
    if (!relativeTo) {
      if (largestUnit === 'years' || largestUnit === 'months' || largestUnit === 'weeks') {
        throw new RangeError('relativeTo is required for years, months, or weeks arithmetic');
      }
      years = months = weeks = 0;
      ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
        d1 + d2,
        h1 + h2,
        min1 + min2,
        s1 + s2,
        ms1 + ms2,
        µs1 + µs2,
        ns1 + ns2,
        largestUnit
      ));
    } else if (ES.IsTemporalDateTime(relativeTo)) {
      const TemporalPlainDate = GetIntrinsic('%Temporal.PlainDate%');
      const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
      const calendar = GetSlot(relativeTo, CALENDAR);

      const datePart = new TemporalPlainDate(
        GetSlot(relativeTo, ISO_YEAR),
        GetSlot(relativeTo, ISO_MONTH),
        GetSlot(relativeTo, ISO_DAY),
        calendar
      );
      const dateDuration1 = new TemporalDuration(y1, mon1, w1, d1, 0, 0, 0, 0, 0, 0);
      const dateDuration2 = new TemporalDuration(y2, mon2, w2, d2, 0, 0, 0, 0, 0, 0);
      const dateAdd = calendar.dateAdd;
      const intermediate = ES.Call(dateAdd, calendar, [datePart, dateDuration1, {}, TemporalPlainDate]);
      const end = ES.Call(dateAdd, calendar, [intermediate, dateDuration2, {}, TemporalPlainDate]);

      const dateLargestUnit = ES.LargerOfTwoTemporalDurationUnits('days', largestUnit);
      ({ years, months, weeks, days } = calendar.dateUntil(datePart, end, { largestUnit: dateLargestUnit }));
      // Signs of date part and time part may not agree; balance them together
      ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
        days,
        h1 + h2,
        min1 + min2,
        s1 + s2,
        ms1 + ms2,
        µs1 + µs2,
        ns1 + ns2,
        largestUnit
      ));
    } else {
      // relativeTo is a ZonedDateTime
      const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
      const timeZone = GetSlot(relativeTo, TIME_ZONE);
      const calendar = GetSlot(relativeTo, CALENDAR);
      const intermediateNs = ES.AddZonedDateTime(
        GetSlot(relativeTo, INSTANT),
        timeZone,
        calendar,
        y1,
        mon1,
        w1,
        d1,
        h1,
        min1,
        s1,
        ms1,
        µs1,
        ns1
      );
      const endNs = ES.AddZonedDateTime(
        new TemporalInstant(intermediateNs),
        timeZone,
        calendar,
        y2,
        mon2,
        w2,
        d2,
        h2,
        min2,
        s2,
        ms2,
        µs2,
        ns2
      );
      if (largestUnit !== 'years' && largestUnit !== 'months' && largestUnit !== 'weeks' && largestUnit !== 'days') {
        // The user is only asking for a time difference, so return difference of instants.
        years = 0;
        months = 0;
        weeks = 0;
        days = 0;
        ({ seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
          GetSlot(relativeTo, EPOCHNANOSECONDS),
          endNs,
          1,
          'nanoseconds',
          'nearest'
        ));
        ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          0,
          0,
          0,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));
      } else {
        ({
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        } = ES.DifferenceZonedDateTime(GetSlot(relativeTo, EPOCHNANOSECONDS), endNs, timeZone, calendar, largestUnit));
      }
    }

    ES.RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  AddInstant: (epochNanoseconds, h, min, s, ms, µs, ns) => {
    let sum = bigInt.zero;
    sum = sum.plus(bigInt(ns));
    sum = sum.plus(bigInt(µs).multiply(1e3));
    sum = sum.plus(bigInt(ms).multiply(1e6));
    sum = sum.plus(bigInt(s).multiply(1e9));
    sum = sum.plus(bigInt(min).multiply(60 * 1e9));
    sum = sum.plus(bigInt(h).multiply(60 * 60 * 1e9));

    const result = bigInt(epochNanoseconds).plus(sum);
    ES.RejectInstantRange(result);
    return result;
  },
  AddDateTime: (
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    calendar,
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    options
  ) => {
    // Add the time part
    let deltaDays = 0;
    ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.AddTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    ));
    days += deltaDays;

    // Delegate the date part addition to the calendar
    const TemporalDate = GetIntrinsic('%Temporal.PlainDate%');
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    const datePart = new TemporalDate(year, month, day, calendar);
    const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
    const addedDate = calendar.dateAdd(datePart, dateDuration, options, TemporalDate);

    return {
      year: GetSlot(addedDate, ISO_YEAR),
      month: GetSlot(addedDate, ISO_MONTH),
      day: GetSlot(addedDate, ISO_DAY),
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    };
  },
  AddZonedDateTime: (instant, timeZone, calendar, years, months, weeks, days, h, min, s, ms, µs, ns, options) => {
    // If only time is to be added, then use Instant math. It's not OK to fall
    // through to the date/time code below because compatible disambiguation in
    // the PlainDateTime=>Instant conversion will change the offset of any
    // ZonedDateTime in the repeated clock time after a backwards transition.
    // When adding/subtracting time units and not dates, this disambiguation is
    // not expected and so is avoided below via a fast path for time-only
    // arithmetic.
    // BTW, this behavior is similar in spirit to offset: 'prefer' in `with`.
    if (ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0) === 0) {
      return ES.AddInstant(GetSlot(instant, EPOCHNANOSECONDS), h, min, s, ms, µs, ns);
    }

    // RFC 5545 requires the date portion to be added in calendar days and the
    // time portion to be added in exact time.
    let dt = ES.GetTemporalDateTimeFor(timeZone, instant, calendar);
    const TemporalDate = GetIntrinsic('%Temporal.PlainDate%');
    const datePart = new TemporalDate(GetSlot(dt, ISO_YEAR), GetSlot(dt, ISO_MONTH), GetSlot(dt, ISO_DAY), calendar);
    const addedDate = calendar.dateAdd(datePart, { years, months, weeks, days }, options, TemporalDate);
    const TemporalDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const dtIntermediate = new TemporalDateTime(
      GetSlot(addedDate, ISO_YEAR),
      GetSlot(addedDate, ISO_MONTH),
      GetSlot(addedDate, ISO_DAY),
      GetSlot(dt, ISO_HOUR),
      GetSlot(dt, ISO_MINUTE),
      GetSlot(dt, ISO_SECOND),
      GetSlot(dt, ISO_MILLISECOND),
      GetSlot(dt, ISO_MICROSECOND),
      GetSlot(dt, ISO_NANOSECOND),
      calendar
    );

    // Note that 'compatible' is used below because this disambiguation behavior
    // is required by RFC 5545.
    const instantIntermediate = ES.GetTemporalInstantFor(timeZone, dtIntermediate, 'compatible');
    return ES.AddInstant(GetSlot(instantIntermediate, EPOCHNANOSECONDS), h, min, s, ms, µs, ns);
  },
  RoundNumberToIncrement: (quantity, increment, mode) => {
    if (increment === 1) return quantity;
    let { quotient, remainder } = quantity.divmod(increment);
    if (remainder.equals(bigInt.zero)) return quantity;
    const sign = remainder.lt(bigInt.zero) ? -1 : 1;
    switch (mode) {
      case 'ceil':
        if (sign > 0) quotient = quotient.add(sign);
        break;
      case 'floor':
        if (sign < 0) quotient = quotient.add(sign);
        break;
      case 'trunc':
        // no change needed, because divmod is a truncation
        break;
      case 'nearest':
        // "half up away from zero"
        if (remainder.multiply(2).abs() >= increment) quotient = quotient.add(sign);
        break;
    }
    return quotient.multiply(increment);
  },
  RoundInstant: (epochNs, increment, unit, roundingMode) => {
    // Note: NonNegativeModulo, but with BigInt
    let remainder = epochNs.mod(86400e9);
    if (remainder.lesser(0)) remainder = remainder.plus(86400e9);
    const wholeDays = epochNs.minus(remainder);
    const roundedRemainder = ES.RoundNumberToIncrement(remainder, nsPerTimeUnit[unit] * increment, roundingMode);
    return wholeDays.plus(roundedRemainder);
  },
  RoundDateTime: (
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    increment,
    unit,
    roundingMode,
    dayLengthNs = 86400e9
  ) => {
    let deltaDays = 0;
    ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      increment,
      unit,
      roundingMode,
      dayLengthNs
    ));
    ({ year, month, day } = ES.BalanceDate(year, month, day + deltaDays));
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  RoundTime: (
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    increment,
    unit,
    roundingMode,
    dayLengthNs = 86400e9
  ) => {
    let quantity = bigInt.zero;
    switch (unit) {
      case 'day':
      case 'hour':
        quantity = bigInt(hour);
      // fall through
      case 'minute':
        quantity = quantity.multiply(60).plus(minute);
      // fall through
      case 'second':
        quantity = quantity.multiply(60).plus(second);
      // fall through
      case 'millisecond':
        quantity = quantity.multiply(1000).plus(millisecond);
      // fall through
      case 'microsecond':
        quantity = quantity.multiply(1000).plus(microsecond);
      // fall through
      case 'nanosecond':
        quantity = quantity.multiply(1000).plus(nanosecond);
    }
    const nsPerUnit = unit === 'day' ? dayLengthNs : nsPerTimeUnit[unit];
    const rounded = ES.RoundNumberToIncrement(quantity, nsPerUnit * increment, roundingMode);
    const result = rounded.divide(nsPerUnit).toJSNumber();
    switch (unit) {
      case 'day':
        return { deltaDays: result, hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
      case 'hour':
        return ES.BalanceTime(result, 0, 0, 0, 0, 0);
      case 'minute':
        return ES.BalanceTime(hour, result, 0, 0, 0, 0);
      case 'second':
        return ES.BalanceTime(hour, minute, result, 0, 0, 0);
      case 'millisecond':
        return ES.BalanceTime(hour, minute, second, result, 0, 0);
      case 'microsecond':
        return ES.BalanceTime(hour, minute, second, millisecond, result, 0);
      case 'nanosecond':
        return ES.BalanceTime(hour, minute, second, millisecond, microsecond, result);
    }
  },
  DaysUntil: (earlier, later) => {
    return ES.DifferenceDate(
      GetSlot(earlier, ISO_YEAR),
      GetSlot(earlier, ISO_MONTH),
      GetSlot(earlier, ISO_DAY),
      GetSlot(later, ISO_YEAR),
      GetSlot(later, ISO_MONTH),
      GetSlot(later, ISO_DAY),
      'days'
    ).days;
  },
  MoveRelativeDate: (calendar, relativeTo, duration) => {
    const TemporalDate = GetIntrinsic('%Temporal.PlainDate%');
    const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const later = calendar.dateAdd(relativeTo, duration, {}, TemporalDate);
    const days = ES.DaysUntil(relativeTo, later);
    relativeTo = new PlainDateTime(
      GetSlot(later, ISO_YEAR),
      GetSlot(later, ISO_MONTH),
      GetSlot(later, ISO_DAY),
      GetSlot(relativeTo, ISO_HOUR),
      GetSlot(relativeTo, ISO_MINUTE),
      GetSlot(relativeTo, ISO_SECOND),
      GetSlot(relativeTo, ISO_MILLISECOND),
      GetSlot(relativeTo, ISO_MICROSECOND),
      GetSlot(relativeTo, ISO_NANOSECOND),
      GetSlot(relativeTo, CALENDAR)
    );
    return { relativeTo, days };
  },
  MoveRelativeZonedDateTime: (relativeTo, years, months, weeks, days) => {
    const timeZone = GetSlot(relativeTo, TIME_ZONE);
    const calendar = GetSlot(relativeTo, CALENDAR);
    const intermediateNs = ES.AddZonedDateTime(
      GetSlot(relativeTo, INSTANT),
      timeZone,
      calendar,
      years,
      months,
      weeks,
      days,
      0,
      0,
      0,
      0,
      0,
      0
    );
    const TemporalZonedDateTime = GetIntrinsic('%Temporal.ZonedDateTime%');
    return new TemporalZonedDateTime(intermediateNs, timeZone, calendar);
  },
  AdjustRoundedDurationDays: (
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    increment,
    unit,
    roundingMode,
    relativeTo
  ) => {
    if (
      !ES.IsTemporalZonedDateTime(relativeTo) ||
      unit === 'years' ||
      unit === 'months' ||
      unit === 'weeks' ||
      unit === 'days' ||
      (unit === 'nanoseconds' && increment === 1)
    ) {
      return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
    }

    // There's one more round of rounding possible: if relativeTo is a
    // ZonedDateTime, the time units could have rounded up into enough hours
    // to exceed the day length. If this happens, grow the date part by a
    // single day and re-run exact time rounding on the smaller remainder. DO
    // NOT RECURSE, because once the extra hours are sucked up into the date
    // duration, there's no way for another full day to come from the next
    // round of rounding. And if it were possible (e.g. contrived calendar
    // with 30-minute-long "days") then it'd risk an infinite loop.
    let timeRemainderNs = ES.TotalDurationNanoseconds(
      0,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      0
    );
    const direction = MathSign(timeRemainderNs.toJSNumber());

    const timeZone = GetSlot(relativeTo, TIME_ZONE);
    const calendar = GetSlot(relativeTo, CALENDAR);
    const dayStart = ES.AddZonedDateTime(
      GetSlot(relativeTo, INSTANT),
      timeZone,
      calendar,
      years,
      months,
      weeks,
      days,
      0,
      0,
      0,
      0,
      0,
      0
    );
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const dayEnd = ES.AddZonedDateTime(
      new TemporalInstant(dayStart),
      timeZone,
      calendar,
      0,
      0,
      0,
      direction,
      0,
      0,
      0,
      0,
      0,
      0
    );
    const dayLengthNs = dayEnd.subtract(dayStart);

    if (timeRemainderNs.subtract(dayLengthNs).multiply(direction).geq(0)) {
      ({ years, months, weeks, days } = ES.AddDuration(
        years,
        months,
        weeks,
        days,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        direction,
        0,
        0,
        0,
        0,
        0,
        0,
        relativeTo
      ));
      timeRemainderNs = ES.RoundInstant(timeRemainderNs.subtract(dayLengthNs), increment, unit, roundingMode);
      ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
        0,
        0,
        0,
        0,
        0,
        0,
        timeRemainderNs.toJSNumber(),
        'hours'
      ));
    }
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  RoundDuration: (
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    increment,
    unit,
    roundingMode,
    relativeTo = undefined
  ) => {
    const TemporalDate = GetIntrinsic('%Temporal.PlainDate%');
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    let calendar, zdtRelative;
    if (relativeTo) {
      if (ES.IsTemporalZonedDateTime(relativeTo)) {
        zdtRelative = relativeTo;
        relativeTo = ES.GetTemporalDateTimeFor(
          GetSlot(relativeTo, TIME_ZONE),
          GetSlot(relativeTo, INSTANT),
          GetSlot(relativeTo, CALENDAR)
        );
      } else if (!ES.IsTemporalDateTime(relativeTo)) {
        throw new TypeError('starting point must be PlainDateTime or ZonedDateTime');
      }
      calendar = GetSlot(relativeTo, CALENDAR);
    }

    // First convert time units up to days, if rounding to days or higher units.
    // If rounding relative to a ZonedDateTime, then some days may not be 24h.
    let dayLengthNs;
    if (unit === 'years' || unit === 'months' || unit === 'weeks' || unit === 'days') {
      nanoseconds = ES.TotalDurationNanoseconds(0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, 0);
      let intermediate;
      if (zdtRelative) {
        intermediate = ES.MoveRelativeZonedDateTime(zdtRelative, years, months, weeks, days);
      }
      let deltaDays;
      ({ days: deltaDays, nanoseconds, dayLengthNs } = ES.NanosecondsToDays(nanoseconds, intermediate));
      dayLengthNs = MathAbs(dayLengthNs);
      days += deltaDays;
      hours = minutes = seconds = milliseconds = microseconds = 0;
    }

    let total;
    switch (unit) {
      case 'years': {
        if (!calendar) throw new RangeError('A starting point is required for years rounding');

        // convert months and weeks to days by calculating difference(
        // relativeTo + years, relativeTo + { years, months, weeks })
        const yearsLater = calendar.dateAdd(relativeTo, new TemporalDuration(years), {}, TemporalDate);
        const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
        const yearsMonthsWeeksLater = calendar.dateAdd(relativeTo, yearsMonthsWeeks, {}, TemporalDate);
        const monthsWeeksInDays = ES.DaysUntil(yearsLater, yearsMonthsWeeksLater);
        relativeTo = yearsLater;
        days += monthsWeeksInDays;

        // Years may be different lengths of days depending on the calendar, so
        // we need to convert days to years in a loop. We get the number of days
        // in the one-year period after (or preceding, depending on the sign of
        // the duration) the relativeTo date, and convert that number of days to
        // one year, repeating until the number of days is less than a year.
        const sign = MathSign(days);
        const oneYear = new TemporalDuration(days < 0 ? -1 : 1);
        let oneYearDays;
        ({ relativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
        while (MathAbs(days) >= MathAbs(oneYearDays)) {
          years += sign;
          days -= oneYearDays;
          ({ relativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
        }
        // Note that `nanoseconds` below (here and in similar code for months,
        // weeks, and days further below) isn't actually nanoseconds for the
        // full date range.  Instead, it's a BigInt representation of total
        // days multiplied by the number of nanoseconds in the last day of
        // the duration. This lets us do days-or-larger rounding using BigInt
        // math which reduces precision loss.
        oneYearDays = MathAbs(oneYearDays);
        const divisor = bigInt(oneYearDays).multiply(dayLengthNs);
        nanoseconds = divisor.multiply(years).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        total = nanoseconds.toJSNumber() / divisor;
        years = rounded.divide(divisor).toJSNumber();
        nanoseconds = months = weeks = days = 0;
        break;
      }
      case 'months': {
        if (!calendar) throw new RangeError('A starting point is required for months rounding');

        // convert weeks to days by calculating difference(relativeTo +
        //   { years, months }, relativeTo + { years, months, weeks })
        const yearsMonths = new TemporalDuration(years, months);
        const yearsMonthsLater = calendar.dateAdd(relativeTo, yearsMonths, {}, TemporalDate);
        const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
        const yearsMonthsWeeksLater = calendar.dateAdd(relativeTo, yearsMonthsWeeks, {}, TemporalDate);
        const weeksInDays = ES.DaysUntil(yearsMonthsLater, yearsMonthsWeeksLater);
        relativeTo = yearsMonthsLater;
        days += weeksInDays;

        // Months may be different lengths of days depending on the calendar,
        // convert days to months in a loop as described above under 'years'.
        const sign = MathSign(days);
        const oneMonth = new TemporalDuration(0, days < 0 ? -1 : 1);
        let oneMonthDays;
        ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        while (MathAbs(days) >= MathAbs(oneMonthDays)) {
          months += sign;
          days -= oneMonthDays;
          ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        }
        oneMonthDays = MathAbs(oneMonthDays);
        const divisor = bigInt(oneMonthDays).multiply(dayLengthNs);
        nanoseconds = divisor.multiply(months).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        total = nanoseconds.toJSNumber() / divisor;
        months = rounded.divide(divisor).toJSNumber();
        nanoseconds = weeks = days = 0;
        break;
      }
      case 'weeks': {
        if (!calendar) throw new RangeError('A starting point is required for weeks rounding');
        // Weeks may be different lengths of days depending on the calendar,
        // convert days to weeks in a loop as described above under 'years'.
        const sign = MathSign(days);
        const oneWeek = new TemporalDuration(0, 0, days < 0 ? -1 : 1);
        let oneWeekDays;
        ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
        while (MathAbs(days) >= MathAbs(oneWeekDays)) {
          weeks += sign;
          days -= oneWeekDays;
          ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
        }
        oneWeekDays = MathAbs(oneWeekDays);
        const divisor = bigInt(oneWeekDays).multiply(dayLengthNs);
        nanoseconds = divisor.multiply(weeks).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        total = nanoseconds.toJSNumber() / divisor;
        weeks = rounded.divide(divisor).toJSNumber();
        nanoseconds = days = 0;
        break;
      }
      case 'days': {
        const divisor = bigInt(dayLengthNs);
        nanoseconds = divisor.multiply(days).plus(nanoseconds);
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        total = nanoseconds.toJSNumber() / divisor;
        days = rounded.divide(divisor).toJSNumber();
        nanoseconds = 0;
        break;
      }
      case 'hours': {
        const divisor = 3600e9;
        nanoseconds = bigInt(hours)
          .multiply(3600e9)
          .plus(bigInt(minutes).multiply(60e9))
          .plus(bigInt(seconds).multiply(1e9))
          .plus(bigInt(milliseconds).multiply(1e6))
          .plus(bigInt(microseconds).multiply(1e3))
          .plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        hours = rounded.divide(divisor).toJSNumber();
        minutes = seconds = milliseconds = microseconds = nanoseconds = 0;
        break;
      }
      case 'minutes': {
        const divisor = 60e9;
        nanoseconds = bigInt(minutes)
          .multiply(60e9)
          .plus(bigInt(seconds).multiply(1e9))
          .plus(bigInt(milliseconds).multiply(1e6))
          .plus(bigInt(microseconds).multiply(1e3))
          .plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        minutes = rounded.divide(divisor).toJSNumber();
        seconds = milliseconds = microseconds = nanoseconds = 0;
        break;
      }
      case 'seconds': {
        const divisor = 1e9;
        nanoseconds = bigInt(seconds)
          .multiply(1e9)
          .plus(bigInt(milliseconds).multiply(1e6))
          .plus(bigInt(microseconds).multiply(1e3))
          .plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        seconds = rounded.divide(divisor).toJSNumber();
        milliseconds = microseconds = nanoseconds = 0;
        break;
      }
      case 'milliseconds': {
        const divisor = 1e6;
        nanoseconds = bigInt(milliseconds).multiply(1e6).plus(bigInt(microseconds).multiply(1e3)).plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        milliseconds = rounded.divide(divisor).toJSNumber();
        microseconds = nanoseconds = 0;
        break;
      }
      case 'microseconds': {
        const divisor = 1e3;
        nanoseconds = bigInt(microseconds).multiply(1e3).plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        microseconds = rounded.divide(divisor).toJSNumber();
        nanoseconds = 0;
        break;
      }
      case 'nanoseconds': {
        total = nanoseconds;
        nanoseconds = ES.RoundNumberToIncrement(bigInt(nanoseconds), increment, roundingMode);
        break;
      }
    }
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, total };
  },

  CompareTemporalDate: (y1, m1, d1, y2, m2, d2) => {
    for (const [x, y] of [
      [y1, y2],
      [m1, m2],
      [d1, d2]
    ]) {
      if (x !== y) return ES.ComparisonResult(x - y);
    }
    return 0;
  },

  AssertPositiveInteger: (num) => {
    if (!NumberIsFinite(num) || MathAbs(num) !== num) throw new RangeError(`invalid positive integer: ${num}`);
    return num;
  },
  NonNegativeModulo: (x, y) => {
    let result = x % y;
    if (ObjectIs(result, -0)) return 0;
    if (result < 0) result += y;
    return result;
  },
  ToBigInt: (arg) => {
    if (bigInt.isInstance(arg)) {
      return arg;
    }

    const prim = ES.ToPrimitive(arg, Number);
    switch (typeof prim) {
      case 'undefined':
      case 'object':
      case 'number':
      case 'symbol':
        throw new TypeError(`cannot convert ${typeof arg} to bigint`);
      case 'string':
        if (!prim.match(/^\s*(?:[+-]?\d+\s*)?$/)) {
          throw new SyntaxError('invalid BigInt syntax');
        }
      // eslint: no-fallthrough: false
      case 'bigint':
        try {
          return bigInt(prim);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('Invalid integer')) throw new SyntaxError(e.message);
          throw e;
        }
      case 'boolean':
        if (prim) {
          return bigInt(1);
        } else {
          return bigInt.zero;
        }
    }
  },

  // Note: This method returns values with bogus nanoseconds based on the previous iteration's
  // milliseconds. That way there is a guarantee that the full nanoseconds are always going to be
  // increasing at least and that the microsecond and nanosecond fields are likely to be non-zero.
  SystemUTCEpochNanoSeconds: (() => {
    let ns = Date.now() % 1e6;
    return () => {
      const ms = Date.now();
      const result = bigInt(ms).multiply(1e6).plus(ns);
      ns = ms % 1e6;
      return result;
    };
  })(),
  SystemTimeZone: () => {
    const fmt = new IntlDateTimeFormat('en-us');
    const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
    return new TemporalTimeZone(ES.TemporalTimeZoneFromString(fmt.resolvedOptions().timeZone));
  },
  ComparisonResult: (value) => (value < 0 ? -1 : value > 0 ? 1 : value),
  NormalizeOptionsObject: (options) => {
    if (options === undefined) return ObjectCreate(null);
    if (ES.Type(options) === 'Object') return options;
    throw new TypeError(
      `Options parameter must be an object, not ${options === null ? 'null' : `a ${typeof options}`}`
    );
  },
  GetOption: (options, property, allowedValues, fallback) => {
    let value = options[property];
    if (value !== undefined) {
      value = ES.ToString(value);
      if (!allowedValues.includes(value)) {
        throw new RangeError(`${property} must be one of ${allowedValues.join(', ')}, not ${value}`);
      }
      return value;
    }
    return fallback;
  },
  GetNumberOption: (options, property, minimum, maximum, fallback) => {
    let value = options[property];
    if (value === undefined) return fallback;
    value = ES.ToNumber(value);
    if (NumberIsNaN(value) || value < minimum || value > maximum) {
      throw new RangeError(`${property} must be between ${minimum} and ${maximum}, not ${value}`);
    }
    return MathFloor(value);
  },
  // Following two operations are overridden because the es-abstract version of
  // ES.Get() unconditionally uses util.inspect
  LengthOfArrayLike: (obj) => {
    if (ES.Type(obj) !== 'Object') {
      throw new TypeError('Assertion failed: `obj` must be an Object');
    }
    return ES.ToLength(obj.length);
  },
  CreateListFromArrayLike: (obj, elementTypes) => {
    if (ES.Type(obj) !== 'Object') {
      throw new TypeError('Assertion failed: `obj` must be an Object');
    }
    if (!ArrayIsArray(elementTypes)) {
      throw new TypeError('Assertion failed: `elementTypes`, if provided, must be an array');
    }
    var len = ES.LengthOfArrayLike(obj);
    var list = [];
    var index = 0;
    while (index < len) {
      var indexName = ES.ToString(index);
      var next = obj[indexName];
      var nextType = ES.Type(next);
      if (ArrayPrototypeIndexOf.call(elementTypes, nextType) < 0) {
        throw new TypeError(`item type ${nextType} is not a valid elementType`);
      }
      ArrayPrototypePush.call(list, next);
      index += 1;
    }
    return list;
  }
});

const OFFSET = new RegExp(`^${PARSE.offset.source}$`);

function bisect(getState, left, right, lstate = getState(left), rstate = getState(right)) {
  left = bigInt(left);
  right = bigInt(right);
  while (right.minus(left).greater(1)) {
    let middle = left.plus(right).divide(2);
    const mstate = getState(middle);
    if (mstate === lstate) {
      left = middle;
      lstate = mstate;
    } else if (mstate === rstate) {
      right = middle;
      rstate = mstate;
    } else {
      throw new Error(`invalid state in bisection ${lstate} - ${mstate} - ${rstate}`);
    }
  }
  return right;
}
function bigIntIfAvailable(wrapper) {
  return typeof BigInt === 'undefined' ? wrapper : wrapper.value;
}

const nsPerTimeUnit = {
  hour: 3600e9,
  hours: 3600e9,
  minute: 60e9,
  minutes: 60e9,
  second: 1e9,
  seconds: 1e9,
  millisecond: 1e6,
  milliseconds: 1e6,
  microsecond: 1e3,
  microseconds: 1e3,
  nanosecond: 1,
  nanoseconds: 1
};
