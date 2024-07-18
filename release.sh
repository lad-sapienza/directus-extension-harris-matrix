RELEASE_VER="release.ver"
RELEASE_CHL="release.chl"
echo "******************************************************"
echo "****** DIRECTUS HARRIS MATRIX RELEASE PROCEDURE ******"
echo "******************************************************"
echo ""

USE_JQ="Y"
if ! command -v jq &> /dev/null
then
   USE_JQ="N"
fi

if [[ "$USE_JQ" == "N" ]]; then
    echo ""
    echo "******************************************************"
    echo "**                 JQ NOT DETECTED                  **"
    echo "** jq sets the correct HMDE version on package.json **"
    echo "******************************************************"
    echo ""
    echo "- (e)xit and install jq"
    echo "- (c)ontinue: i've manually modified pacakge.json"
    echo ""
    echo "Your choice (e):"
    read USE_JQ_IPT

    if [[ "$USE_JQ_IPT" != "c" ]]; then
        echo ""
        echo "Ok then... Leaving..."
        echo ""
        exit 1
    fi
fi


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
NEXT_VERSION_NUM=""

if [[ "$RELEASE_MODE" != "J" ]]; then
    CV_DOTS="${CURRENT_VERSION:1}"
    IFS='.' read -ra CVD_SPLIT <<< "$CV_DOTS"

    if [[ "$RELEASE_MODE" == "Ma" ]]; then
        INC=$((${CVD_SPLIT[0]} + 1))
        NEXT_VERSION_NUM="$INC.0.0"
    elif [[ "$RELEASE_MODE" == "M" ]]; then
        INC=$((${CVD_SPLIT[1]} + 1))
        NEXT_VERSION_NUM="${CVD_SPLIT[0]}.$INC.0"
    else
        INC=$((${CVD_SPLIT[2]} + 1))
        NEXT_VERSION_NUM="${CVD_SPLIT[0]}.${CVD_SPLIT[1]}.$INC"
    fi
    
    NEXT_VERSION="v$NEXT_VERSION_NUM"

    > "$RELEASE_CHL"
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

fi

echo ""
echo "************************************************************************************************************"
echo "Release mode: $RELEASE_MODE"
echo "Current version: $CURRENT_VERSION"
if [[ "$RELEASE_MODE" != "J" ]]; then
    echo "Next version: $NEXT_VERSION"
    echo "Changes in this version ------------------------------------------------------------------------------------"
    echo "$CHANGE_LINES_LOG"
fi
echo "************************************************************************************************************"


if [[ "$RELEASE_MODE" == "J" ]]; then
    echo ""
    exit 0
fi

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

if [[ "$USE_JQ" != "N" ]]; then
    JQP=$(jq ".version = \"$NEXT_VERSION_NUM\"" package.json)
    echo "$JQP" > package.json
fi

echo "$NEXT_VERSION" > "$RELEASE_VER"

echo ""
echo "Committing..."
git commit -am "Versioning to $NEXT_VERSION"
echo ""
echo "Pushing to develop..."
git push origin "$CURRENT_BRANCH"

echo "Merging develop -> main..."
git checkout main
git merge develop
git push
git checkout develop

echo ""
echo "Done!"
echo ""
