cmake_minimum_required(VERSION 3.20)
project(CodeReviewerEngine VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Set vcpkg toolchain if not provided by environment
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    set(CMAKE_TOOLCHAIN_FILE "D:/DevTools/vcpkg/scripts/buildsystems/vcpkg.cmake" CACHE STRING "Vcpkg toolchain file")
endif()

find_package(nlohmann_json CONFIG REQUIRED)
find_package(GTest CONFIG REQUIRED)

# Engine Core
add_executable(CodeReviewerEngine
    src/core/main.cpp
    src/analysis/RuleEngine.cpp
    src/analysis/AnalysisSession.cpp
)

target_link_libraries(CodeReviewerEngine PRIVATE nlohmann_json::nlohmann_json)

# Tests
enable_testing()

add_executable(CodeReviewerEngineTests
    tests/engine_tests.cpp
    src/analysis/RuleEngine.cpp
    src/analysis/AnalysisSession.cpp
)
target_link_libraries(CodeReviewerEngineTests PRIVATE GTest::gtest GTest::gtest_main nlohmann_json::nlohmann_json)
add_test(NAME CodeReviewerEngineTests COMMAND CodeReviewerEngineTests)
