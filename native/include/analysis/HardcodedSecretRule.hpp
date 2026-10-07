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
            Findings::Finding errFinding;
            errFinding.id = "ERR-OPEN-" + relativePath;
            errFinding.ruleId = "DEBUG001";
            errFinding.title = "Failed to open file for analysis";
            errFinding.description = "The C++ engine could not open the file at path: " + fullPath;
            errFinding.severity = "high";
            errFinding.confidence = "high";
            errFinding.category = "system";
            errFinding.language = language;
            errFinding.file = relativePath;
            errFinding.line = 1;
            errFinding.evidence = {fullPath, 1, 1};
            errFinding.recommendation = "Check path resolving in C++.";
            findings.push_back(errFinding);
            return findings;
        }

        std::string line;
        int lineNumber = 1;
        std::regex secretRegex("(password|secret|api_?key)\\s*=\\s*['\"][^'\"]+['\"]", std::regex_constants::icase);

        // Add a dummy finding just to prove the pipeline works and the file was read!
        Findings::Finding dummyFinding;
        dummyFinding.id = "DUMMY-" + relativePath;
        dummyFinding.ruleId = "CR-DUMMY";
        dummyFinding.title = "Pipeline Diagnostic Success";
        dummyFinding.description = "The C++ engine successfully opened and analyzed this file: " + fullPath;
        dummyFinding.severity = "info";
        dummyFinding.confidence = "high";
        dummyFinding.category = "diagnostic";
        dummyFinding.language = language;
        dummyFinding.file = relativePath;
        dummyFinding.line = 1;
        dummyFinding.evidence = {"Diagnostic", 1, 1};
        dummyFinding.recommendation = "You can safely ignore this.";
        findings.push_back(dummyFinding);

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
