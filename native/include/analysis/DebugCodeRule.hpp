#pragma once
#include "Rule.hpp"
#include <fstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class DebugCodeRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR011",
            "Debug or Test Code Left in Production",
            "Debug statements, print/logging calls, or test scaffolding that should not ship.",
            "quality",
            "low",
            "medium",
            "Remove debug prints, test stubs, and TODO/FIXME markers before shipping."
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

        // Detect debug prints, TODO/FIXME, and debugger statements
        std::regex debugRegex(
            R"(\b(console\.log|console\.debug|print\(|printf\(|cout\s*<<|debugger|TODO|FIXME|HACK|XXX)\b)",
            std::regex_constants::icase
        );
        auto meta = getMetadata();

        std::string line;
        int lineNumber = 1;

        while (std::getline(file, line)) {
            if (std::regex_search(line, debugRegex)) {
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