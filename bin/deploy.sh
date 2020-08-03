git worktree add gh-pages || true
npm run build
rimraf gh-pages/**/*.{js,css,html,png}
cp -r dist/* gh-pages
pushd gh-pages
git add .
git commit -am "Rebuild website" --no-verify
git push -f origin gh-pages
popd
