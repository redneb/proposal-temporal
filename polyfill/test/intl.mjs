import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import Assert from 'assert';
const { deepEqual, equal } = Assert;

import { DateTimeFormat } from '../lib/intl.mjs';
Intl.DateTimeFormat = DateTimeFormat;
import * as Temporal from 'tc39-temporal';

describe('Intl', ()=>{
    describe('absolute.toLocaleString()', ()=>{
        const absolute = Temporal.Absolute.from('1976-11-18T14:23:30Z');
        it(`(${absolute.toString()}).toLocaleString('en-US', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${absolute.toLocaleString('en', { timeZone: 'America/New_York' })}`, '11/18/1976, 9:23:30 AM'));
        it(`(${absolute.toString()}).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${absolute.toLocaleString('de', { timeZone: 'Europe/Vienna' })}`, '18.11.1976, 15:23:30'));
    });
    describe('datetime.toLocaleString()', ()=>{
        const datetime = Temporal.DateTime.from('1976-11-18T15:23:30');
        it(`(${datetime.toString()}).toLocaleString('en-US', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${datetime.toLocaleString('en', { timeZone: 'America/New_York' })}`, '11/18/1976, 3:23:30 PM'));
        it(`(${datetime.toString()}).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${datetime.toLocaleString('de', { timeZone: 'Europe/Vienna' })}`, '18.11.1976, 15:23:30'));
    });
    describe('time.toLocaleString()', ()=>{
        const time = Temporal.Time.from('1976-11-18T15:23:30');
        it(`(${time.toString()}).toLocaleString('en-US', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${time.toLocaleString('en', { timeZone: 'America/New_York' })}`, '3:23:30 PM'));
        it(`(${time.toString()}).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${time.toLocaleString('de', { timeZone: 'Europe/Vienna' })}`, '15:23:30'));
    });
    describe('date.toLocaleString()', ()=>{
        const date = Temporal.Date.from('1976-11-18T15:23:30');
        it(`(${date.toString()}).toLocaleString('en-US', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${date.toLocaleString('en', { timeZone: 'America/New_York' })}`, '11/18/1976'));
        it(`(${date.toString()}).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${date.toLocaleString('de', { timeZone: 'Europe/Vienna' })}`, '18.11.1976'));
    });
    describe('yearmonth.toLocaleString()', ()=>{
        const yearmonth = Temporal.YearMonth.from('1976-11-18T15:23:30');
        it(`(${yearmonth.toString()}).toLocaleString('en-US', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${yearmonth.toLocaleString('en', { timeZone: 'America/New_York' })}`, '11/1976'));
        it(`(${yearmonth.toString()}).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${yearmonth.toLocaleString('de', { timeZone: 'Europe/Vienna' })}`, '11.1976'));
    });
    describe('monthday.toLocaleString()', ()=>{
        const monthday = Temporal.MonthDay.from('1976-11-18T15:23:30');
        it(`(${monthday.toString()}).toLocaleString('en-US', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${monthday.toLocaleString('en', { timeZone: 'America/New_York' })}`, '11/18'));
        it(`(${monthday.toString()}).toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })`, ()=>equal(`${monthday.toLocaleString('de', { timeZone: 'Europe/Vienna' })}`, '18.11.'));
    });

    const us = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York' });
    const at = new Intl.DateTimeFormat('de-AT', { timeZone: 'Europe/Vienna' });
    it('formatRange(absolute)', () => {
        const t1 = Temporal.Absolute.from('1976-11-18T14:23:30Z');
        const t2 = Temporal.Absolute.from('2020-02-20T15:44:56-08:00[America/New_York]');
        equal(us.formatRange(t1, t2), '11/18/1976, 9:23:30 AM – 2/20/2020, 3:44:56 PM');
        equal(at.formatRange(t1, t2), '18.11.1976, 15:23:30 – 20.2.2020, 21:44:56');
    });
    it('formatRangeToParts(absolute)', () => {
        const t1 = Temporal.Absolute.from('1976-11-18T14:23:30Z');
        const t2 = Temporal.Absolute.from('2020-02-20T15:44:56-08:00[America/New_York]');
        deepEqual(us.formatRangeToParts(t1, t2), [
            { type: 'month', value: '11', source: 'startRange' },
            { type: 'literal', value: '/', source: 'startRange' },
            { type: 'day', value: '18', source: 'startRange' },
            { type: 'literal', value: '/', source: 'startRange' },
            { type: 'year', value: '1976', source: 'startRange' },
            { type: 'literal', value: ', ', source: 'startRange' },
            { type: 'hour', value: '9', source: 'startRange' },
            { type: 'literal', value: ':', source: 'startRange' },
            { type: 'minute', value: '23', source: 'startRange' },
            { type: 'literal', value: ':', source: 'startRange' },
            { type: 'second', value: '30', source: 'startRange' },
            { type: 'literal', value: ' ', source: 'startRange' },
            { type: 'dayPeriod', value: 'AM', source: 'startRange' },
            { type: 'literal', value: ' – ', source: 'shared' },
            { type: 'month', value: '2', source: 'endRange' },
            { type: 'literal', value: '/', source: 'endRange' },
            { type: 'day', value: '20', source: 'endRange' },
            { type: 'literal', value: '/', source: 'endRange' },
            { type: 'year', value: '2020', source: 'endRange' },
            { type: 'literal', value: ', ', source: 'endRange' },
            { type: 'hour', value: '3', source: 'endRange' },
            { type: 'literal', value: ':', source: 'endRange' },
            { type: 'minute', value: '44', source: 'endRange' },
            { type: 'literal', value: ':', source: 'endRange' },
            { type: 'second', value: '56', source: 'endRange' },
            { type: 'literal', value: ' ', source: 'endRange' },
            { type: 'dayPeriod', value: 'PM', source: 'endRange' },
        ]);
        deepEqual(at.formatRangeToParts(t1, t2), [
            { type: 'day', value: '18', source: 'startRange' },
            { type: 'literal', value: '.', source: 'startRange' },
            { type: 'month', value: '11', source: 'startRange' },
            { type: 'literal', value: '.', source: 'startRange' },
            { type: 'year', value: '1976', source: 'startRange' },
            { type: 'literal', value: ', ', source: 'startRange' },
            { type: 'hour', value: '15', source: 'startRange' },
            { type: 'literal', value: ':', source: 'startRange' },
            { type: 'minute', value: '23', source: 'startRange' },
            { type: 'literal', value: ':', source: 'startRange' },
            { type: 'second', value: '30', source: 'startRange' },
            { type: 'literal', value: ' – ', source: 'shared' },
            { type: 'day', value: '20', source: 'endRange' },
            { type: 'literal', value: '.', source: 'endRange' },
            { type: 'month', value: '2', source: 'endRange' },
            { type: 'literal', value: '.', source: 'endRange' },
            { type: 'year', value: '2020', source: 'endRange' },
            { type: 'literal', value: ', ', source: 'endRange' },
            { type: 'hour', value: '21', source: 'endRange' },
            { type: 'literal', value: ':', source: 'endRange' },
            { type: 'minute', value: '44', source: 'endRange' },
            { type: 'literal', value: ':', source: 'endRange' },
            { type: 'second', value: '56', source: 'endRange' }
        ]);
    });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}