set -e

cd /home/llandsmeer/repos/llandsmeer/arbor-online/catalogue

EMSDK_HOME=/home/llandsmeer/build/emsdk-3.1.21
source "${EMSDK_HOME}/emsdk_env.sh"

MODCC=/home/llandsmeer/repos/llandsmeer/arbor/build-master-simple/prefix/bin/modcc
ARB_INCLUDE=/home/llandsmeer/repos/llandsmeer/arbor/build-emscripten/prefix/include
ARB_INCLUDE=/home/llandsmeer/repos/llandsmeer/arbor/build-emscripten/prefix/include

CATS=io

for CATNAME in ${CATS}
do

    TMP=/tmp/${CATNAME}.build
    GEN="${TMP}/generated"

    echo $TMP


    rm -fr "$TMP"
    mkdir "$TMP"
    mkdir "$GEN"

    ${MODCC} -N arb -c "${CATNAME}" -o "${GEN}" -t cpu "${CATNAME}"/*.mod

    em++ "${GEN}"/*.cpp \
        -I "${ARB_INCLUDE}" \
        -std=c++20 \
        -o "${CATNAME}-catalogue.so" \
        -shared -fPIC \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s LINKABLE=1 \
        -s USE_SDL=0 \
        -s SIDE_MODULE=1 \
        -s MODULARIZE=1 \
        -s WASM_BIGINT=1 \
        -DSTANDALONE=1 \
        -g0 \
        -O2

    rm -fr "$TMP"
done
