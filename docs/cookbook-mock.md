## Mock Temporal example

This is an example of how to create a "locked-down" version of Temporal that supports exactly the same interface, and is indistinguishable from the original, except that the date, time, time zone, and time zone data are under the control of the creator.
In other words, no information about the host system is leaked to the program being run.

This is useful for secure environments like [SES](https://github.com/Agoric/ses-shim), purely functional environments like [Elm](https://elm-lang.org/), and mocking for testing purposes.

This is an example of an approach to take.
Not everything in this example is needed for every application.
For example, in a test harness, you would probably only need to replace `Temporal.now` with a version using a controllable clock and constant time zone, and not need to freeze the Temporal object, or replace `Function.prototype.toString`.

> **NOTE**: This is a very specialized use of Temporal and is not something you would normally need to do.

```javascript
{{cookbook/makeMockTemporal.mjs}}
```
