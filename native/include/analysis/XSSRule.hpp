#pragma once
#include "Rule.hpp"
#include <fstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class XSSRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR009",
            "Potential Cross-Site Scripting (XSS)",
            "Untrusted data rendered into HTML without proper escaping or sanitization.",
            "security",
            "high",
            "medium",
            "Use framework auto-escaping, Content-Security-Policy, and explicit sanitization."
        };
    }

    bool supports(const std::string& language) const override {
        return language == "javascript" || language == "typescript" || language == "html" ||
               language == "php" || language == "asp" || language == "java" || language == "csharp";
    }

    std::vector<Findings::Finding> analyzeFile(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) override {
        std::vector<Findings::Finding> findings;
        std::string fullPath = workspaceRoot + "/" + relativePath;
        std::ifstream file(fullPath);
        if (!file.is_open()) return findings;

        // Detect unsafe DOM sinks
        std::regex xssRegex(
            R"((innerHTML|outerHTML|document\.write|dangerouslySetInnerHTML|eval\(.*\(.*\))\s*=)",
            std::regex_constants::icase
        );
        auto meta = getMetadata();

        std::string line;
        int lineNumber = 1;

        while (std::getline(file, line)) {
            if (std::regex_search(line, xssRegex)) {
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