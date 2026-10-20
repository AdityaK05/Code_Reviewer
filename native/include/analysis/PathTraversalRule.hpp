#pragma once
#include "Rule.hpp"
#include <fstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class PathTraversalRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR006",
            "Potential Path Traversal",
            "File path constructed with untrusted input containing '..' or absolute path escapes.",
            "security",
            "high",
            "medium",
            "Validate and canonicalize paths; reject inputs containing '..' or absolute roots."
        };
    }

    bool supports(const std::string& language) const override {
        return true;
    }

    std::vector<Findings::Finding> analyzeFile(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) override {
        std::vector<Findings::Finding> findings;
        std::string fullPath = workspaceRoot + "/" + relativePath;
        std::ifstream file(fullPath);
        if (!file.is_open()) return findings;

        // Detect file-open calls that concatenate user input containing path separators
        std::regex pathRegex(
            R"((open|readFile|writeFile|fopen|ifstream|ofstream)\s*\(\s*[^\)]*[\+\"\'\`][^\)]*\.\.)",
            std::regex_constants::icase
        );
        auto meta = getMetadata();

        std::string line;
        int lineNumber = 1;

        while (std::getline(file, line)) {
            if (std::regex_search(line, pathRegex)) {
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