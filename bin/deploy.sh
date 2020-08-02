git checkout -B gh-pages
git add -f dist
git commit -am "Rebuild website" --no-verify
git filter-branch -f --prune-empty --subdirectory-filter dist
git push -f origin gh-pages
git checkout -
