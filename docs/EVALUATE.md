# Evaluate Architectonic

Do not infer capability from stars, forks, branding, or README confidence.

1. Run `npm test` in the CLI repository.
2. Run `npm run pack:verify` and confirm the packed artifact passes its self-check.
3. Initialize the `knowledge-system` profile and confirm that only its five declared layers are installed.
4. Run `architectonic map` and inspect whether canonical entries are easier to locate than ordinary repository search.
5. Remove a canonical entry and confirm `architectonic verify` fails with a non-zero exit status.
6. Modify an npm-installed layer and confirm `architectonic upgrade` refuses to overwrite it.
7. Inspect `architectonic.json` and each `architectonic.protocol.json` without using the CLI.
8. Remove the CLI and confirm that the organization remains readable.

Adopt Architectonic only when these mechanisms improve the specific organization being evaluated.
