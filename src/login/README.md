# Shared login module

This folder is based on the shared `prsk-calc/src/login` implementation.
It owns authentication, account profile UI, storage API access, account-state
sync, conflict handling, and all related styles.

App-specific API URLs, cache keys, storage namespaces, and local-state adapters
must be supplied outside this folder. To update login behavior or UI, edit one
copy, port the shared change to the other projects, and retain the
`sekai-force` strict-lint annotation and last-moment local-storage reread.
