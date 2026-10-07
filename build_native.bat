@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set "CMAKE_CMD=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"

"%CMAKE_CMD%" -B native/build -S native -DCMAKE_TOOLCHAIN_FILE=D:/DevTools/vcpkg/scripts/buildsystems/vcpkg.cmake
"%CMAKE_CMD%" --build native/build --config Debug
