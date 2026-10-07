#pragma once
#include <string>
#include <vector>
#include <memory>
#include "../findings/Finding.hpp"

namespace CodeReviewer {
namespace Analysis {

struct RuleMetadata {
    std::string ruleId;
    std::string title;
    std::string description;
    std::string category;
    std::string severity;
    std::string defaultConfidence;
    std::string recommendation;
};

class IRule {
public:
    virtual ~IRule() = default;
    virtual RuleMetadata getMetadata() const = 0;
    virtual bool supports(const std::string& language) const = 0;
    virtual std::vector<Findings::Finding> analyzeFile(const std::string& workspaceRoot, const std::string& relativePath, const std::string& language) = 0;
};

} // namespace Analysis
} // namespace CodeReviewer
