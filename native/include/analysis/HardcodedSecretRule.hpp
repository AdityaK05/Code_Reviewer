#pragma once
#include "Rule.hpp"
#include <fstream>
#include <sstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class HardcodedSecretRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR005",
            "Hardcoded Secret",
            "Potential hardcoded password or secret detected.",
            "security",
            "high",
            "medium",
            "Use environment variables or a secret management system."
        };
    }

    bool supports(const std::string& language) const override {
        return true; // Supports all languages
    }

    std::vector<Findings::Finding> analyzeFile(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) override {
        std::vector<Findings::Finding> findings;
        std::string fullPath = workspaceRoot + "/" + relativePath; 
        std::ifstream file(fullPath);
        
        auto meta = getMetadata();

        if (!file.is_open()) {
            return findings;
        }

        std::string line;
        int lineNumber = 1;
        std::regex secretRegex(R"((password|passwd|secret|api_?key|access_?token|auth_?token|private_?key)\s*[:=]\s*['"][^'"]{4,}['"])", std::regex_constants::icase);

        while (std::getline(file, line)) {
            if (std::regex_search(line, secretRegex)) {
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
