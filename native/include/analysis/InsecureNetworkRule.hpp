#pragma once
#include "Rule.hpp"
#include <fstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class InsecureNetworkRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR010",
            "Insecure Network Communication",
            "Use of plain HTTP, disabled TLS verification, or hardcoded network endpoints.",
            "security",
            "medium",
            "medium",
            "Enforce HTTPS, enable certificate pinning, and never disable TLS verification."
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

        // Detect plain HTTP URLs and SSL verification disable
        std::regex insecureRegex(
            R"(https?://(?!localhost|127\.0\.0\.1)[a-zA-Z0-9.-]+)",
            std::regex_constants::icase
        );
        std::regex sslDisableRegex(
            R"(verify\s*=\s*(false|0)|rejectUnauthorized\s*=\s*(false|0)|SSL_verify\s*=\s*(false|0))",
            std::regex_constants::icase
        );
        auto meta = getMetadata();

        std::string line;
        int lineNumber = 1;

        while (std::getline(file, line)) {
            bool matched = false;
            if (std::regex_search(line, insecureRegex) || std::regex_search(line, sslDisableRegex)) {
                matched = true;
            }
            if (matched) {
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