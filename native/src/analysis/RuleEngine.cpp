#include "../../include/analysis/RuleEngine.hpp"

namespace CodeReviewer {
namespace Analysis {

RuleEngine::RuleEngine() {
}

void RuleEngine::registerRule(std::unique_ptr<IRule> rule) {
    rules.push_back(std::move(rule));
}

std::vector<Findings::Finding> RuleEngine::analyze(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) {
    std::vector<Findings::Finding> results;
    for (const auto& rule : rules) {
        if (rule->supports(language)) {
            auto findings = rule->analyzeFile(workspaceRoot, relativePath, language);
            results.insert(results.end(), findings.begin(), findings.end());
        }
    }
    return results;
}

} // namespace Analysis
} // namespace CodeReviewer
