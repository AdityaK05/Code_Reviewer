#pragma once
#include "Rule.hpp"
#include <fstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class BufferOverflowRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR002",
            "Potential Buffer Overflow",
            "Use of unbounded string/memory functions that may overflow fixed-size buffers.",
            "security",
            "high",
            "medium",
            "Use bounded functions (strncpy, snprintf, std::string) and validate buffer sizes."
        };
    }

    bool supports(const std::string& language) const override {
        return language == "c" || language == "cpp" || language == "objective-c" || language == "objective-cpp";
    }

    std::vector<Findings::Finding> analyzeFile(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) override {
        std::vector<Findings::Finding> findings;
        std::string fullPath = workspaceRoot + "/" + relativePath;
        std::ifstream file(fullPath);
        if (!file.is_open()) return findings;

        // Detect unbounded copy/concat/format/scan functions
        std::regex unsafeRegex(R"(\b(strcpy|strcat|sprintf|vsprintf|gets|scanf|memcpy|std::strcpy|std::strcat)\s*\()");
        auto meta = getMetadata();

        std::string line;
        int lineNumber = 1;

        while (std::getline(file, line)) {
            if (std::regex_search(line, unsafeRegex)) {
                Findings::Finding finding;
                finding.id = meta.ruleId + "-" + relativePath + "-" + std::to_string(lineNumber);
                finding.ruleId = meta.ruleId;
                finding.title = meta.title;
                finding.description = meta.description;
                finding.severity = meta.severity;
                finding.confidence = meta.defaultConfidence;
                finding.category = meta.category;
                finding.language = language;
                finding.file = relativePath;
                finding.line = lineNumber;
                finding.evidence = {line, lineNumber, lineNumber};
                finding.recommendation = meta.recommendation;
                findings.push_back(finding);
            }
            lineNumber++;
        }
        return findings;
    }
};

} // namespace Analysis
} // namespace CodeReviewer