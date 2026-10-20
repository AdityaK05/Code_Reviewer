#pragma once
#include "Rule.hpp"
#include <fstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class SQLInjectionRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR003",
            "Potential SQL Injection",
            "SQL query constructed with string concatenation or interpolation of untrusted input.",
            "security",
            "critical",
            "high",
            "Use parameterized queries / prepared statements exclusively."
        };
    }

    bool supports(const std::string& language) const override {
        return language == "javascript" || language == "typescript" || language == "python" ||
               language == "php" || language == "java" || language == "csharp" ||
               language == "go" || language == "ruby" || language == "shell";
    }

    std::vector<Findings::Finding> analyzeFile(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) override {
        std::vector<Findings::Finding> findings;
        std::string fullPath = workspaceRoot + "/" + relativePath;
        std::ifstream file(fullPath);
        if (!file.is_open()) return findings;

        // Detect SQL keywords combined with string concatenation or interpolation
        std::regex sqlRegex(
            R"((query|execute|exec|raw|fetch|SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s*\(\s*['\"`])",
            std::regex_constants::icase
        );
        auto meta = getMetadata();

        std::string line;
        int lineNumber = 1;

        while (std::getline(file, line)) {
            if (std::regex_search(line, sqlRegex)) {
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