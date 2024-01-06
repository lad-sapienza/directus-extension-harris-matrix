RELEASE_VER="release.ver"
RELEASE_CHL="release.cjl"
echo "******************************************************"
echo "****** DIRECTUS HARRIS MATRIX RELEASE PROCEDURE ******"
echo "******************************************************"
echo ""
SCRIPT_PATH="$(dirname "$0")"
cd "$SCRIPT_PATH"

CURRENT_PATH=$(pwd)
echo "Working path: $CURRENT_PATH"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Working branch: $CURRENT_BRANCH"
if [[ "$CURRENT_BRANCH" != "develop" ]]; then
    echo ""
    echo "This procedure is meant to run on develop branch only! Exiting..."
    echo ""
    exit 1
fi
echo ""

RELEASE_MODE="m"
echo "Release type [(Ma)jor, (M)id, [m]inor, (J)ust read the version file] ($RELEASE_MODE):"
read RELEASE_MODE_IPT

if [[ "$RELEASE_MODE_IPT" == "" ]]; then
    echo "Using default release mode: $RELEASE_MODE"
elif [ "$RELEASE_MODE_IPT" == "Ma" ] || [ "$RELEASE_MODE_IPT" == "M" ] || [ "$RELEASE_MODE_IPT" == "m" ] || [ "$RELEASE_MODE_IPT" == "J" ]; then
    RELEASE_MODE="$RELEASE_MODE_IPT"
else
    echo ""
    echo "Unrecognized release mode... Leaving..."
    echo ""
    exit 1
fi

CURRENT_VERSION=$(<"$RELEASE_VER")
NEXT_VERSION="$CURRENT_VERSION"

if [[ "$RELEASE_MODE" != "J" ]]; then
    CV_DOTS="${CURRENT_VERSION:1}"
    IFS='.' read -ra CVD_SPLIT <<< "$CV_DOTS"

    if [[ "$RELEASE_MODE" == "Ma" ]]; then
        INC=$((${CVD_SPLIT[0]} + 1))
        NEXT_VERSION="v$INC.0.0"
    elif [[ "$RELEASE_MODE" == "M" ]]; then
        INC=$((${CVD_SPLIT[1]} + 1))
        NEXT_VERSION="v${CVD_SPLIT[0]}.$INC.0"
    else
        INC=$((${CVD_SPLIT[2]} + 1))
        NEXT_VERSION="v${CVD_SPLIT[0]}.${CVD_SPLIT[1]}.$INC"
    fi
fi

echo "$NEXT_VERSION" > "$RELEASE_VER"

echo "" > "$RELEASE_CHL"
CHANGE_LINES_LOG=""
echo ""
echo "Insert release changes (input blank to end)"
while true
do
    read CHANGE_LINE
    if [[ "$CHANGE_LINE" == "" ]]; then
        break
    fi
    echo "- $CHANGE_LINE" >> "$RELEASE_CHL"
    echo "-----------------------------------------------------------------------------------------------------"
    CHANGE_LINES_LOG="$CHANGE_LINES_LOG\n* $CHANGE_LINE\n"
done

echo "Versioning time: $(date +"%H:%M")" >> "$RELEASE_CHL"


echo ""
echo "************************************************************************************************************"
echo "Release mode: $RELEASE_MODE"
echo "Current version: $CURRENT_VERSION"
echo "Next version: $NEXT_VERSION"
echo "Changes in this version ------------------------------------------------------------------------------------"
echo "$CHANGE_LINES_LOG"
echo "************************************************************************************************************"

CONTINUE_CMD="y"
echo ""
echo "Continue? [Y/n]"
read CONTINUE

if [[ "$CONTINUE" != "" ]]; then
    CONTINUE_CMD="$CONTINUE"
fi


if [ "$CONTINUE_CMD" != "y" ] && [ "$CONTINUE_CMD" != "Y" ]; then
    echo "$CURRENT_VERSION" > "$RELEASE_VER"
    echo "" > "$RELEASE_CHL"
    echo ""
    echo "Ok, bye bye..."
    echo ""
    exit 0
fi

echo ""
echo "Committing..."
git commit -am "Versioning to $NEXT_VERSION"
echo ""
echo "Pushing to develop..."
git push origin "$CURRENT_BRANCH"

echo ""
echo "Done!"
echo ""
