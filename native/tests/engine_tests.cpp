#include <gtest/gtest.h>
#include <nlohmann/json.hpp>
#include <string>
#include <fstream>
#include "../include/analysis/AnalysisSession.hpp"

using json = nlohmann::json;

TEST(EngineTests, ParseValidHealthRequest) {
    std::string input = R"({"requestId":"123", "operation":"health"})";
    json req = json::parse(input);
    EXPECT_EQ(req["requestId"], "123");
    EXPECT_EQ(req["operation"], "health");
}

TEST(EngineTests, ParseInvalidJson) {
    std::string input = R"({invalid json)";
    EXPECT_THROW(json::parse(input), json::parse_error);
}

TEST(AnalysisTests, RuleEngineUnsafeCopy) {
    std::string testFile = "unsafe.cpp";
    std::ofstream out(testFile);
    out << "void test() {\n";
    out << "  char buf[10];\n";
    out << "  strcpy(buf, \"abc\");\n";
    out << "}\n";
    out.close();

    CodeReviewer::Analysis::AnalysisSession session("session-1", ".");
    session.setupDefaultRules();
    
    json manifest = {
        {"files", {
            {{"relativePath", "unsafe.cpp"}, {"language", "cpp"}, {"type", "source"}}
        }}
    };

    auto result = session.run(manifest);
    EXPECT_EQ(result.analyzedFiles, 1);
    ASSERT_EQ(result.findings.size(), 1);
    EXPECT_EQ(result.findings[0].ruleId, "CR001");
    EXPECT_EQ(result.findings[0].line, 3);
    
    std::remove(testFile.c_str());
}

TEST(AnalysisTests, RuleEngineSystemCommand) {
    std::string testFile = "unsafe_cmd.cpp";
    std::ofstream out(testFile);
    out << "void test() {\n";
    out << "  system(\"rm -rf /\");\n";
    out << "}\n";
    out.close();

    CodeReviewer::Analysis::AnalysisSession session("session-2", ".");
    session.setupDefaultRules();
    
    json manifest = {
        {"files", {
            {{"relativePath", "unsafe_cmd.cpp"}, {"language", "cpp"}, {"type", "source"}}
        }}
    };

    auto result = session.run(manifest);
    EXPECT_EQ(result.analyzedFiles, 1);
    ASSERT_EQ(result.findings.size(), 1);
    EXPECT_EQ(result.findings[0].ruleId, "CR004");
    EXPECT_EQ(result.findings[0].line, 2);
    
    std::remove(testFile.c_str());
}
