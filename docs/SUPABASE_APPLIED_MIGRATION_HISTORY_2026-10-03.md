# Applied Supabase migration history recovered on 3 October 2026

Production project: `hqysjumypgeapgmqkcrx`.

This source-only reconciliation adds 29 migration versions that already appear in
`supabase_migrations.schema_migrations` in production. The SQL was recovered
from the recorded `statements` array in that table. The files must not be
executed again against production. No database object or row was changed by
this reconciliation.

For 27 versions, the table records one statement and the new file is the exact
UTF-8 byte sequence of that statement. Versions `20260922130000` and
`20260926113327` record 5 and 34 statements respectively; their files retain
every stored statement byte-for-byte and in order, with a single newline
between array elements. The original inter-statement separators are not
recoverable from the database history.

At the time of recovery, the database recorded 76 applied versions and the
protected tree had 62 migration files. The 29 versions added here were absent
by migration name. The 3 October versions `20261003064551` and
`20261003071017` were already present in Git and were not re-applied.

Other historical source/history differences remain subject to a separate
byte-level audit: 13 applied migrations have a different timestamp from the
same-named Git file, and some existing same-named files differ in whitespace
or SQL text from the statements stored by Supabase. This commit does not rename
or overwrite those pre-existing files, and does not assert complete migration
parity. A production migration runner must compare applied version history
before considering any pending migration.
