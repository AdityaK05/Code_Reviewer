#pragma once
#include <string>
#include <nlohmann/json.hpp>

namespace CodeReviewer {
namespace Findings {

struct FindingEvidence {
    std::string snippet;
    int startLine = 0;
    int endLine = 0;
};

struct Finding {
    std::string id;
    std::string ruleId;
    std::string title;
    std::string description;
    std::string severity; // critical, high, medium, low, info
    std::string confidence; // high, medium, low
    std::string category;
    std::string language;
    std::string file;
    int line = 0;
    int column = 0;
    FindingEvidence evidence;
    std::string recommendation;
    std::string status = "open";
};

inline void to_json(nlohmann::json& j, const FindingEvidence& e) {
    j = nlohmann::json{{"snippet", e.snippet}, {"startLine", e.startLine}, {"endLine", e.endLine}};
}

inline void to_json(nlohmann::json& j, const Finding& f) {
    j = nlohmann::json{
        {"id", f.id},
        {"ruleId", f.ruleId},
        {"title", f.title},
        {"description", f.description},
        {"severity", f.severity},
        {"confidence", f.confidence},
        {"category", f.category},
        {"language", f.language},
        {"file", f.file},
        {"line", f.line},
        {"column", f.column},
        {"evidence", f.evidence},
        {"recommendation", f.recommendation},
        {"status", f.status}
    };
}

} // namespace Findings
} // namespace CodeReviewer
