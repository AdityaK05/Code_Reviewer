#pragma once
#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "RuleEngine.hpp"

namespace CodeReviewer {
namespace Analysis {

struct AnalysisResult {
    std::string sessionId;
    std::string status;
    std::string startedAt;
    std::string completedAt;
    int durationMs = 0;
    int analyzedFiles = 0;
    int skippedFiles = 0;
    std::vector<Findings::Finding> findings;
};

inline void to_json(nlohmann::json& j, const AnalysisResult& r) {
    j = nlohmann::json{
        {"sessionId", r.sessionId},
        {"status", r.status},
        {"startedAt", r.startedAt},
        {"completedAt", r.completedAt},
        {"durationMs", r.durationMs},
        {"analyzedFiles", r.analyzedFiles},
        {"skippedFiles", r.skippedFiles},
        {"findings", r.findings}
    };
}

class AnalysisSession {
private:
    std::string sessionId;
    std::string workspaceRoot;
    RuleEngine ruleEngine;
    
public:
    AnalysisSession(const std::string& id, const std::string& root);
    void setupDefaultRules();
    AnalysisResult run(const nlohmann::json& manifest);
};

} // namespace Analysis
} // namespace CodeReviewer
