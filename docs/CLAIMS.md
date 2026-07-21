# Claims and evidence

| Claim | Status | Evidence | Limitation |
|---|---|---|---|
| The CLI installs full and partial profiles without expanding `add constitution` into the full system. | mechanism demonstrated | `test/cli.test.js` | Tests use local fixture repositories. |
| `verify` exposes missing canonical entries and exits non-zero in JSON mode. | mechanism demonstrated | `test/cli.test.js` | Conformance does not prove domain truth. |
| `map` exposes canonical layer entry points. | mechanism demonstrated | `test/cli.test.js` | It maps declared entries; it does not rank every file in a project. |
| Guarded upgrades avoid overwriting locally modified npm layers. | mechanism demonstrated | CLI integrity checks | Deliberate migrations still require review. |
| Architectonic can reduce repository reconstruction work or unsupported assumptions. | design objective / internally observed | benchmark program pending | No universal or independently replicated result is claimed. |

Future performance claims must link to raw runs, task fixtures, model metadata, scoring code, dates, and limitations.
