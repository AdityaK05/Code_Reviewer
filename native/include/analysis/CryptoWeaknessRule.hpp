#pragma once
#include "Rule.hpp"
#include <fstream>
#include <regex>

namespace CodeReviewer {
namespace Analysis {

class CryptoWeaknessRule : public IRule {
public:
    RuleMetadata getMetadata() const override {
        return {
            "CR008",
            "Weak Cryptography",
            "Use of deprecated or broken cryptographic algorithms and insecure random generation.",
            "security",
            "medium",
            "medium",
            "Use modern algorithms (AES-256-GCM, SHA-256+) and cryptographically secure RNG."
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

        // Detect weak hashes, ciphers, and insecure RNG
        std::regex weakRegex(
            R"(\b(md5|sha1|des|rc4|rc2|seed|rand\(\)|random\.random|Math\.random)\b)",
            std::regex_constants::icase
        );
        auto meta = getMetadata();

        std::string line;
        int lineNumber = 1;

        while (std::getline(file, line)) {
            if (std::regex_search(line, weakRegex)) {
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