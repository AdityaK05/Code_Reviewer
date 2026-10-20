#include "../../include/analysis/AnalysisSession.hpp"
#include "../../include/analysis/UnsafeStringCopyRule.hpp"
#include "../../include/analysis/BufferOverflowRule.hpp"
#include "../../include/analysis/UnsafeCommandRule.hpp"
#include "../../include/analysis/SQLInjectionRule.hpp"
#include "../../include/analysis/HardcodedSecretRule.hpp"
#include "../../include/analysis/PathTraversalRule.hpp"
#include "../../include/analysis/RaceConditionRule.hpp"
#include "../../include/analysis/CryptoWeaknessRule.hpp"
#include "../../include/analysis/XSSRule.hpp"
#include "../../include/analysis/InsecureNetworkRule.hpp"
#include "../../include/analysis/DebugCodeRule.hpp"
#include <chrono>

namespace CodeReviewer {
namespace Analysis {

AnalysisSession::AnalysisSession(const std::string& id, const std::string& root) 
    : sessionId(id), workspaceRoot(root) {
}

void AnalysisSession::setupDefaultRules() {
    ruleEngine.registerRule(std::make_unique<UnsafeStringCopyRule>());
    ruleEngine.registerRule(std::make_unique<BufferOverflowRule>());
    ruleEngine.registerRule(std::make_unique<UnsafeCommandRule>());
    ruleEngine.registerRule(std::make_unique<SQLInjectionRule>());
    ruleEngine.registerRule(std::make_unique<HardcodedSecretRule>());
    ruleEngine.registerRule(std::make_unique<PathTraversalRule>());
    ruleEngine.registerRule(std::make_unique<RaceConditionRule>());
    ruleEngine.registerRule(std::make_unique<CryptoWeaknessRule>());
    ruleEngine.registerRule(std::make_unique<XSSRule>());
    ruleEngine.registerRule(std::make_unique<InsecureNetworkRule>());
    ruleEngine.registerRule(std::make_unique<DebugCodeRule>());
}

AnalysisResult AnalysisSession::run(const nlohmann::json& manifest) {
    AnalysisResult result;
    result.sessionId = sessionId;
    result.status = "running";
    auto start = std::chrono::steady_clock::now();

    if (manifest.contains("files") && manifest["files"].is_array()) {
        for (const auto& fileMeta : manifest["files"]) {
            std::string type = fileMeta.value("type", "unknown");
            if (type != "source") {
                result.skippedFiles++;
                continue;
            }

            std::string relPath = fileMeta.value("relativePath", "");
            std::string lang = fileMeta.value("language", "");
            
            // Limit files sizes or skip paths containing ".."
            if (relPath.find("..") != std::string::npos) {
                result.skippedFiles++;
                continue;
            }

            auto findings = ruleEngine.analyze(workspaceRoot, relPath, lang);
            result.findings.insert(result.findings.end(), findings.begin(), findings.end());
            result.analyzedFiles++;
        }
    }

    auto end = std::chrono::steady_clock::now();
    result.durationMs = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
    result.status = "completed";

    return result;
}

} // namespace Analysis
} // namespace CodeReviewer
