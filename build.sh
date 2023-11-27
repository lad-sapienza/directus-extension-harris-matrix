folder=${1}
cd "${1}"
echo "$(pwd)"
npm run build
cd ..
echo "Zipping..."
zip -qq -r direct-harris-matrixV1.zip "${1}"
echo "DONE!"
date +"%H:%M"
