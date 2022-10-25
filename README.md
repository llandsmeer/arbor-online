# Arbor online prebuilt

Versions

 - arbor 0.7.1-dev (491a0d648b8e245d04842f5ffed5ba9e3d087d48)
 - emscripten 3.1.21
 - python 3.10.2
 - pyodide 0.22.0a1



Live version (v0.1 beta): https://llandsmeer.github.io/arbor-online/


## Build instructions

For if you want to port a new arbor version.
The build process is very version dependent, you'll probably have to adapt it to new releases.

 1) Download and unpack a [pyodide release](https://github.com/pyodide/pyodide/releases), both the `xbuildenv-*.tar.bz2` and `pyodide-*.tar.bz2` files.
 2) Find out the emscripten version, eg. by running `make -f Makefile.envs .output_vars | grep PYODIDE_EMSCRIPTEN_VERSION` in `xbuildenv-*/pyodide-root`
 3) Download the latest [emsdk release](https://emscripten.org/docs/tools_reference/emsdk.html)
 4) Install the correct (same as pyodide) emscripten version using emsdk install/activate and the new paths to you environment. If you don't do this you'll get an infinite stream of annoying type errors.
 5) Download/git clone the arbor repository
 6) Build a regular (native) modcc binary
     - `mkdir build; cd build`
     - `cmake .. -DCMAKE_INSTALL_PREFIX=$(realpath prefix) -DARB_USE_BUNDLED_LIBS=ON`
     - `make modcc`
     - `make install`
 7) Build emscripten arbor libraries (without python or neuroml support) and using the modcc previously built to generate the C++ mechanism files.
    Now currently this doesn't work because of a bug in the CMakeLists.txt, you need to manually disable building modcc and update the modcc variable to point to your previously built modcc binary there. Also there is a error in the Random123 library that you need to remove from the source code in the gcc-intrinsics file.
    We use `ARB_ARCH=generic` because the default `native`
    - `mkdir build-emscripten; cd build-emscripten`
    - `source "path/to/emsdk_env.sh"`
    - `cmake .. --toolchain path/to/the/emsdk/Emscripten.cmake -DCMAKE_INSTALL_PREFIX=$(realpath prefix) -DARB_USE_BUNDLED_LIBS=ON -DARB_MODCC=../build/prefix/bin/modcc -DARB_ARCH=generic`
    - `make -j10`
    - `make install`
 8) Build the python .so file. The standard pyodide-build method doesn't work
    - `mkdir build-empy; cd build-empy`
    - `source "path/to/emsdk_env.sh"`
    - (See em++ invocation below)
 9) Build the wheel file
    - Copy the .so to a directory name `arbor` in the pyodide dist root
    - Copy the `VERSION`, `__init__` files from a normal python arbor compilation to the `arbor` directory.
    - Make a `arbor.dist-info` directory, copy the `METADATA` file there and create a `WHEEL` file with contents as below
    - `zip -r arbor-0.7-py3-none-any.whl arbor arbor.dist-info`


em++ command to build the python .so file

```
    em++ \
        ../python/*.cpp \
        -I ../ext/pybind11/include/ \
        -I path/to/xbuildenv/pyodide-root/cpython/installs/python-3.10.2/include/python3.10/ \
        -I ../build-emscripten/prefix/include \
        -std=c++20 \
        ../build-emscripten-3.1.12/prefix/lib/libarbor* \
        -o _arbor.cpython-310-wasm32-emscripten.so \
        -shared -fPIC \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s FORCE_FILESYSTEM=1 \
        -s LINKABLE=1 \
        -s USE_SDL=0 \
        -s SIDE_MODULE=1 \
        -s MODULARIZE=1 \
        -s WASM_BIGINT=1 \
        -g0 \
        -O2
```

`WHEEL` file contents

```
Wheel-Version: 1.0
Generator: manual 1.0
Root-Is-Purelib: false
Tag: py3-none-any
```
