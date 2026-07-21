# Operations

Copy `.env.example` to `.env`, replace secrets, run `scripts/bootstrap.sh` once, and apply reviewed migrations with `scripts/migrate.sh`. `start.sh` does not mutate data or kill unrelated processes. The force-recreate demo seed requires `CONFIRM_DEMO_SEED=yes` and an explicit password.

The governed API is `/api/governed-review`. It stores tenant-isolated matter/document versions, object checksums, clause citations, normalized obligations, comparisons, integration outcomes, and attorney decisions. OCR/storage, e-signature, calendar, matter/accounting adapters, privilege and retention policy review, reviewed-lease accuracy benchmarks, and attorney validation remain external gates. Model output cannot approve or execute a lease.
