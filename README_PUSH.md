This repo includes a helper script to stage, commit, rebase, and push local changes to GitHub.

Script: `scripts/push_to_github.sh`

Quick usage:

```bash
# Run with defaults (remote = https://github.com/vidyavarshinig15/fruit-vegetable-erp.git, branch = main)
./scripts/push_to_github.sh

# Or specify remote and branch
./scripts/push_to_github.sh git@github.com:vidyavarshinig15/fruit-vegetable-erp.git feat/my-change
```

Notes:
- The script will overwrite any existing `origin` remote in your local repo.
- It will attempt a `git pull --rebase` if the remote branch exists to avoid merge commits.
- The script does not rotate or remove secrets. Do NOT commit secrets; use `backend/.env.example` as a template and store real secrets in your hosting provider.
