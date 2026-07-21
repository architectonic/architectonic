# Release

Every package publishes from its default branch through npm trusted publishing.

A release commit must:

1. pass source validation;
2. build generated surfaces when applicable;
3. create the exact npm tarball;
4. extract and validate that tarball;
5. compare `package.json` with the npm registry;
6. publish only when the version is new;
7. verify that the registry returns the expected version.

The workflow is idempotent. Re-running a commit whose version is already published must succeed without attempting a duplicate publication.

The protocol version and package version are separate. Architectonic 0.2 packages declare protocol `0.2.0`; future package patches may remain protocol-compatible.
