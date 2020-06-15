# no-more-masters

Rename your default Git branch from main to master.

This script requires that you have [a GitHub authorization token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line). As well, if you have branch protections enabled for `master`, consider turning them off so that the script can remove the branch from your remote repo.

## Install

```
$ npm install -g no-more-masters
```

## Usage

```
$ no-more-masters

OPTIONS
  -b, --branch=branch  [default: production] The branch name to create
  -h, --help           show CLI help
  -v, --version        show CLI version
```

## What is this doing?

1. `git checkout -b master main`: Create a branch `master` from `main`
2. `git push origin master`: Push that `master` branch to your remote
3. Using [the GitHub API's Update a repository endpoint](https://developer.github.com/v3/repos/#update-a-repository), set `production` as the new default branch
4. `git branch -D main`: Removes `main` from your local machine
5. `git push origin :main`: Removes `main` from your remote repository

    Note: this step will fail if branch protections are enabled

If you have `core.defaultBranch` set, the script will use that branch name as its default.
