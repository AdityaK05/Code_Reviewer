#pragma once
#include "Rule.hpp"
#include <fstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class RaceConditionRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR007",
            "Potential Race Condition (TOCTOU)",
            "Check-then-act pattern where state can change between check and use.",
            "security",
            "medium",
            "low",
            "Use atomic operations, locks, or combine check+action into a single atomic call."
        };
    }

    bool supports(const std::string& language) const override {
        return language == "c" || language == "cpp" || language == "javascript" ||
               language == "typescript" || language == "python" || language == "java" ||
               language == "go" || language == "csharp";
    }

    std::vector<Findings::Finding> analyzeFile(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) override {
        std::vector<Findings::Finding> findings;
        std::string fullPath = workspaceRoot + "/" + relativePath;
        std::ifstream file(fullPath);
        if (!file.is_open()) return findings;

        // Detect exists/access checks immediately followed by open/use
        std::regex tocTouRegex(
            R"((exists|access|stat|try|stat)\s*\([^)]*\)\s*[^\n]*\n\s*(open|fopen|readFile|writeFile|create))",
            std::regex_constants::icase
        );
        auto meta = getMetadata();

        std::string line;
        int lineNumber = 1;

        while (std::getline(file, line)) {
            if (std::regex_search(line, tocTouRegex)) {
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