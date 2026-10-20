#!/usr/bin/env bash
# Un dossier de travail par agent, une branche par sujet : plus de « checkout » qui déplace les autres.
#   scripts/agent.sh new  <agent> <sujet>   crée ../potager-<agent>-<sujet> sur la branche <agent>/<sujet> (depuis origin/main)
#   scripts/agent.sh done <agent> <sujet>   supprime ce dossier (la branche reste, elle part en pull request)
#   scripts/agent.sh list                   liste les dossiers de travail
# Exemple : scripts/agent.sh new claude varietes   →   ../potager-claude-varietes, branche claude/varietes
set -euo pipefail

cmd=${1:-}
main=$(cd "$(git rev-parse --path-format=absolute --git-common-dir)/.." && pwd)

if [[ $cmd == list ]]; then git -C "$main" worktree list; exit 0; fi

agent=${2:-}; topic=${3:-}
if [[ -z $cmd || -z $agent || -z $topic ]]; then sed -n '2,7p' "$0"; exit 1; fi
if [[ ! $agent =~ ^[a-z0-9-]+$ || ! $topic =~ ^[a-z0-9-]+$ ]]; then echo "Agent et sujet : lettres minuscules, chiffres et tirets seulement." >&2; exit 1; fi

dir="$(dirname "$main")/potager-$agent-$topic"
branch="$agent/$topic"

case $cmd in
  new)
    git -C "$main" fetch -q origin
    git -C "$main" worktree add -b "$branch" "$dir" origin/main
    # Les fichiers non versionnés dont l'app a besoin pour tourner (clés publiques ; jamais de secret à publier)
    [[ -f $main/.env.local ]] && cp "$main/.env.local" "$dir/.env.local"
    ( cd "$dir" && npm ci --prefer-offline --no-audit --no-fund --silent )
    echo "Prêt : $dir (branche $branch). Travaillez là, jamais dans $main."
    ;;
  done)
    git -C "$main" worktree remove "$dir"
    echo "Dossier supprimé. La branche $branch reste : ouvrez ou fusionnez sa pull request, puis « git branch -d $branch »."
    ;;
  *) sed -n '2,7p' "$0"; exit 1 ;;
esac
