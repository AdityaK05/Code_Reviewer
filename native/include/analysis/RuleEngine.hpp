#pragma once
#include <vector>
#include <memory>
#include "Rule.hpp"

namespace CodeReviewer {
namespace Analysis {

class RuleEngine {
private:
    std::vector<std::unique_ptr<IRule>> rules;

public:
    RuleEngine();
    void registerRule(std::unique_ptr<IRule> rule);
    std::vector<Findings::Finding> analyze(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language);
};

} // namespace Analysis
} // namespace CodeReviewer
