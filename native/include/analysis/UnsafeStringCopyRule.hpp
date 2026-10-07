#pragma once
#include "Rule.hpp"
#include <fstream>
#include <sstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class UnsafeStringCopyRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR001",
            "Unsafe string copy",
            "Use of unsafe string copy function strcpy.",
            "security",
            "high",
            "medium",
            "Use strncpy or safer bounded string copy functions."
        };
    }

    bool supports(const std::string& language) const override {
        return language == "c" || language == "cpp" || language == "objective-c" || language == "objective-cpp";
    }

    std::vector<Findings::Finding> analyzeFile(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) override {
        std::vector<Findings::Finding> findings;
        std::string fullPath = workspaceRoot + "/" + relativePath; // Assume normalized paths
        std::ifstream file(fullPath);
        if (!file.is_open()) return findings;

        std::string line;
        int lineNumber = 1;
        std::regex strcpyRegex("\\bstrcpy\\s*\\(");
        auto meta = getMetadata();

        while (std::getline(file, line)) {
            if (std::regex_search(line, strcpyRegex)) {
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
